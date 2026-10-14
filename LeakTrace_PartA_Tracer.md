# Part A: Tracer (FastAPI + Postgres)

**Owner:** Agent A  **Folder:** `tracer/`  **Read first:** `LeakTrace_CONTRACT.md`

**Reference docs:** `LeakTrace_PartA_Architecture.md` (structure) and `LeakTrace_PartA_Design.md` (decisions and algorithms).

## Your job

Build and deploy the tracer: it receives events, builds the tamper-evident hash chain in Postgres, verifies it, registers canary tokens, and investigates leaks. You do not need the ERP or the dashboard to finish. You must follow the endpoint shapes, headers, names, and error codes in the contract exactly, because Agent B is building against them in parallel.

## Deliverables

1. `tracer/schema.sql`
2. `tracer/app.py`
3. `tracer/requirements.txt` (only dependency manifest)
4. `tracer/smoke.sh` (the test script below)
5. A deployed Vercel project (Root Directory `tracer`) with env vars set
6. Handoff note to Agent B: the tracer URL and the three keys

## Environment variables (tracer only)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string with `sslmode=require` |
| `INGEST_KEY` | Must equal the ERP's value |
| `READ_KEY` | Dashboard viewer key |
| `DASHBOARD_ORIGIN` | Exact dashboard origin, no trailing slash |

## 1. Database

Add a Postgres database from the Vercel Marketplace (for example Neon) and connect it to the **tracer project only**. Use the **pooled** connection string (host contains `-pooler`) with `sslmode=require`. The integration may name the variable `POSTGRES_URL` or `DATABASE_URL`; the code reads `DATABASE_URL`, so add that name if needed.

Run `tracer/schema.sql` once in the database's SQL editor.

```sql
create table if not exists events (
  seq        bigint primary key,
  event_id   uuid unique not null,
  ts         bigint not null,
  actor      text not null,
  action     text not null,
  target     text not null,
  data_id    text,
  status     int not null default 200,
  prev_hash  text not null,
  hash       text not null
);

create table if not exists chain_head (
  id   int primary key,
  seq  bigint not null,
  hash text not null
);

-- sha256('genesis')
insert into chain_head (id, seq, hash)
values (1, 0, 'aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e')
on conflict (id) do nothing;

create table if not exists canaries (
  token   text primary key,
  service text not null
);
```

> The seeded value is `sha256('genesis')` and must equal `GENESIS` in `app.py`. If you change one, change the other, or `/verify` will report a break at the first event. You can recheck it with `python -c "import hashlib;print(hashlib.sha256(b'genesis').hexdigest())"`.

## 2. Tracer (FastAPI)

### `tracer/requirements.txt`

```
fastapi
psycopg[binary]
networkx
pydantic
```

Keep this as the only dependency manifest (do not also add a `pyproject.toml` without a lockfile, which can conflict on Vercel). After the first successful deploy, pin versions with `pip freeze`.

### `tracer/app.py`

```python
import os, json, hashlib, hmac, math
import psycopg
from psycopg.rows import dict_row
import networkx as nx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DSN = os.environ["DATABASE_URL"]
INGEST_KEY = os.environ["INGEST_KEY"]
READ_KEY = os.environ["READ_KEY"]
ORIGIN = os.environ["DASHBOARD_ORIGIN"]          # e.g. https://leaktrace-dashboard.vercel.app (no trailing slash)
GENESIS = hashlib.sha256(b"genesis").hexdigest()

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=[ORIGIN],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "x-read-key", "x-ingest-key"],
)

def db():
    return psycopg.connect(DSN, row_factory=dict_row)

def require(got: str, want: str):
    if not hmac.compare_digest(got.encode(), want.encode()):
        raise HTTPException(401, "bad key")

FIELDS = ("seq", "event_id", "ts", "actor", "action", "target", "data_id", "status")

def digest(row: dict, prev: str) -> str:
    body = json.dumps({k: row[k] for k in FIELDS}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256((body + prev).encode()).hexdigest()

class Ev(BaseModel):
    event_id: str
    ts: int
    actor: str
    action: str
    target: str
    data_id: str | None = None
    status: int = 200

class Batch(BaseModel):
    events: list[Ev]

class Canary(BaseModel):
    token: str
    service: str

class Canaries(BaseModel):
    canaries: list[Canary]

class Inv(BaseModel):
    data_id: str
    exposure: str = "public_bucket"
    leak_time: int | None = None
    leaked_text: str | None = None
    tau: float = 600

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/health/db")
def health_db(x_read_key: str = Header(default="")):
    require(x_read_key, READ_KEY)
    with db() as c:
        c.execute("select 1")
    return {"db": "ok"}

@app.post("/events")
def ingest(b: Batch, x_ingest_key: str = Header(default="")):
    require(x_ingest_key, INGEST_KEY)
    added = 0
    with db() as c:                                    # one transaction; commits on exit
        head = c.execute("select seq, hash from chain_head where id=1 for update").fetchone()
        seq, prev = head["seq"], head["hash"]
        for e in b.events:
            if c.execute("select 1 from events where event_id=%s", (e.event_id,)).fetchone():
                continue                               # retry of an event already stored
            seq += 1
            row = {"seq": seq, **e.model_dump()}
            h = digest(row, prev)
            c.execute(
                "insert into events (seq,event_id,ts,actor,action,target,data_id,status,prev_hash,hash) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (seq, e.event_id, e.ts, e.actor, e.action, e.target, e.data_id, e.status, prev, h))
            prev, added = h, added + 1
        c.execute("update chain_head set seq=%s, hash=%s where id=1", (seq, prev))
    return {"ok": True, "added": added}

@app.post("/canaries")
def register(b: Canaries, x_ingest_key: str = Header(default="")):
    require(x_ingest_key, INGEST_KEY)
    with db() as c:
        for k in b.canaries:
            c.execute("insert into canaries (token, service) values (%s,%s) "
                      "on conflict (token) do update set service=excluded.service", (k.token, k.service))
    return {"ok": True}

def load():
    with db() as c:
        rows = c.execute("select * from events order by seq").fetchall()
        head = c.execute("select seq from chain_head where id=1").fetchone()
        canaries = c.execute("select token, service from canaries").fetchall()
    return rows, head["seq"], canaries

def check_chain(rows, head_seq):
    gaps, edited, expected, prev, last = [], set(), 1, GENESIS, None
    for r in rows:
        if r["seq"] != expected:
            gaps.append({"after": expected - 1, "missing": r["seq"] - expected,
                         "between": [last["target"] if last else None, r["actor"]]})
        elif r["prev_hash"] != prev:
            edited.add(r["seq"])
        if digest(r, r["prev_hash"]) != r["hash"]:
            edited.add(r["seq"])
        prev, expected, last = r["hash"], r["seq"] + 1, r
    if head_seq >= expected:                           # tail deleted
        gaps.append({"after": expected - 1, "missing": head_seq - expected + 1,
                     "between": [last["target"] if last else None, None], "tail": True})
    return gaps, sorted(edited)

@app.get("/verify")
def verify(x_read_key: str = Header(default="")):
    require(x_read_key, READ_KEY)
    rows, head_seq, _ = load()
    gaps, edited = check_chain(rows, head_seq)
    return {"events": len(rows), "head_seq": head_seq, "gaps": gaps, "edited_seqs": edited}

@app.post("/investigate")
def investigate(q: Inv, x_read_key: str = Header(default="")):
    require(x_read_key, READ_KEY)
    rows, head_seq, canaries = load()
    gaps, edited = check_chain(rows, head_seq)
    ev = [r for r in rows if r["data_id"] == q.data_id]
    if not ev:
        raise HTTPException(404, "no events for this data_id")

    hits = [r["ts"] for r in ev if r["target"] == q.exposure]
    leak_t = max(hits) if hits else q.leak_time
    if leak_t is None:
        raise HTTPException(400, "exposure event not logged; supply leak_time")

    G = nx.DiGraph()
    for r in ev:
        G.add_edge(r["actor"], r["target"], weight=1.0, inferred=False)
    for g in gaps:                                     # inferred edges across log gaps
        a, b = g["between"]
        if a and b and a != b and a in G and b in G and not G.has_edge(a, b):
            G.add_edge(a, b, weight=0.5, inferred=True)

    last = {}
    for r in ev:
        for n in (r["actor"], r["target"]):
            last[n] = max(last.get(n, 0), r["ts"])
    if q.exposure not in G:                            # final hop missing: weak guess from every handler
        for n in list(G.nodes):
            G.add_edge(n, q.exposure, weight=0.25, inferred=True)

    best = {}
    for n in G.nodes:
        if n == q.exposure or n not in last:
            best[n] = (0.0, [])
            continue
        top = (0.0, [])
        for p in nx.all_simple_paths(G, n, q.exposure, cutoff=6):
            w = math.prod(G[a][b]["weight"] for a, b in zip(p, p[1:])) * 0.8 ** (len(p) - 2)
            if w > top[0]:
                top = (w, p)
        decay = math.exp(-max(0, leak_t - last[n]) / q.tau)
        best[n] = (top[0] * decay, top[1])

    canary = None
    if q.leaked_text:
        for k in canaries:
            if k["token"] in q.leaked_text:
                canary = {"token": k["token"], "owner": k["service"]}
                break
    if canary and canary["owner"] in best:
        s, p = best[canary["owner"]]
        best[canary["owner"]] = (s * 5, p)

    total = sum(s for s, _ in best.values()) or 1.0
    suspects = []
    for n, (s, p) in sorted(best.items(), key=lambda kv: kv[1][0], reverse=True):
        if s <= 0:
            continue
        inferred = any(G[a][b]["inferred"] for a, b in zip(p, p[1:]))
        why = (f"Handled {q.data_id} {max(0, leak_t - last[n])}s before the leak; "
               f"{len(p) - 1} hop(s) to {q.exposure}" + (" via an inferred edge" if inferred else "")
               + ("; leaked copy carries its canary token" if canary and canary["owner"] == n else "") + ".")
        suspects.append({"id": n, "p": round(s / total, 4), "why": why})

    return {
        "case": f"{q.data_id} found at {q.exposure}",
        "leak": q.exposure,
        "chain": {"events": len(rows), "gaps": gaps, "edited_seqs": edited},
        "canary": canary,
        "nodes": [{"id": n} for n in G.nodes],
        "edges": [{"s": a, "t": b, "inferred": d["inferred"]} for a, b, d in G.edges(data=True)],
        "suspects": suspects,
    }
```

Vercel detects a FastAPI instance named `app` in `app.py` at the project root, so no `vercel.json` is needed.

## 3. Local run and smoke test

```bash
cd tracer
pip install -r requirements.txt uvicorn
export DATABASE_URL=... INGEST_KEY=ik READ_KEY=rk DASHBOARD_ORIGIN=http://localhost:5173
uvicorn app:app --port 8000
```

Use a separate Postgres database (or Neon branch) for local testing, and run `schema.sql` on it first.

### `tracer/smoke.sh`

This imitates the ERP's export-then-leak flow without needing the ERP.

```bash
#!/usr/bin/env bash
set -e
T=${TRACER:-http://localhost:8000}; IK=${IK:-ik}; RK=${RK:-rk}
J='content-type: application/json'
now=$(date +%s)
uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }

echo "-- health";       curl -s $T/health
echo; echo "-- db";     curl -s -H "x-read-key: $RK" $T/health/db
echo; echo "-- bad key"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $T/events -H "$J" -d '{"events":[]}'

echo "-- register canary"
curl -s -X POST $T/canaries -H "$J" -H "x-ingest-key: $IK" \
  -d '{"canaries":[{"token":"tok_ab12cd","service":"svc_export"}]}'

echo; echo "-- ingest export+leak flow"
curl -s -X POST $T/events -H "$J" -H "x-ingest-key: $IK" -d "{\"events\":[
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"p_aaaaaaaaaa\",\"action\":\"request\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_students\",\"action\":\"transfer\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_fees\",\"action\":\"transfer\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_export\",\"action\":\"publish\",\"target\":\"public_bucket\",\"data_id\":\"S1001\"}]}"

echo; echo "-- verify (expect gaps: [])"
curl -s -H "x-read-key: $RK" $T/verify

echo; echo "-- investigate (expect svc_export on top, canary owner svc_export)"
curl -s -X POST $T/investigate -H "$J" -H "x-read-key: $RK" \
  -d '{"data_id":"S1001","exposure":"public_bucket","leaked_text":"{\"note_ref\":\"tok_ab12cd@trap.test\"}"}'
echo
```

Then test gap handling manually: in the SQL editor run `delete from events where seq = 2;`, call `/verify` (expect one gap with `missing: 1`) and `/investigate` (expect `edges` with an `inferred: true` entry).

## 4. Definition of done

- [ ] `smoke.sh` passes against the local server and the deployed URL
- [ ] Wrong or missing key returns `401` on every protected endpoint
- [ ] Sending the same batch twice returns `added: 0` the second time
- [ ] Two concurrent `POST /events` calls produce contiguous `seq` values with a valid chain (`/verify` clean)
- [ ] Deleting a middle row shows a gap; deleting the last row shows a tail gap; editing a row shows in `edited_seqs`
- [ ] A browser request from `DASHBOARD_ORIGIN` passes CORS preflight for `POST /investigate` with `x-read-key`
- [ ] Response bodies match the contract field names exactly

## 5. Not your job

The ERP, pseudonym creation, the HMAC key, canary token generation, and the dashboard. The tracer only stores tokens it is given.

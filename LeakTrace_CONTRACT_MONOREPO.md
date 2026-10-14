# Leak Trace: Shared Contract (v1)

## 0. Shared Git Repository Layout

All agents work in the **same Git repository**. The repository is split by ownership so agents can work in parallel without constantly editing the same files.

```text
leaktrace/
├── README.md
├── CONTRACT.md                         # Shared contract / source of truth
├── .gitignore
├── .env.example
│
├── shared/
│   ├── README.md
│   └── fixtures/                       # Shared demo/test payloads only
│       ├── students.json
│       ├── events.json
│       └── leaked_samples.json
│
├── tracer/                             # Agent A owns this folder
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── chain/
│   │   ├── investigation/
│   │   └── db/
│   ├── tests/
│   ├── schema.sql
│   ├── requirements.txt
│   └── vercel.json
│
├── erp/                                # Agent B owns this folder
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── data/
│   ├── tests/
│   ├── package.json
│   └── vercel.json
│
├── dashboard/                          # Agent B owns this folder
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── styles/
│   ├── tests/
│   ├── package.json
│   └── vercel.json
│
└── scripts/
    ├── integration/
    ├── seed/
    └── demo/
```

### Parallel-agent rules

- **Agent A owns `tracer/`** and the tracer-side tests/schema.
- **Agent B owns `erp/` and `dashboard/`** and their tests.
- Both agents may read `CONTRACT.md` and `shared/fixtures/`, but neither should silently change the contract.
- Changes to shared root files (`CONTRACT.md`, `.env.example`, `README.md`) should be coordinated and kept small.
- Avoid creating duplicate implementations outside the owned folders.
- Each agent should be able to run its own tests without requiring the other agent's service.
- Integration scripts live under `scripts/` and should test the already-defined APIs rather than changing them.
- Use separate feature branches when possible, then merge into the same repository. If working concurrently on one branch, keep commits scoped to one folder.

### Recommended branch/commit ownership

```text
agent-a/tracer-*       -> tracer/
agent-b/erp-dashboard-* -> erp/, dashboard/
integration/*           -> scripts/, shared/ (only when coordinated)
```

The API contract below remains the authority for communication between the parts.

This file is the single source of truth for the interface between the two parts. **Both agents read it first. Neither agent changes it alone.** If the contract must change, update this file, bump the version, and notify the other agent.

| Part | Owner | File | Folder |
|---|---|---|---|
| A | Agent A | `LeakTrace_PartA_Tracer.md` | `tracer/` |
| B | Agent B | `LeakTrace_PartB_ERP_Dashboard.md` | `erp/`, `dashboard/` |

Each part can be built and tested alone: Agent A tests with curl scripts that imitate the ERP, and Agent B tests against a mock tracer. Integration happens after both are done (Section 8).

## 1. Architecture

```
                        +----------------------+
 Browser/user --------> |  ERP (Node/Express)  |  Vercel project 1
  x-user-id header      |  fake student data   |
                        +----------+-----------+
                                   | POST /events (batch, x-ingest-key)
                                   v
                        +----------------------+        +-------------------+
                        |  Tracer (FastAPI)    | <----> |  Postgres (Neon)  |
                        |  chain + investigate |        |  events, head,    |
                        +----------+-----------+        |  canaries         |
                                   ^                    +-------------------+
 Dashboard (static) ---------------+  POST /investigate (x-read-key)
        |
        +--> ERP GET /custodian/reveal (x-admin-key)  -> pseudonym -> real identity
```

| Piece | Vercel project | Root directory | Talks to |
|---|---|---|---|
| ERP | `leaktrace-erp` | `erp` | Tracer (outbound only) |
| Tracer | `leaktrace-tracer` | `tracer` | Postgres |
| Dashboard | `leaktrace-dashboard` | `dashboard` | Tracer, ERP (browser calls) |

Direction rules: ERP calls Tracer. Dashboard calls Tracer and ERP. Tracer never calls ERP. The tracer never sees real identities; only the ERP holds the HMAC key and can reveal them.

## 2. Why this design (Vercel constraints)

| Constraint | Consequence in this design |
|---|---|
| Functions have a read-only filesystem except ephemeral `/tmp` | No log files. Events, chain head, and canaries live in Postgres |
| Several function instances can run at once | Appends serialize on a locked `chain_head` row |
| A function can be frozen after the response is sent | ERP wraps the tracer call in `waitUntil` from `@vercel/functions` |
| In-memory counters reset per instance | The tracer assigns `seq` inside the database transaction, not the ERP |
| Postgres sequences can skip numbers after rollbacks | `seq` is computed from `chain_head`, never `bigserial`, so a skip always means missing evidence |
| Retries can duplicate events | Each event has a UUID `event_id`; the tracer ignores duplicates |
| Separate origins | Explicit CORS on both servers using `DASHBOARD_ORIGIN` |

## 3. Fixed names and formats

| Item | Value |
|---|---|
| Services (plain names, not pseudonymized) | `svc_students`, `svc_fees`, `svc_export` |
| Exposure node | `public_bucket` |
| User pseudonym | `p_` + 10 hex characters (HMAC of the user id, made by the ERP) |
| Demo users | `clerk01`, `dean01`, `intern01` |
| Demo data ids | `S1001`, `S1002` |
| Canary token | `tok_` + 6 hex characters, planted as `<token>@trap.test` in a field called `note_ref` |
| Genesis hash | `aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e` (`sha256('genesis')`) |
| Time unit | Unix seconds (integer) everywhere |

## 4. Authentication

| Header | Who sends it | Who checks it | Protects |
|---|---|---|---|
| `x-ingest-key` | ERP | Tracer | `POST /events`, `POST /canaries` |
| `x-read-key` | Dashboard | Tracer | `POST /investigate`, `GET /verify`, `GET /health/db` |
| `x-admin-key` | Dashboard, curl | ERP | `GET /custodian/reveal`, `POST /admin/register-canaries` |

`/health` on both servers needs no key. Key comparison must be constant-time. A wrong or missing key returns `401`.

## 5. Tracer API (built by Part A, consumed by Part B)

### `POST /events`

Request (`x-ingest-key`):

```json
{
  "events": [
    {
      "event_id": "0b1d6f2e-3c4a-4b7e-9d1f-2a5c8e7f9a10",
      "ts": 1760452320,
      "actor": "p_a3f9c2d1e4",
      "action": "read",
      "target": "svc_students",
      "data_id": "S1001",
      "status": 200
    }
  ]
}
```

Rules: events in one batch are stored in order, in one transaction. A repeated `event_id` is ignored, so retries are safe. Response: `{"ok": true, "added": <count>}`.

### `POST /canaries`

Request (`x-ingest-key`): `{"canaries": [{"token": "tok_ab12cd", "service": "svc_export"}]}`. Upserts by token. Response: `{"ok": true}`.

### `GET /verify` (`x-read-key`)

```json
{"events": 12, "head_seq": 12,
 "gaps": [{"after": 4, "missing": 2, "between": ["svc_students", "p_a3f9c2d1e4"]}],
 "edited_seqs": []}
```

A tail deletion appears as a gap with `"tail": true` and a `null` second entry in `between`.

### `POST /investigate` (`x-read-key`)

Request:

```json
{"data_id": "S1001", "exposure": "public_bucket",
 "leak_time": null, "leaked_text": "{...pasted leaked JSON...}", "tau": 600}
```

Only `data_id` is required. Response (this is the dashboard's data shape):

```json
{
  "case": "S1001 found at public_bucket",
  "leak": "public_bucket",
  "chain": {"events": 12, "gaps": [], "edited_seqs": []},
  "canary": {"token": "tok_ab12cd", "owner": "svc_export"},
  "nodes": [{"id": "svc_export"}],
  "edges": [{"s": "svc_export", "t": "public_bucket", "inferred": false}],
  "suspects": [{"id": "svc_export", "p": 0.74, "why": "Handled S1001 3s before the leak; 1 hop(s) to public_bucket; leaked copy carries its canary token."}]
}
```

Rules: `canary` is `null` when no token matches. `suspects` is sorted by `p` descending and `p` values sum to about 1. Errors: `404` no events for the `data_id`, `400` exposure event missing and no `leak_time`, `401` bad key. Error bodies are `{"detail": "..."}`.

### `GET /health`, `GET /health/db`

`{"ok": true}` and `{"db": "ok"}`.

## 6. ERP API (built by Part B, consumed by Part A tests and the dashboard)

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /health` | none | `{"ok": true}` |
| `GET /students/:id` | `x-user-id` | Returns the record, emits `read` to `svc_students` |
| `GET /fees/:id` | `x-user-id` | Returns the record, emits `read` to `svc_fees` |
| `POST /export/:id` | `x-user-id` | Emits `request` (user to `svc_export`) plus `transfer` events from `svc_students` and `svc_fees` to `svc_export`; returns the combined record with `note_ref` |
| `POST /leak/:id` | none (demo) | Emits `publish` from `svc_export` to `public_bucket`; returns `{"leaked": {...record with note_ref...}}` |
| `POST /admin/register-canaries` | `x-admin-key` | Registers one token per service with the tracer; returns `{"tracer_status": 200}` |
| `GET /custodian/reveal` | `x-admin-key` | Returns `{"p_a3f9c2d1e4": "clerk01", ...}` |

Event sequence for one export-then-leak flow of `S1001`:

1. `p_user` request `svc_export` (S1001)
2. `svc_students` transfer `svc_export` (S1001)
3. `svc_fees` transfer `svc_export` (S1001)
4. `svc_export` publish `public_bucket` (S1001)

The expected top suspect for this flow is `svc_export`.

## 7. Environment variables and shared secrets

| Variable | ERP (B) | Tracer (A) | Notes |
|---|---|---|---|
| `HMAC_KEY` | yes | no | Custodian secret |
| `TRACER_URL` | yes | no | https, no trailing slash |
| `INGEST_KEY` | yes | yes | **Must match on both** |
| `READ_KEY` | no | yes | Dashboard viewer key |
| `ADMIN_KEY` | yes | no | ERP admin key |
| `DASHBOARD_ORIGIN` | yes | yes | Exact origin, no trailing slash |
| `DATABASE_URL` | no | yes | Pooled Postgres string |

Agree on `INGEST_KEY`, `READ_KEY`, and `ADMIN_KEY` values up front (generate with `openssl rand -hex 24`). After any variable change, redeploy.

## 8. Integration phase: deploy and connectivity checklist

Deploy in this order: database, tracer, ERP, dashboard. Then set the final URLs in the env vars and redeploy.

```bash
TRACER=https://leaktrace-tracer.vercel.app
ERP=https://leaktrace-erp.vercel.app
RK=<READ_KEY>; IK=<INGEST_KEY>; AK=<ADMIN_KEY>
```

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Tracer is up | `curl $TRACER/health` | `{"ok":true}` |
| 2 | Tracer reaches the database | `curl -H "x-read-key: $RK" $TRACER/health/db` | `{"db":"ok"}` |
| 3 | Ingest key is enforced | `curl -X POST $TRACER/events -H 'content-type: application/json' -d '{"events":[]}'` | `401` |
| 4 | ERP is up | `curl $ERP/health` | `{"ok":true}` |
| 5 | ERP can reach the tracer | `curl -X POST -H "x-admin-key: $AK" $ERP/admin/register-canaries` | `{"tracer_status":200}` |
| 6 | Event flows end to end | `curl -H "x-user-id: clerk01" $ERP/students/S1001` then `curl -H "x-read-key: $RK" $TRACER/verify` | `events` is 1 |
| 7 | Chain is clean | `curl -H "x-read-key: $RK" $TRACER/verify` | `gaps: []`, `edited_seqs: []` |
| 8 | CORS works | Open the dashboard and watch the browser console | No CORS errors |

If check 5 or 6 fails, read the ERP project's runtime logs. A failed delivery prints `TRACE_FAILED` with the reason.

### Known Vercel connection failures

| Symptom | Cause | Fix |
|---|---|---|
| ERP gets `401` with an HTML login page from the tracer | Vercel Deployment Protection on that URL | Call the production domain, disable protection for the project, or send Vercel's protection-bypass header |
| Events missing although requests succeed | Tracer call not awaited, function frozen | Keep `waitUntil` and make sure `@vercel/functions` is installed |
| `Missing env var` 500 on every request | Variable not set in that project or not redeployed | Add it, redeploy |
| Browser shows a CORS error | `DASHBOARD_ORIGIN` mismatched (trailing slash, http vs https, preview URL) | Set the exact origin and redeploy both servers |
| Intermittent database errors | Direct (non-pooled) connection string | Use the pooled string with `sslmode=require` |
| `/verify` reports a break at the first event | Genesis hash in `schema.sql` differs from `GENESIS` | Make both equal `sha256('genesis')` and update the seeded `chain_head` row |
| Tracer build fails on dependencies | `pyproject.toml` and `requirements.txt` both present without a lockfile | Keep only `requirements.txt` |
| ERP build says no entrypoint | Unrecognized filename | Check the Vercel Express docs for accepted names |

## 9. Demo script

1. Make a few reads as different users:
   `curl -H "x-user-id: clerk01" $ERP/students/S1001`, `curl -H "x-user-id: intern01" -X POST $ERP/export/S1001`.
2. Simulate the leak: `curl -X POST $ERP/leak/S1001`. Copy the returned `leaked` JSON.
3. Show the pseudonymized log in the database: users appear as `p_...` tokens.
4. Simulate log loss in the database SQL editor: `delete from events where seq between 3 and 4;`
5. Run `/verify`: the gap appears with its location.
6. Open the dashboard, paste the leaked JSON, and show the ranking, dashed inferred edge, and canary match.
7. Toggle custodian view with the admin key to reveal the real user.

## 10. Honest limitations

- The chain head lives in the same database as the events. Someone with full database access can rewrite both. For production, anchor the head hash somewhere separate (another service or a blockchain).
- `x-user-id` is a prototype identity. Anyone can set it, so it must not be trusted as evidence in a real deployment.
- Events that the ERP fails to deliver after three attempts are only in Vercel's runtime logs. The tracer cannot know they existed. A production system would add a durable outbox or queue.
- Scores are ranked heuristics, not calibrated probabilities. Constants: tau 600 s, 0.8 hop decay, 0.5 inferred weight, 0.25 fallback weight, canary x5.
- Free-tier limits (function duration, database size, request counts) change. Check current limits before a long demo.

## 11. Change log

| Version | Change |
|---|---|
| v1 | Initial contract |

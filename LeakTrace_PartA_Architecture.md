# Part A Architecture: Tracer (FastAPI + Postgres)

**Audience:** Agent A  **Related:** `LeakTrace_CONTRACT.md` (interface, shared) and `LeakTrace_PartA_Tracer.md` (build guide). The other part (ERP and dashboard) is built in parallel by Agent B; treat it as an external system that follows the contract.

Your scope is the **evidence zone**: the tracer and its database. You own ingestion, the tamper-evident log, canary storage, and investigation.

## 1. System context

```
   Users / scripts                 Investigator
        |                               |
        | x-user-id                     | read key / admin key
        v                               v
 +----------------+  events   +----------------+  SQL   +------------------+
 |  ERP (Node)    | --------> |  Tracer        | <----> |  Postgres        |
 |  main service  |  HTTPS    |  (FastAPI)     |        |  events          |
 |  custodian     |           |  evidence zone |        |  chain_head      |
 +--------+-------+           +--------+-------+        |  canaries        |
          ^                            ^                +------------------+
          | reveal (admin key)         | investigate (read key)
          |                            |
          +------------ Dashboard (static, browser) ----------+
```

Direction rules: the ERP calls the tracer. The dashboard calls the tracer and the ERP. The tracer never calls the ERP and never sees real identities.

Items outside the tracer and database boxes are built by Agent B. You interact with them only through the contract.

## 2. Components in your scope

| Component | Responsibility | Technology | Owns | Does not do |
|---|---|---|---|---|
| **Tracer** | Ingests events, builds and verifies the hash chain, stores canary tokens, builds the provenance graph, ranks suspects | Python, FastAPI, psycopg, NetworkX | The evidence log and its integrity | Know real identities, generate tokens |
| **Postgres** | Durable evidence storage with transactional appends | Postgres (for example Neon via the Vercel Marketplace) | `events`, `chain_head`, `canaries` | Business data |

External neighbours (not yours): the **ERP** calls `POST /events` and `POST /canaries` with the ingest key; the **dashboard** calls `POST /investigate` and `GET /verify` with the read key.

## 3. Deployment

One Vercel project plus the database.

| Project | Root directory | Runtime | Entry |
|---|---|---|---|
| `leaktrace-tracer` | `tracer` | Python function | FastAPI instance named `app` in `app.py` |

The database is attached to this project only (pooled connection string with `sslmode=require`). The tracer becomes a single Vercel Function with its own URL; configuration is passed through environment variables, and a redeploy is needed after any change. Deploy first, because the ERP needs its URL.

## 4. Data flows

### 4.1 Event ingestion (your side of the ERP flow)

```
ERP --POST /events [x-ingest-key]--> Tracer
        a. check ingest key
        b. open transaction, lock chain_head row
        c. for each event: skip duplicate event_id, assign next seq,
           compute hash from previous hash, insert row
        d. update chain_head, commit
```

### 4.2 Investigation

```
Dashboard --> POST /investigate [x-read-key]  {data_id, exposure, leaked_text?}
                 Tracer:
                   1. load events and verify the chain (gaps, edits, tail)
                   2. keep events for data_id
                   3. build graph: observed edges + inferred edges at gaps
                   4. score each entity: access x path x time decay
                   5. match leaked_text against registered canary tokens, boost owner
                   6. normalize to probabilities, generate explanations
                 <-- report JSON (nodes, edges, suspects, chain, canary)
```

### 4.3 Canary registration (your side)

```
ERP --POST /canaries [x-ingest-key]--> Tracer   (upsert token -> service)
```

You store the tokens you are given. Token generation is the ERP's job.

## 5. Data architecture

| Table | Columns (summary) | Purpose |
|---|---|---|
| `events` | `seq` (pk), `event_id` (unique uuid), `ts`, `actor`, `action`, `target`, `data_id`, `status`, `prev_hash`, `hash` | Append-only evidence log, hash-chained |
| `chain_head` | one row: `seq`, `hash` | Authoritative chain tip; serializes appends; detects tail deletion |
| `canaries` | `token` (pk), `service` | Lookup for matching leaked content |

| Data | Where it lives | Who can read it |
|---|---|---|
| Real user identifiers | ERP only (directory and custodian map) | ERP admin |
| HMAC key | ERP environment only | ERP operator |
| Pseudonymized actors, service names, data ids | Tracer database | Anyone with the read key |
| Canary tokens | ERP (derived) and tracer (registered) | Tracer operator |
| Student and fee records | ERP only | ERP users |

The tracer holds no personal data beyond opaque tokens and record ids.

The tracer holds no personal data beyond opaque tokens and record ids.

## 6. Trust boundaries and security

| Item | Detail |
|---|---|
| Your zone | Evidence zone: tracer and Postgres |
| Secrets you hold | `DATABASE_URL`, `READ_KEY`, and the shared `INGEST_KEY` |
| Secrets you must never hold | `HMAC_KEY`, `ADMIN_KEY` |
| Write path | `POST /events` and `POST /canaries` only, both behind `x-ingest-key` |
| Read path | `POST /investigate`, `GET /verify`, `GET /health/db`, all behind `x-read-key` |
| Key checks | Constant-time comparison; `401` on a wrong or missing key |
| CORS | One allowed origin (`DASHBOARD_ORIGIN`), only the headers `content-type`, `x-read-key`, `x-ingest-key` |

## 7. Platform constraints and the response

| Constraint (Vercel functions) | Response |
|---|---|
| Read-only filesystem apart from ephemeral `/tmp` | All state in Postgres |
| Multiple instances run concurrently | Appends serialize on a locked `chain_head` row |
| Memory does not persist between instances | `seq` assigned in the database transaction |
| Each server has a separate origin | Explicit CORS and URL configuration through env vars |
| Deployment Protection can block server-to-server calls | Use production domains or the bypass header; covered in the checklist |

## 8. Failure modes in your scope

| Failure | Behavior | Evidence impact |
|---|---|---|
| Duplicate delivery (retry) | Tracer ignores repeated `event_id` | None |
| Database unavailable | Tracer returns errors; ERP retries then drops | Events not stored; visible only in ERP logs |
| Rows deleted from the log | `/verify` shows a gap by `seq`; investigation adds inferred edges | Located and weighted, not recovered |
| Row edited | Hash mismatch listed in `edited_seqs` | Detected |
| Last rows deleted | `chain_head.seq` exceeds the last row; reported as tail gap | Detected |
| Wrong or missing key | `401` | None |

## 9. Scalability and limits

- Appends are serialized by design, so write throughput is bounded by one transaction at a time. That is acceptable for a prototype and a demo.
- Investigation loads all events and searches simple paths up to six hops, so cost grows with log size and graph density. Keep demo logs small.
- Function duration, database size, and request limits depend on the Vercel and database plan and can change; check current limits before a long demo.

## 10. Technology stack

| Layer | Choice |
|---|---|
| Analytics service | Python, FastAPI, pydantic, psycopg 3, NetworkX |
| Storage | Postgres with a pooled connection string |
| Crypto | SHA-256, HMAC-SHA-256 |

## 11. Architectural limitations

- The chain head lives in the same database as the events, so full database access can rewrite both. Production should anchor the head elsewhere.
- Events the ERP fails to deliver after its retries never reach you; the tracer cannot detect events it was never sent.
- Results are ranked heuristics, not calibrated probabilities.

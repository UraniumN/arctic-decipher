# LeakTrace — Tracer Service

> **Owner:** Agent A  
> **Directory:** `tracer/`  
> **Tech:** Python 3.10+, FastAPI, psycopg 3, NetworkX, Pydantic

The **Tracer** is the tamper-evident evidence zone. It ingests pseudonymized events from the ERP, maintains a cryptographically verifiable hash chain in PostgreSQL, stores canary token associations, builds provenance graphs, and ranks leak suspects.

The tracer **never** sees real user identities and **never** calls out to the ERP.

---

## Architecture & Responsibilities

- **Hash Chain Integrity:** Each event row is chained using `SHA-256(canonical_event_json + previous_hash)`.
- **Concurrency Control:** Atomic batches serialized by locking the `chain_head` row.
- **Tamper Evidence:** Detects missing rows (gaps), hash mismatches (edits), and truncation (tail deletions).
- **Leak Investigation:** Builds a directed provenance graph, scores suspects via `access × path × time_decay`, boosts scores with canary token matches, and produces human-readable attribution reasons.

---

## API Endpoints

| Method | Endpoint | Required Header | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check (`{"ok": true}`) |
| `GET` | `/health/db` | `x-read-key` | Database connectivity verification (`{"db": "ok"}`) |
| `POST` | `/events` | `x-ingest-key` | Ingest batch of access events (idempotent via `event_id`) |
| `POST` | `/canaries` | `x-ingest-key` | Register canary tokens with associated services |
| `GET` | `/verify` | `x-read-key` | Verify hash chain integrity and locate any gaps/edits |
| `POST` | `/investigate` | `x-read-key` | Investigate a leak and return ranked suspect attributions |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string (with `sslmode=require`) |
| `INGEST_KEY` | Shared secret with the ERP for ingesting events & canaries |
| `READ_KEY` | Secret used by the Dashboard to verify chains and investigate leaks |
| `DASHBOARD_ORIGIN` | Exact CORS origin of the dashboard (e.g. `http://localhost:5173`) |

---

## Local Setup & Run

### 1. Install dependencies

```bash
pip install -r requirements.txt uvicorn
```

### 2. Initialize the Database

Run `schema.sql` against your PostgreSQL database:

```bash
psql $DATABASE_URL -f schema.sql
```

### 3. Run the Tracer

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
export INGEST_KEY="ik"
export READ_KEY="rk"
export DASHBOARD_ORIGIN="http://localhost:5173"

# Start FastAPI server
uvicorn app.main:app --port 8000 --reload
# or using root entrypoint:
uvicorn app:app --port 8000 --reload
```

---

## Testing

```bash
# Run unit tests directly
python tests/test_chain.py
python tests/test_investigation.py

# Or run with pytest
pytest tests/

# Run end-to-end smoke test against a running tracer
bash smoke.sh
# On Windows PowerShell:
.\smoke.ps1
```

---

## Vercel Deployment

1. Create a new Vercel project with **Root Directory** set to `tracer`.
2. Attach a serverless PostgreSQL database (e.g. Neon from Vercel Marketplace).
3. Set the required environment variables: `DATABASE_URL`, `INGEST_KEY`, `READ_KEY`, `DASHBOARD_ORIGIN`.
4. Run `schema.sql` once via the Neon SQL editor.
5. Deploy.

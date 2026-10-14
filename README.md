# LeakTrace

**Data-leak attribution for pseudonymized audit logs.**

LeakTrace is a monorepo containing three services that work together to trace the source of a data leak through tamper-evident, hash-chained event logs — even when parts of those logs have been deleted or edited.

## Architecture

```
                        +----------------------+
 Browser/user --------> |  ERP (Node/Express)  |  Vercel project 1
  x-user-id header      |  fake student data   |
                        +----------+-----------+
                                   | POST /events (batch, x-ingest-key)
                                   v
                        +----------------------+        +-------------------+
                        |  Tracer (FastAPI)     | <----> |  Postgres (Neon)  |
                        |  chain + investigate  |        |  events, head,    |
                        +----------+-----------+        |  canaries         |
                                   ^                    +-------------------+
 Dashboard (static) ---------------+  POST /investigate (x-read-key)
        |
        +--> ERP GET /custodian/reveal (x-admin-key)  -> pseudonym -> real identity
```

## Services

| Service | Directory | Tech | Port (local) |
|---|---|---|---|
| **Tracer** | `tracer/` | Python, FastAPI, psycopg 3, NetworkX | 8000 |
| **ERP** | `erp/` | Node.js, Express | 3001 |
| **Dashboard** | `dashboard/` | Static HTML/CSS/JS (Vite) | 5173 |

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or a Neon database)

### 2. Generate Keys

```bash
export INGEST_KEY=$(openssl rand -hex 24)
export READ_KEY=$(openssl rand -hex 24)
export ADMIN_KEY=$(openssl rand -hex 24)
export HMAC_KEY=$(openssl rand -hex 32)
```

### 3. Set Up the Database

Create a Postgres database and run:

```bash
psql $DATABASE_URL -f tracer/schema.sql
```

### 4. Start All Services (One Command)

From the project root:

```bash
npm run dev
```

This automatically orchestrates and starts all three services:
- **Tracer**: `http://localhost:8000`
- **ERP**: `http://localhost:3001`
- **Dashboard**: `http://localhost:5173`

Or start each service individually:

### 5. Start the Tracer Individually

```bash
cd tracer
pip install -r requirements.txt uvicorn
export DATABASE_URL="your_postgres_url" INGEST_KEY=$INGEST_KEY READ_KEY=$READ_KEY DASHBOARD_ORIGIN=http://localhost:5173
uvicorn app.main:app --port 8000
```

### 5. Start the ERP

```bash
cd erp
npm install
export TRACER_URL=http://localhost:8000 INGEST_KEY=$INGEST_KEY ADMIN_KEY=$ADMIN_KEY HMAC_KEY=$HMAC_KEY DASHBOARD_ORIGIN=http://localhost:5173
npm run dev
```

### 6. Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

### 7. Run the Demo

```bash
cd scripts/demo
bash demo.sh
```

## Contract

See [CONTRACT.md](CONTRACT.md) for the full API contract between services.

## Deployment

Deploy order: **Database → Tracer → ERP → Dashboard**

Each service deploys as a separate Vercel project. See the individual README files in each service directory for deployment details.

## Limitations

- Chain head lives in the same database as events (production should anchor elsewhere)
- `x-user-id` is prototype-level identity (not trusted in production)
- Scores are ranked heuristics, not calibrated probabilities
- Free-tier Vercel/Neon limits apply

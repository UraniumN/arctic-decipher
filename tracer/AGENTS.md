# Tracer — Agent A Owned

> **Owner: Agent A**
> **Other agents: read-only access. Do not create or modify files in this directory.**

## Overview

The tracer is the **evidence zone** — it receives pseudonymized events, builds a tamper-evident hash chain in Postgres, verifies integrity, stores canary tokens, and runs leak investigations.

## Architecture

```
tracer/
├── app/
│   ├── main.py              # FastAPI entry point (CORS, router mount)
│   ├── api/
│   │   ├── models.py        # Pydantic request/response models
│   │   └── routes.py        # All endpoint handlers
│   ├── chain/
│   │   └── __init__.py      # SHA-256 digest + chain verification
│   ├── investigation/
│   │   └── __init__.py      # Provenance graph, scoring, canary matching
│   └── db/
│       └── __init__.py      # psycopg connection factory
├── tests/
│   ├── smoke.sh             # curl-based end-to-end smoke test
│   ├── test_chain.py        # Chain module unit tests
│   └── test_investigation.py # Investigation module unit tests
├── schema.sql               # Postgres DDL
├── requirements.txt         # Only dependency manifest (no pyproject.toml!)
└── vercel.json              # Vercel Python function config
```

## Local Development

```bash
cd tracer
pip install -r requirements.txt uvicorn
export DATABASE_URL=... INGEST_KEY=ik READ_KEY=rk DASHBOARD_ORIGIN=http://localhost:5173
uvicorn app.main:app --port 8000
```

## Key Constraints

- **No pyproject.toml** — causes Vercel build conflicts with requirements.txt
- **No HMAC_KEY or ADMIN_KEY** — the tracer must never hold these secrets
- **seq assigned in DB transaction** — never use bigserial (skips on rollback fake gaps)
- **chain_head locked FOR UPDATE** — serializes concurrent appenders

## Contract Compliance

All endpoints follow `LeakTrace_CONTRACT_MONOREPO.md` §5 exactly. Response field names, error codes, and header names must not deviate.

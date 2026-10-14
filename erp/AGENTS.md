# ERP — Agent B Owned

> **Owner: Agent B**
> **Other agents: read-only access. Do not create or modify files in this directory.**

## Overview

The ERP serves fake student/fee data, pseudonymizes user identities with HMAC, emits events to the tracer on every data access, generates and registers canary tokens, and provides custodian reveal (pseudonym → real identity).

## Architecture

```
erp/
├── src/
│   ├── server.js            # Express entry point (all routes)
│   ├── routes/
│   │   └── index.js         # Route extraction point (currently in server.js)
│   ├── services/
│   │   ├── custodian.js     # HMAC pseudonymization + reverse map
│   │   ├── canary.js        # tok_XXXXXX token generation
│   │   └── tracer-client.js # HTTP client with retry for tracer calls
│   └── data/
│       └── records.js       # In-memory student + fee records
├── tests/
│   └── test_erp.js          # Unit tests for services and data
├── package.json
└── vercel.json
```

## Local Development

```bash
cd erp
npm install
export TRACER_URL=http://localhost:8000 INGEST_KEY=ik ADMIN_KEY=ak HMAC_KEY=secret DASHBOARD_ORIGIN=http://localhost:5173
npm run dev  # runs on port 3001
```

## Key Constraints

- **HMAC_KEY is ERP-only** — never share with the tracer
- **Event emission with retry** — 3 attempts with backoff via tracer-client.js
- **Pseudonym format** — `p_` + first 10 hex chars of HMAC-SHA256(userId)
- **Canary format** — `tok_` + 6 random hex chars, embedded as `<token>@trap.test` in `note_ref`

## Contract Compliance

All endpoints follow `LeakTrace_CONTRACT_MONOREPO.md` §6 exactly.

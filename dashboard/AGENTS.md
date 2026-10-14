# Dashboard — Agent B Owned

> **Owner: Agent B**
> **Other agents: read-only access. Do not create or modify files in this directory.**

## Overview

The dashboard is a static frontend that calls the Tracer API (for investigation and verification) and the ERP API (for custodian reveal). It renders suspect rankings, chain integrity status, canary matches, and a provenance graph.

## Architecture

```
dashboard/
├── src/
│   ├── index.html           # Main page
│   ├── api/
│   │   └── client.js        # HTTP client for Tracer + ERP
│   ├── components/
│   │   └── graph.js         # Canvas-based provenance graph renderer
│   ├── pages/
│   │   └── app.js           # Main UI orchestration
│   └── styles/
│       └── main.css         # Dark theme design system
├── tests/
│   └── test_client.js       # Module structure tests
├── package.json
├── vite.config.js           # Dev server on :5173
└── vercel.json
```

## Local Development

```bash
cd dashboard
npm install
npm run dev  # runs on port 5173
```

## Key Constraints

- **Static frontend** — no server-side code, no SSR
- **CORS** — both Tracer and ERP must set `DASHBOARD_ORIGIN` to match this app's origin
- **Keys sent via headers** — `x-read-key` for tracer calls, `x-admin-key` for custodian reveal
- **No dependencies on Node modules at runtime** — pure browser JS with ES modules

## Contract Compliance

Dashboard consumes the shapes defined in `LeakTrace_CONTRACT_MONOREPO.md` §5 (tracer) and §6 (ERP).

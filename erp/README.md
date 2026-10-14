# LeakTrace — ERP Service

> **Owner:** Agent B  
> **Directory:** `erp/`  
> **Tech:** Node.js (>=18), Express, @vercel/functions

The **ERP** service is the main business application. It serves mock student and fee data, generates HMAC pseudonyms to mask real identities, embeds canary tokens in exports, and asynchronously emits audit events to the Tracer.

The ERP holds the HMAC secret and is the **only** component capable of revealing real user identities.

---

## Architecture & Responsibilities

- **Custodian:** Masks user identifiers using `p_` + 10 hex characters derived from `HMAC-SHA256(userId, HMAC_KEY)`.
- **Canary Generation:** Creates `tok_` + 6 hex tokens embedded in the `note_ref` field as `<token>@trap.test`.
- **Event Emission:** Every student read, fee read, export, and simulated leak emits structured audit events to the Tracer with retry resilience (`TRACE_FAILED` logging).
- **Custodian Reveal:** Protected endpoint for authorized administrators to resolve pseudonym hashes back to real names.

---

## API Endpoints

| Method | Endpoint | Required Header | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check (`{"ok": true}`) |
| `GET` | `/students/:id` | `x-user-id` | Read student record; emits read event to `svc_students` |
| `GET` | `/fees/:id` | `x-user-id` | Read fee record; emits read event to `svc_fees` |
| `POST` | `/export/:id` | `x-user-id` | Export merged record with canary; emits `request` + `transfer` events |
| `POST` | `/leak/:id` | None (Demo) | Simulates leak; emits `publish` event to `public_bucket` |
| `POST` | `/admin/register-canaries` | `x-admin-key` | Registers one canary per service with the Tracer |
| `GET` | `/custodian/reveal` | `x-admin-key` | Returns the pseudonym-to-real-identity mapping |

---

## Environment Variables

| Variable | Description |
|---|---|
| `TRACER_URL` | Base URL of the Tracer service (no trailing slash, e.g. `http://localhost:8000`) |
| `INGEST_KEY` | Shared secret with Tracer for emitting events & canaries |
| `ADMIN_KEY` | Secret for administrative endpoints (`/admin/register-canaries`, `/custodian/reveal`) |
| `HMAC_KEY` | Secret key used for deterministic pseudonym hashing |
| `DASHBOARD_ORIGIN` | Exact CORS origin of the dashboard (e.g. `http://localhost:5173`) |

---

## Local Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Run the ERP

```bash
export TRACER_URL="http://localhost:8000"
export INGEST_KEY="ik"
export ADMIN_KEY="ak"
export HMAC_KEY="custodian_secret"
export DASHBOARD_ORIGIN="http://localhost:5173"

npm run dev
```

Server starts on `http://localhost:3001`.

---

## Testing

```bash
# Run unit tests
npm test
# or
node tests/test_erp.js
```

---

## Vercel Deployment

1. Create a new Vercel project with **Root Directory** set to `erp`.
2. Set environment variables: `TRACER_URL`, `INGEST_KEY`, `ADMIN_KEY`, `HMAC_KEY`, `DASHBOARD_ORIGIN`.
3. Deploy.

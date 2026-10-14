# LeakTrace — Agent Coordination Rules

> **This file is automatically loaded by coding agents working in this repository.**
> It defines ownership, boundaries, and collaboration rules for parallel development.

## Ownership Map

| Directory | Owner | May Read | May Write |
|---|---|---|---|
| `tracer/` | **Agent A** | Both | Agent A only |
| `erp/` | **Agent B** | Both | Agent B only |
| `dashboard/` | **Agent B** | Both | Agent B only |
| `shared/fixtures/` | Shared | Both | Coordinated only |
| `scripts/` | Shared | Both | Coordinated only |
| `CONTRACT.md` | Shared | Both | **Neither alone** — must coordinate |
| `README.md` | Shared | Both | Coordinated, keep changes small |
| `.env.example` | Shared | Both | Coordinated, keep changes small |
| `.gitignore` | Shared | Both | Either (additive only) |
| `AGENTS.md` | Shared | Both | Coordinated only |

## Critical Rules

1. **Stay in your lane.** Only create/edit files inside your owned directories. Never modify files owned by the other agent.

2. **The contract is law.** `LeakTrace_CONTRACT_MONOREPO.md` defines all API shapes, headers, field names, and error codes. Follow it exactly. If something seems wrong, flag it — don't silently deviate.

3. **Test independently.** Each agent's tests must pass without the other service running:
   - Agent A: use curl/scripts to imitate the ERP
   - Agent B: mock the tracer responses or use a stub

4. **Don't duplicate.** If functionality belongs to the other agent's service, call it via the contract API — don't reimplement it.

5. **Shared files are read-mostly.** `shared/fixtures/` contains test data both agents reference. Changes require coordination.

6. **Branch naming convention:**
   ```
   agent-a/tracer-*        → tracer/
   agent-b/erp-dashboard-* → erp/, dashboard/
   integration/*           → scripts/, shared/
   ```

7. **Commit scoping.** If on the same branch, keep commits scoped to your owned folders only.

## Interface Contract Summary

All inter-service communication happens over HTTP using these fixed contracts:

### Tracer API (Agent A builds, Agent B consumes)
- `POST /events` — `x-ingest-key` — batch event ingest
- `POST /canaries` — `x-ingest-key` — canary token registration
- `GET /verify` — `x-read-key` — chain verification
- `POST /investigate` — `x-read-key` — leak investigation
- `GET /health` — no key — liveness
- `GET /health/db` — `x-read-key` — database check

### ERP API (Agent B builds, dashboard/tests consume)
- `GET /students/:id` — `x-user-id` — read student record
- `GET /fees/:id` — `x-user-id` — read fee record
- `POST /export/:id` — `x-user-id` — export combined record
- `POST /leak/:id` — no key — simulate leak (demo)
- `POST /admin/register-canaries` — `x-admin-key` — register canaries
- `GET /custodian/reveal` — `x-admin-key` — pseudonym → identity

### Shared Secrets (must match across services)
- `INGEST_KEY` — Tracer + ERP
- `READ_KEY` — Tracer only (dashboard viewer)
- `ADMIN_KEY` — ERP only
- `DASHBOARD_ORIGIN` — Both services (exact origin, no trailing slash)

## What to Read First

1. `LeakTrace_CONTRACT_MONOREPO.md` — full contract with API specs, examples, and integration checklist
2. Your part's build guide:
   - Agent A: `LeakTrace_PartA_Tracer.md`, `LeakTrace_PartA_Architecture.md`, `LeakTrace_PartA_Design.md`
   - Agent B: `LeakTrace_PartB_ERP_Dashboard.md` (if present)
3. This file (`AGENTS.md`) — coordination rules

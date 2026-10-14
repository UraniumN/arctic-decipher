# Part B Architecture: ERP (Node.js) + Dashboard

**Audience:** Agent B  **Related:** `LeakTrace_CONTRACT.md` (interface, shared) and `LeakTrace_PartB_ERP_Dashboard.md` (build guide). The tracer is built in parallel by Agent A; treat it as an external system that follows the contract (use the mock tracer until it exists).

Your scope is the **custodian zone** (the ERP, which holds real identities and the HMAC key) and the **analyst zone** (the dashboard in the browser).

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

Items outside the ERP and dashboard boxes are built by Agent A. You interact with them only through the contract.

## 2. Components in your scope

| Component | Responsibility | Technology | Owns | Does not do |
|---|---|---|---|---|
| **ERP** | University demo service; emits events; plants canary tokens; holds the HMAC key; reveals identities to admins | Node.js, Express, `@vercel/functions` | Fake student and fee data, pseudonym and canary generation, custodian map | Store events, score suspects |
| **Dashboard** | Shows ranking, graph, integrity status, canary result; custodian toggle | Static HTML, Cytoscape.js | Presentation only | Hold keys beyond the session |

External neighbour (not yours): the **Tracer** receives your events and canary registrations and returns investigation reports.

## 3. Deployment

Two Vercel projects.

| Project | Root directory | Runtime | Entry |
|---|---|---|---|
| `leaktrace-erp` | `erp` | Node.js function | Exported Express `app` |
| `leaktrace-dashboard` | `dashboard` | Static | `index.html` |

The ERP becomes a single Vercel Function with its own URL. The dashboard is plain static hosting with no framework or build step. Configuration (tracer URL, keys, allowed origin) is passed through environment variables and needs a redeploy after any change. Deploy after the tracer URL is known, or point `TRACER_URL` at the mock tracer until then.

## 4. Data flows

### 4.1 Event emission (every ERP request)

```
Client --> ERP handler
             1. authenticate x-user-id (prototype)
             2. build events (pseudonymized actor, service names plain)
             3. respond to the client immediately
             4. waitUntil( POST /events  [x-ingest-key] ) with timeout and retries
```

The client response never waits on the tracer, and tracer failure never breaks the ERP.

### 4.2 Custodian reveal

```
Dashboard --> GET ERP /custodian/reveal [x-admin-key]
          <-- { "p_a3f9c2d1e4": "clerk01", ... }
Dashboard replaces pseudonyms with names in the browser only.
```

### 4.3 Canary registration (once per deploy)

```
Admin --> ERP POST /admin/register-canaries [x-admin-key]
            ERP derives one token per service from the HMAC key
            ERP --> Tracer POST /canaries [x-ingest-key]
```

### 4.4 Investigation view

```
Dashboard --> Tracer POST /investigate [x-read-key]  {data_id, exposure, leaked_text?}
          <-- report JSON (nodes, edges, suspects, chain, canary)
```

The dashboard renders the report; it does no scoring of its own.

## 5. Data classification

| Data | Where it lives | Who can read it |
|---|---|---|
| Real user identifiers | ERP only (directory and custodian map) | ERP admin |
| HMAC key | ERP environment only | ERP operator |
| Pseudonymized actors, service names, data ids | Tracer database | Anyone with the read key |
| Canary tokens | ERP (derived) and tracer (registered) | Tracer operator |
| Student and fee records | ERP only | ERP users |

The tracer holds no personal data beyond opaque tokens and record ids.

## 6. Trust boundaries and security

| Zone | Contents | Secret held |
|---|---|---|
| **Custodian zone** (yours) | ERP, real identities | `HMAC_KEY`, `ADMIN_KEY`, plus the shared `INGEST_KEY` |
| **Analyst zone** (yours) | Dashboard in the browser | Read key and admin key, typed per session and held in memory only |

Controls: pseudonymization happens before data leaves the ERP; the HMAC key never leaves the ERP and is never sent to the tracer; identity reveal is a separate admin-keyed ERP endpoint; keys are compared in constant time; CORS allows only the dashboard origin.

## 7. Platform constraints and the response

| Constraint (Vercel functions) | Response |
|---|---|
| Read-only filesystem apart from ephemeral `/tmp` | The ERP only reads its in-memory demo data and never writes files |
| A function can be frozen after the response is sent | `waitUntil` around the tracer call |
| Each server has a separate origin | Explicit CORS and URL configuration through env vars |
| Deployment Protection can block server-to-server calls | Use production domains or the bypass header; covered in the checklist |

## 8. Failure modes in your scope

| Failure | Behavior | Evidence impact |
|---|---|---|
| Tracer unreachable | ERP responds normally; send retried 3 times, then logged as `TRACE_FAILED` | Events lost from the log; visible only in ERP runtime logs |
| Duplicate delivery (retry) | Tracer ignores repeated `event_id` | None |
| Wrong or missing key | `401` | None |
| Missing ERP env var | ERP fails at load with the variable name | None |

## 9. Technology stack

| Layer | Choice |
|---|---|
| Main service | Node.js, Express |
| Frontend | HTML, Cytoscape.js |
| Hosting | Three Vercel projects |
| Crypto | SHA-256, HMAC-SHA-256 |

## 10. Architectural limitations

- Delivery from the ERP is best effort. A durable outbox or queue would close the gap for events that fail all retries.
- Identity in the ERP is a header, a prototype stand-in for a real session.
- The dashboard keeps keys in memory for the session only; there is no login or role system.

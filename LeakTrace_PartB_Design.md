# Part B Design: ERP and Dashboard

**Audience:** Agent B  **Related:** `LeakTrace_CONTRACT.md` (interface, shared) and `LeakTrace_PartB_ERP_Dashboard.md` (build guide), and `LeakTrace_PartB_Architecture.md`. Agent A builds the tracer in parallel against the contract.

## 1. Goals and non-goals

| Goals | Non-goals |
|---|---|
| Attribute a leak to the most probable source despite missing logs | Prove guilt (output is a ranked likelihood) |
| Keep investigators away from real identities | Prevent leaks or detect them live |
| Make log tampering visible and locatable | Stop a determined attacker with full database access |
| Be deployable on Vercel without connectivity surprises | Production-grade authentication, queues, or scale |
| Be explainable: every suspect gets a human-readable reason | Calibrated statistical probabilities |

## 2. Key design decisions (ERP and dashboard relevant)

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Two separate services joined by a small HTTP contract | One monolith | Two agents can build in parallel; the tracer can later attach to any main service |
| 2 | ERP pseudonymizes before sending | Tracer pseudonymizes | The tracer never holds identities, so the privacy claim is structural |
| 3 | HMAC with a secret key for pseudonyms | Plain hash | Without the key, tokens cannot be guessed or reversed from known identifiers |
| 6 | Batch ingest with `event_id` idempotency | One request per event, no dedupe | Preserves order within a request and makes retries safe |
| 7 | `waitUntil` plus retries, fail open | Block the response on the tracer | Tracing must never break or slow the main service |
| 9 | Canary tokens as a second, independent signal | Log analysis only | Works from the leaked data itself even when logs are damaged |
| 12 | Static dashboard as its own project | Served by the tracer | Avoids bundling assumptions and keeps CORS explicit |

## 3. ERP design

### 3.1 Modules as services

One Express app, three logical services named `svc_students`, `svc_fees`, `svc_export`. Module-to-module data movement is modelled as `transfer` events, which gives the graph real service-to-service edges to reason about.

### 3.2 Identity and pseudonymization

- Prototype identity: the `x-user-id` header, accepted only for known demo users.
- `pseudonym = "p_" + first 10 hex of HMAC(HMAC_KEY, "user:" + id)`. The same user always maps to the same token, so graph analysis still works.
- Service names stay plain because they are not personal data.

### 3.3 Event emission

Handlers build their events as an array and hand it to `flush`, which sends one batch through `waitUntil`. The send uses a 4 second timeout and up to three attempts with a short growing delay; because each event carries a UUID, retries cannot duplicate evidence. After the final failure the batch is written to the runtime log as `TRACE_FAILED` and the request is unaffected.

### 3.4 Canary planting

`token = "tok_" + first 6 hex of HMAC(HMAC_KEY, "canary:" + service)`. The export module adds `note_ref: "<token>@trap.test"` to the record it returns. An admin endpoint registers all tokens with the tracer after each deployment.

### 3.5 Custodian

`GET /custodian/reveal` rebuilds the pseudonym-to-user map from the demo directory and returns it only for a valid admin key. This is the only place identities can be recovered.

### 3.6 Demo exposure

`POST /leak/:id` stands in for a misconfigured publish: it emits a `publish` event from `svc_export` to `public_bucket` and returns the leaked copy, including its canary token.

## 4. Dashboard design

| Panel | Data source | Encoding |
|---|---|---|
| Summary cards | `suspects[0]`, `chain.gaps`, `canary` | Top suspect, confidence, missing-event count, canary owner |
| Provenance graph | `nodes`, `edges`, `suspects` | Node size and red intensity by probability; solid edge observed, dashed edge inferred; orange path from the top suspect to the exposure node |
| Ranked suspects | `suspects` | Sorted rows with probability bars and a canary tag |
| Reasoning | `suspects[].why` | Shown on click of a row or node |
| Evidence integrity | `chain` | Gap location and missing count, or an intact notice |
| Custodian toggle | ERP reveal map | Replaces pseudonyms with names in the browser only |

Design rules: one configuration object holds the tracer and ERP URLs; keys are typed per session and kept in memory; any non-200 response from the tracer shows its status and message instead of a blank page; colors are theme tokens so the page works in light and dark mode.

## 5. Data schemas

**Event** (ERP to tracer): `event_id` (uuid), `ts` (unix seconds), `actor`, `action`, `target`, `data_id` (nullable), `status` (default 200). You produce these.

**Report** (tracer to dashboard): `case`, `leak`, `chain {events, gaps[{after, missing, between[2]}], edited_seqs}`, `canary {token, owner} | null`, `nodes[{id}]`, `edges[{s, t, inferred}]`, `suspects[{id, p, why}]`. You consume this.

**Reveal map** (ERP to dashboard): `{ "<pseudonym>": "<real user id>" }`.

Full examples are in the contract.

## 6. Delivery and idempotency

- Each event carries a UUID, so retries cannot duplicate evidence on the tracer.
- Events in one request are sent as one ordered batch.
- The send never blocks the client response and never throws into the request; after the final failed attempt the batch is logged as `TRACE_FAILED`.

## 7. Security design (ERP and dashboard relevant)

| Threat | Mitigation |
|---|---|
| Investigator learns real identities | Pseudonymized at the ERP; identities exist only in the ERP; reveal needs the admin key |
| Forged events injected into evidence | Ingest endpoint requires `x-ingest-key` |
| Cross-site abuse of the dashboard APIs | CORS limited to one origin; keys required on every protected call |
| Tracer outage used to suppress tracing | Fail-open by design, so outage is visible only in logs; a durable outbox is future work |
| Pseudonym reversal | Keyed HMAC; the key never leaves the ERP |

## 8. Testing strategy (ERP and dashboard relevant)

| Level | Approach |
|---|---|
| ERP alone | Local run against a mock tracer that enforces the contract's keys and shapes |
| Dashboard alone | Renders the mock tracer's canned report |
| Integration | Deployed connectivity checklist, then the end-to-end demo script |

## 9. Extensibility

- Replace the ERP with any service that can POST the event schema; the tracer is service-agnostic.
- Add a durable outbox in the ERP for events that fail all retries.
- Add real authentication so the actor comes from a session instead of a header.

## 10. Known weaknesses

- The header identity can be set by anyone, so it must not be trusted as evidence in a real deployment.
- Events that fail all retries exist only in the runtime log.
- A stripped canary token removes the second signal; the dashboard still shows the log-based ranking.
- The dashboard shows whatever the tracer returns; correctness of ranking is the tracer's responsibility.

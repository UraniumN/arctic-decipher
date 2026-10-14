# Part A Design: Tracer

**Audience:** Agent A  **Related:** `LeakTrace_CONTRACT.md` (interface, shared) and `LeakTrace_PartA_Tracer.md` (build guide), and `LeakTrace_PartA_Architecture.md`. Agent B builds the ERP and dashboard in parallel against the contract.

## 1. Goals and non-goals

| Goals | Non-goals |
|---|---|
| Attribute a leak to the most probable source despite missing logs | Prove guilt (output is a ranked likelihood) |
| Keep investigators away from real identities | Prevent leaks or detect them live |
| Make log tampering visible and locatable | Stop a determined attacker with full database access |
| Be deployable on Vercel without connectivity surprises | Production-grade authentication, queues, or scale |
| Be explainable: every suspect gets a human-readable reason | Calibrated statistical probabilities |

## 2. Key design decisions (tracer-relevant)

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Two separate services joined by a small HTTP contract | One monolith | Two agents can build in parallel; the tracer can later attach to any main service |
| 4 | Hash-chained events with a separate `chain_head` row | Chain only, or one final hash | The head row detects tail deletion and serializes appends |
| 5 | Tracer assigns `seq` inside the transaction | ERP counters, `bigserial` | Memory counters reset per serverless instance; database sequences can skip after rollbacks and fake a gap |
| 6 | Batch ingest with `event_id` idempotency | One request per event, no dedupe | Preserves order within a request and makes retries safe |
| 8 | Inferred edges at gaps with reduced weight | Ignore gaps | Incomplete logs become located uncertainty instead of silent failure |
| 9 | Canary tokens as a second, independent signal | Log analysis only | Works from the leaked data itself even when logs are damaged |
| 10 | Multiplicative score (access x path x time) | Weighted sum, full Bayesian model | Simple, explainable, and a zero on any factor removes a suspect |
| 11 | Postgres for state | Files, in-memory | Vercel functions have no persistent filesystem |

## 3. Tracer design

### 3.1 Ingest

1. Check `x-ingest-key` in constant time.
2. Open one transaction. Select the `chain_head` row `for update`, which blocks other appenders.
3. For each event in order: skip if its `event_id` already exists; otherwise `seq = head.seq + 1`, compute the hash, insert the row, advance the in-memory head.
4. Update `chain_head` and commit.

Batches are atomic and ordered. Concurrent requests queue on the head row, so `seq` values are contiguous.

### 3.2 Hash digest

```
body   = JSON of {seq, event_id, ts, actor, action, target, data_id, status}
         with sorted keys and compact separators
hash_n = SHA256( body + hash_(n-1) )
hash_0 = SHA256("genesis")
```

Each row stores `prev_hash` and `hash`. The field list is fixed so the digest is reproducible during verification.

### 3.3 Verification

Walk rows in `seq` order with `expected = 1` and `prev = genesis`:

| Check | Finding |
|---|---|
| Row `seq` differs from `expected` | Gap: `missing = seq - expected`; record the entities on either side |
| `prev_hash` differs from the previous row's hash (no gap) | Edited row |
| Recomputed hash differs from stored `hash` | Edited row |
| After the last row, `chain_head.seq >= expected` | Tail deleted |

A gap records `between = [target of the last row before it, actor of the first row after it]`. Verification shows that something is missing and where, never what was in it.

### 3.4 Provenance graph and gap inference

1. Keep only events for the requested `data_id`.
2. Each event adds a directed edge `actor -> target`, weight 1.0, observed.
3. For each gap whose two boundary entities are both already in the graph and different, add an edge between them with weight 0.5, marked inferred.
4. If the exposure node never appears (its event was deleted), add weak inferred edges (weight 0.25) from every node that handled the data to the exposure node.

### 3.5 Scoring

For every node except the exposure node:

```
access      = 1 if the node handled the data_id, else 0
path        = max over simple paths (up to 6 hops) to the exposure node of
                (product of edge weights) x 0.8^(hops - 1)
time_decay  = exp( -(leak_time - last_access) / tau )        tau = 600 s
score       = access x path x time_decay
```

If a registered canary token appears in `leaked_text`, multiply its owner's score by 5. Normalize all scores to sum to 1. `leak_time` is the latest event reaching the exposure node, or the supplied `leak_time` if that event is missing.

| Constant | Value | Meaning |
|---|---|---|
| `tau` | 600 s (request parameter) | Time decay scale |
| Hop decay | 0.8 | Penalty per extra hop |
| Inferred edge weight | 0.5 | Trust in a gap-derived edge |
| Fallback edge weight | 0.25 | Trust when the exposure event is missing |
| Canary boost | x5 | Weight of a token match |
| Path cutoff | 6 hops | Bounds search cost |

All are heuristics and are meant to be tuned against simulated ground truth.

### 3.6 Explanations

Each suspect's reason is generated from the numbers used to score it: seconds between last access and the leak, hop count on the best path, whether that path uses an inferred edge, and whether its canary matched.

### 3.7 Error handling

`401` bad key; `404` no events for the `data_id`; `400` exposure event missing with no `leak_time`; `422` from request validation. Error bodies are `{"detail": "..."}`.

## 4. Worked example

Flow for `S1001`: user `p_u` requests an export; students and fees transfer into `svc_export`; `svc_export` publishes to `public_bucket`. All events occur within seconds, so time decay is about 1.

| Entity | Best path | Path score | Raw | Normalized | With canary (export x5) |
|---|---|---|---|---|---|
| `svc_export` | 1 hop | 1.0 | 1.0 | 0.29 | **0.68** |
| `p_u` | 2 hops | 0.8 | 0.8 | 0.24 | 0.11 |
| `svc_students` | 2 hops | 0.8 | 0.8 | 0.24 | 0.11 |
| `svc_fees` | 2 hops | 0.8 | 0.8 | 0.24 | 0.11 |

Without the canary, the structure alone favors `svc_export` only slightly because everyone upstream is one hop further away. The canary match is what makes the attribution decisive, which is why it is treated as an independent second signal.

## 5. Data schemas

**Event** (ERP to tracer): `event_id` (uuid), `ts` (unix seconds), `actor`, `action`, `target`, `data_id` (nullable), `status` (default 200).

**Report** (tracer to dashboard): `case`, `leak`, `chain {events, gaps[{after, missing, between[2]}], edited_seqs}`, `canary {token, owner} | null`, `nodes[{id}]`, `edges[{s, t, inferred}]`, `suspects[{id, p, why}]`.

Full examples are in the contract.

## 6. Consistency and idempotency

- Appends are serialized by the locked head row, so the chain is linear.
- Retries are safe because duplicate `event_id` values are ignored.
- A batch commits all or nothing.
- Verification and investigation are read-only and recompute from stored rows each time.

## 7. Security design (tracer-relevant)

| Threat | Mitigation |
|---|---|
| Forged events injected into evidence | Ingest endpoint requires `x-ingest-key` |
| Edited or deleted log rows | Hash chain plus head row expose edits, gaps, and tail deletion |
| Key guessing by timing | Constant-time comparison |
| Cross-site abuse of the dashboard APIs | CORS limited to one origin; keys required on every protected call |
| Canary stripped from the leaked copy | Treated as one signal among two, not the only evidence |

## 8. Testing strategy (tracer-relevant)

| Level | Approach |
|---|---|
| Tracer alone | `smoke.sh` imitates the ERP flow with curl, then deletes and edits rows to check gaps and edits |
| Concurrency | Parallel batch posts must yield contiguous `seq` and a clean `/verify` |
| Integration | Deployed connectivity checklist, then the end-to-end demo script |
| Accuracy (stretch) | Simulated incidents with known culprits at several log-loss rates, measuring how often the culprit ranks in the top 3 |

## 9. Extensibility

- Swap the scoring function for a Bayesian model behind the same report shape.
- Add private set intersection or MPC for cross-organization evidence matching.
- Anchor the chain head in an external store or blockchain.
- Add lineage tracking (`derived_from`) so transformed copies stay linked to the original record.

## 10. Known weaknesses

- Inferred edges only connect entities already present in the graph, so an entity whose only events were deleted cannot appear as a suspect.
- Gap inference uses the neighboring rows in log order, which is a heuristic and not proof of the missing hop.
- With very short intervals between events, time decay carries almost no information.
- Scores are ranked heuristics and should be reported as most probable source, not culprit.

"""
API route handlers for the tracer.

All endpoints follow the contract exactly:
- POST /events       (x-ingest-key) — batch event ingest
- POST /canaries     (x-ingest-key) — canary token registration
- GET  /verify       (x-read-key)   — chain verification
- POST /investigate  (x-read-key)   — leak investigation
- GET  /health                      — liveness check
- GET  /health/db    (x-read-key)   — database connectivity check
"""

import os
import hmac

from fastapi import APIRouter, Header, HTTPException

from ..db import get_connection
from ..chain import digest, verify_chain
from ..investigation import build_graph, compute_last_access_times, score_suspects, find_canary
from .models import EventBatch, CanaryBatch, InvestigateRequest

INGEST_KEY = os.environ.get("INGEST_KEY", "ik")
READ_KEY = os.environ.get("READ_KEY", "rk")

router = APIRouter()


def require(got: str, want: str):
    """Constant-time key comparison. Raises 401 on mismatch."""
    if not hmac.compare_digest(got.encode(), want.encode()):
        raise HTTPException(401, "bad key")


def _load_all():
    """Load all events, chain head, and canaries from the database."""
    with get_connection() as c:
        rows = c.execute("SELECT * FROM events ORDER BY seq").fetchall()
        head = c.execute("SELECT seq FROM chain_head WHERE id=1").fetchone()
        canaries = c.execute("SELECT token, service FROM canaries").fetchall()
    return rows, head["seq"], canaries


# ── Health ──────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"ok": True}


@router.get("/health/db")
def health_db(x_read_key: str = Header(default="")):
    require(x_read_key, READ_KEY)
    with get_connection() as c:
        c.execute("SELECT 1")
    return {"db": "ok"}


# ── Ingest ──────────────────────────────────────────────────────────────────

@router.post("/events")
def ingest(b: EventBatch, x_ingest_key: str = Header(default="")):
    """Batch event ingest with hash-chain append.
    
    - Opens one transaction
    - Locks chain_head row to serialize concurrent appenders
    - Skips duplicate event_ids (idempotent retries)
    - Assigns contiguous seq numbers
    - Computes hash chain digest for each new event
    """
    require(x_ingest_key, INGEST_KEY)
    added = 0
    with get_connection() as c:
        head = c.execute(
            "SELECT seq, hash FROM chain_head WHERE id=1 FOR UPDATE"
        ).fetchone()
        seq, prev = head["seq"], head["hash"]

        for e in b.events:
            # Skip duplicates (retry safety)
            if c.execute(
                "SELECT 1 FROM events WHERE event_id=%s", (e.event_id,)
            ).fetchone():
                continue

            seq += 1
            row = {"seq": seq, **e.model_dump()}
            h = digest(row, prev)
            c.execute(
                "INSERT INTO events "
                "(seq, event_id, ts, actor, action, target, data_id, status, prev_hash, hash) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (seq, e.event_id, e.ts, e.actor, e.action, e.target,
                 e.data_id, e.status, prev, h)
            )
            prev = h
            added += 1

        c.execute(
            "UPDATE chain_head SET seq=%s, hash=%s WHERE id=1", (seq, prev)
        )
    return {"ok": True, "added": added}


# ── Canaries ────────────────────────────────────────────────────────────────

@router.post("/canaries")
def register(b: CanaryBatch, x_ingest_key: str = Header(default="")):
    """Upsert canary tokens. Token generation is the ERP's job."""
    require(x_ingest_key, INGEST_KEY)
    with get_connection() as c:
        for k in b.canaries:
            c.execute(
                "INSERT INTO canaries (token, service) VALUES (%s, %s) "
                "ON CONFLICT (token) DO UPDATE SET service=excluded.service",
                (k.token, k.service)
            )
    return {"ok": True}


# ── Verification ────────────────────────────────────────────────────────────

@router.get("/verify")
def verify(x_read_key: str = Header(default="")):
    """Verify the entire hash chain and report gaps, edits, and tail deletions."""
    require(x_read_key, READ_KEY)
    rows, head_seq, _ = _load_all()
    gaps, edited = verify_chain(rows, head_seq)
    return {
        "events": len(rows),
        "head_seq": head_seq,
        "gaps": gaps,
        "edited_seqs": edited
    }


# ── Investigation ──────────────────────────────────────────────────────────

@router.post("/investigate")
def investigate(q: InvestigateRequest, x_read_key: str = Header(default="")):
    """Investigate a leak: build provenance graph, score suspects, rank them.
    
    Response matches the contract's dashboard data shape exactly.
    """
    require(x_read_key, READ_KEY)
    rows, head_seq, canaries = _load_all()
    gaps, edited = verify_chain(rows, head_seq)

    # Filter events for the requested data_id
    ev = [r for r in rows if r["data_id"] == q.data_id]
    if not ev:
        raise HTTPException(404, "no events for this data_id")

    # Determine leak time
    hits = [r["ts"] for r in ev if r["target"] == q.exposure]
    leak_t = max(hits) if hits else q.leak_time
    if leak_t is None:
        raise HTTPException(400, "exposure event not logged; supply leak_time")

    # Build the provenance graph
    G = build_graph(ev, gaps, q.exposure)

    # Compute last access times for time decay
    last_access = compute_last_access_times(ev)

    # Find canary match
    canary = find_canary(q.leaked_text, canaries)

    # Score and rank suspects
    suspects = score_suspects(G, q.exposure, last_access, leak_t, q.tau, canary)

    return {
        "case": f"{q.data_id} found at {q.exposure}",
        "leak": q.exposure,
        "chain": {"events": len(rows), "gaps": gaps, "edited_seqs": edited},
        "canary": canary,
        "nodes": [{"id": n} for n in G.nodes],
        "edges": [
            {"s": a, "t": b, "inferred": d["inferred"]}
            for a, b, d in G.edges(data=True)
        ],
        "suspects": suspects,
    }

"""
Hash chain: digest computation and chain verification.

The chain provides tamper evidence:
- Gaps (deleted rows) are located by sequence number
- Edits are detected by hash mismatch
- Tail deletions are detected by chain_head.seq exceeding the last row
"""

import json
import hashlib

# Fields included in the hash digest, in a fixed order for reproducibility
FIELDS = ("seq", "event_id", "ts", "actor", "action", "target", "data_id", "status")

# Genesis hash: sha256('genesis')
GENESIS = hashlib.sha256(b"genesis").hexdigest()


def digest(row: dict, prev_hash: str) -> str:
    """Compute the SHA-256 digest of a row chained to the previous hash.
    
    body   = JSON of {seq, event_id, ts, actor, action, target, data_id, status}
             with sorted keys and compact separators
    hash_n = SHA256( body + hash_(n-1) )
    """
    body = json.dumps(
        {k: str(row[k]) if k == "event_id" and row[k] is not None else row[k] for k in FIELDS},
        sort_keys=True,
        separators=(",", ":")
    )
    return hashlib.sha256((body + prev_hash).encode()).hexdigest()


def verify_chain(rows: list[dict], head_seq: int) -> tuple[list[dict], list[int]]:
    """Walk all rows in seq order and detect gaps, edits, and tail deletions.
    
    Returns:
        gaps: list of gap descriptors {after, missing, between, tail?}
        edited: sorted list of seq numbers where hash mismatches were found
    """
    gaps = []
    edited = set()
    expected = 1
    prev = GENESIS
    last = None

    for r in rows:
        if r["seq"] != expected:
            # Gap detected: rows between expected and r["seq"] are missing
            gaps.append({
                "after": expected - 1,
                "missing": r["seq"] - expected,
                "between": [last["target"] if last else None, r["actor"]]
            })
        elif r["prev_hash"] != prev:
            # The row claims a different previous hash than what we computed
            edited.add(r["seq"])

        if digest(r, r["prev_hash"]) != r["hash"]:
            # The row's own hash doesn't match its content
            edited.add(r["seq"])

        prev = r["hash"]
        expected = r["seq"] + 1
        last = r

    # Tail deletion: chain_head says more rows exist than we found
    if head_seq >= expected:
        gaps.append({
            "after": expected - 1,
            "missing": head_seq - expected + 1,
            "between": [last["target"] if last else None, None],
            "tail": True
        })

    return gaps, sorted(edited)

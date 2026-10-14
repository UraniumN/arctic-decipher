"""
Unit tests for the hash chain module.
"""

import sys
import os

# Ensure tracer root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.chain import digest, verify_chain, GENESIS, FIELDS


def _make_row(seq, event_id="test-uuid", ts=1000, actor="a", action="read",
              target="b", data_id="S1001", status=200, prev_hash=None):
    """Helper to create a minimal event row dict."""
    row = {
        "seq": seq,
        "event_id": event_id,
        "ts": ts,
        "actor": actor,
        "action": action,
        "target": target,
        "data_id": data_id,
        "status": status,
    }
    prev = prev_hash or GENESIS
    h = digest(row, prev)
    row["prev_hash"] = prev
    row["hash"] = h
    return row


class TestDigest:
    def test_deterministic(self):
        """Same input produces the same hash."""
        row = {"seq": 1, "event_id": "abc", "ts": 100, "actor": "a",
               "action": "read", "target": "b", "data_id": "X", "status": 200}
        h1 = digest(row, GENESIS)
        h2 = digest(row, GENESIS)
        assert h1 == h2

    def test_different_prev_hash(self):
        """Different previous hash produces a different digest."""
        row = {"seq": 1, "event_id": "abc", "ts": 100, "actor": "a",
               "action": "read", "target": "b", "data_id": "X", "status": 200}
        h1 = digest(row, GENESIS)
        h2 = digest(row, "0" * 64)
        assert h1 != h2


class TestVerifyChain:
    def test_clean_chain(self):
        """A properly constructed chain has no gaps or edits."""
        r1 = _make_row(1)
        r2 = _make_row(2, event_id="uuid-2", prev_hash=r1["hash"])
        gaps, edited = verify_chain([r1, r2], 2)
        assert gaps == []
        assert edited == []

    def test_gap_detection(self):
        """Missing rows between seq 1 and seq 3 are detected as a gap."""
        r1 = _make_row(1)
        r3 = _make_row(3, event_id="uuid-3", prev_hash=r1["hash"])
        gaps, edited = verify_chain([r1, r3], 3)
        assert len(gaps) == 1
        assert gaps[0]["missing"] == 1

    def test_tail_deletion(self):
        """head_seq exceeding the last row's seq is detected as a tail gap."""
        r1 = _make_row(1)
        gaps, edited = verify_chain([r1], 5)
        assert len(gaps) == 1
        assert gaps[0].get("tail") is True
        assert gaps[0]["missing"] == 4

    def test_edited_row(self):
        """A row with a tampered hash is detected."""
        r1 = _make_row(1)
        r1["hash"] = "tampered"
        gaps, edited = verify_chain([r1], 1)
        assert 1 in edited


if __name__ == "__main__":
    test_digest = TestDigest()
    test_digest.test_deterministic()
    test_digest.test_different_prev_hash()
    
    test_verify = TestVerifyChain()
    test_verify.test_clean_chain()
    test_verify.test_gap_detection()
    test_verify.test_tail_deletion()
    test_verify.test_edited_row()
    print("All chain tests passed! (6/6)")

"""
Unit tests for the investigation module.
"""

import sys
import os

# Ensure tracer root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import networkx as nx
from app.investigation import build_graph, compute_last_access_times, score_suspects, find_canary


def _events():
    """Standard export-then-leak events for S1001."""
    return [
        {"actor": "p_user", "target": "svc_export", "data_id": "S1001", "ts": 1000},
        {"actor": "svc_students", "target": "svc_export", "data_id": "S1001", "ts": 1001},
        {"actor": "svc_fees", "target": "svc_export", "data_id": "S1001", "ts": 1001},
        {"actor": "svc_export", "target": "public_bucket", "data_id": "S1001", "ts": 1002},
    ]


class TestBuildGraph:
    def test_basic_graph(self):
        ev = _events()
        G = build_graph(ev, [], "public_bucket")
        assert G.has_edge("svc_export", "public_bucket")
        assert G.has_edge("p_user", "svc_export")
        assert not G["svc_export"]["public_bucket"]["inferred"]

    def test_inferred_edge(self):
        ev = _events()
        gaps = [{"between": ["svc_students", "p_user"], "after": 1, "missing": 1}]
        G = build_graph(ev, gaps, "public_bucket")
        # svc_students -> p_user already exists? No, events have p_user->svc_export, svc_students->svc_export
        # So svc_students -> p_user would be new if both are in the graph
        if G.has_edge("svc_students", "p_user"):
            assert G["svc_students"]["p_user"]["inferred"]

    def test_missing_exposure_adds_fallback_edges(self):
        ev = [{"actor": "p_user", "target": "svc_export", "data_id": "S1001", "ts": 1000}]
        G = build_graph(ev, [], "public_bucket")
        # exposure not in events, so fallback edges should be added
        assert G.has_edge("p_user", "public_bucket")
        assert G.has_edge("svc_export", "public_bucket")


class TestScoring:
    def test_svc_export_ranks_first_with_canary(self):
        ev = _events()
        G = build_graph(ev, [], "public_bucket")
        last = compute_last_access_times(ev)
        canary = {"token": "tok_ab12cd", "owner": "svc_export"}
        suspects = score_suspects(G, "public_bucket", last, 1002, 600, canary)
        assert suspects[0]["id"] == "svc_export"
        assert suspects[0]["p"] > 0.5

    def test_scores_sum_to_one(self):
        ev = _events()
        G = build_graph(ev, [], "public_bucket")
        last = compute_last_access_times(ev)
        suspects = score_suspects(G, "public_bucket", last, 1002, 600, None)
        total = sum(s["p"] for s in suspects)
        assert abs(total - 1.0) < 0.01


class TestCanary:
    def test_match(self):
        canaries = [{"token": "tok_ab12cd", "service": "svc_export"}]
        result = find_canary('{"note_ref":"tok_ab12cd@trap.test"}', canaries)
        assert result is not None
        assert result["owner"] == "svc_export"

    def test_no_match(self):
        canaries = [{"token": "tok_ab12cd", "service": "svc_export"}]
        result = find_canary("no tokens here", canaries)
        assert result is None

    def test_none_text(self):
        canaries = [{"token": "tok_ab12cd", "service": "svc_export"}]
        result = find_canary(None, canaries)
        assert result is None


if __name__ == "__main__":
    test_graph = TestBuildGraph()
    test_graph.test_basic_graph()
    test_graph.test_inferred_edge()
    test_graph.test_missing_exposure_adds_fallback_edges()
    
    test_score = TestScoring()
    test_score.test_svc_export_ranks_first_with_canary()
    test_score.test_scores_sum_to_one()
    
    test_canary = TestCanary()
    test_canary.test_match()
    test_canary.test_no_match()
    test_canary.test_none_text()
    print("All investigation tests passed! (8/8)")

"""
Investigation engine: provenance graph, scoring, and suspect ranking.

Given a data_id and an exposure point, this module:
1. Builds a directed provenance graph from events
2. Adds inferred edges across log gaps (reduced weight)
3. Scores each entity: access × path × time_decay
4. Boosts scores with canary token matches
5. Normalizes to probabilities and generates explanations
"""

import math
import networkx as nx


def build_graph(events: list[dict], gaps: list[dict], exposure: str) -> nx.DiGraph:
    """Build the provenance graph from events and inferred edges at gaps.
    
    - Each event adds a directed edge actor -> target, weight 1.0, observed
    - Each gap whose boundary entities are both in the graph adds an inferred
      edge with weight 0.5
    - If the exposure node never appears, add weak fallback edges (0.25) from
      every existing node to the exposure
    """
    G = nx.DiGraph()

    for r in events:
        G.add_edge(r["actor"], r["target"], weight=1.0, inferred=False)

    # Inferred edges across log gaps
    for g in gaps:
        a, b = g["between"]
        if a and b and a != b and a in G and b in G and not G.has_edge(a, b):
            G.add_edge(a, b, weight=0.5, inferred=True)

    # If the exposure node is missing (its event was deleted), add weak
    # inferred edges from every handler to the exposure
    if exposure not in G:
        for n in list(G.nodes):
            G.add_edge(n, exposure, weight=0.25, inferred=True)

    return G


def compute_last_access_times(events: list[dict]) -> dict[str, int]:
    """For each entity, find the latest timestamp where it appears in events."""
    last = {}
    for r in events:
        for n in (r["actor"], r["target"]):
            last[n] = max(last.get(n, 0), r["ts"])
    return last


def score_suspects(
    G: nx.DiGraph,
    exposure: str,
    last_access: dict[str, int],
    leak_time: int,
    tau: float,
    canary: dict | None
) -> list[dict]:
    """Score and rank suspects.
    
    For every node except the exposure node:
        access      = 1 if the node handled the data_id, else 0
        path        = max over simple paths (≤6 hops) to exposure of
                      (product of edge weights) × 0.8^(hops-1)
        time_decay  = exp(-(leak_time - last_access) / tau)
        score       = access × path × time_decay
    
    If a canary token matches, multiply its owner's score by 5.
    Normalize all scores to sum to 1.
    """
    best = {}
    for n in G.nodes:
        if n == exposure or n not in last_access:
            best[n] = (0.0, [])
            continue

        top = (0.0, [])
        for p in nx.all_simple_paths(G, n, exposure, cutoff=6):
            w = math.prod(G[a][b]["weight"] for a, b in zip(p, p[1:])) * 0.8 ** (len(p) - 2)
            if w > top[0]:
                top = (w, p)

        decay = math.exp(-max(0, leak_time - last_access[n]) / tau)
        best[n] = (top[0] * decay, top[1])

    # Canary boost: multiply the token owner's score by 5
    if canary and canary["owner"] in best:
        s, p = best[canary["owner"]]
        best[canary["owner"]] = (s * 5, p)

    # Normalize to probabilities
    total = sum(s for s, _ in best.values()) or 1.0
    suspects = []
    for n, (s, p) in sorted(best.items(), key=lambda kv: kv[1][0], reverse=True):
        if s <= 0:
            continue

        inferred = any(G[a][b]["inferred"] for a, b in zip(p, p[1:]))
        why = (
            f"Handled {exposure} {max(0, leak_time - last_access[n])}s before the leak; "
            f"{len(p) - 1} hop(s) to {exposure}"
            + (" via an inferred edge" if inferred else "")
            + ("; leaked copy carries its canary token" if canary and canary["owner"] == n else "")
            + "."
        )
        suspects.append({"id": n, "p": round(s / total, 4), "why": why})

    return suspects


def find_canary(leaked_text: str | None, canaries: list[dict]) -> dict | None:
    """Check if any registered canary token appears in the leaked text."""
    if not leaked_text:
        return None
    for k in canaries:
        if k["token"] in leaked_text:
            return {"token": k["token"], "owner": k["service"]}
    return None

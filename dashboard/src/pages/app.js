/**
 * LeakTrace Dashboard — Main Application Logic
 *
 * Orchestrates the UI: configuration, connection testing,
 * investigation, verification, graph rendering, and custodian reveal.
 */

import { client } from "../api/client.js";
import { ProvenanceGraph } from "../components/graph.js";

// ── State ───────────────────────────────────────────────────────────────────

let connected = false;
let graph = null;
let lastReport = null;

// ── DOM References ──────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const els = {
  tracerUrl: $("tracer-url"),
  erpUrl: $("erp-url"),
  readKey: $("read-key"),
  adminKey: $("admin-key"),
  btnConnect: $("btn-connect"),
  btnInvestigate: $("btn-investigate"),
  btnVerify: $("btn-verify"),
  btnReveal: $("btn-reveal"),
  statusDot: $("status-indicator"),
  statusText: $("status-text"),
  dataId: $("data-id"),
  exposure: $("exposure"),
  leakedText: $("leaked-text"),
  resultsArea: $("results-area"),
  revealPanel: $("reveal-panel"),
  chainEvents: $("chain-events"),
  chainGaps: $("chain-gaps"),
  chainEdited: $("chain-edited"),
  chainDetails: $("chain-details"),
  canaryResult: $("canary-result"),
  suspectsList: $("suspects-list"),
  revealResult: $("reveal-result"),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function setStatus(state, text) {
  els.statusDot.className = `status-dot ${state}`;
  els.statusText.textContent = text;
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="loading"><span></span><span></span><span></span></span>';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

// ── Connect & Verify ────────────────────────────────────────────────────────

async function connect() {
  const config = {
    tracerUrl: els.tracerUrl.value,
    erpUrl: els.erpUrl.value,
    readKey: els.readKey.value,
    adminKey: els.adminKey.value,
  };

  if (!config.tracerUrl || !config.readKey) {
    toast("Tracer URL and Read Key are required", "error");
    return;
  }

  client.configure(config);
  setStatus("checking", "Connecting...");
  setLoading(els.btnConnect, true);

  try {
    // Test tracer health
    await client.healthTracer();

    // Test database connectivity
    await client.healthDb();

    connected = true;
    setStatus("online", "Connected");
    toast("Connected to tracer", "success");

    // Enable investigation buttons
    els.btnInvestigate.disabled = false;
    els.btnVerify.disabled = false;
    els.btnReveal.disabled = !config.adminKey;

    // Show results area and reveal panel
    els.resultsArea.style.display = "grid";
    els.revealPanel.style.display = "block";

    // Initialize graph
    if (!graph) {
      graph = new ProvenanceGraph("graph-canvas");
    }
  } catch (err) {
    connected = false;
    setStatus("offline", "Connection failed");
    toast(`Connection failed: ${err.message}`, "error");
  } finally {
    setLoading(els.btnConnect, false);
  }
}

// ── Chain Verification ──────────────────────────────────────────────────────

async function verifyChain() {
  if (!connected) return;
  setLoading(els.btnVerify, true);

  try {
    const result = await client.verify();
    renderChainStatus(result);
    toast("Chain verified", "success");
  } catch (err) {
    toast(`Verify failed: ${err.message}`, "error");
  } finally {
    setLoading(els.btnVerify, false);
  }
}

function renderChainStatus(chain) {
  els.chainEvents.textContent = chain.events;
  els.chainEvents.className = "stat-value";

  const gapCount = chain.gaps ? chain.gaps.length : 0;
  els.chainGaps.textContent = gapCount;
  els.chainGaps.className = `stat-value ${gapCount > 0 ? "danger" : "clean"}`;

  const editCount = chain.edited_seqs ? chain.edited_seqs.length : 0;
  els.chainEdited.textContent = editCount;
  els.chainEdited.className = `stat-value ${editCount > 0 ? "danger" : "clean"}`;

  // Gap details
  let details = "";
  if (chain.gaps && chain.gaps.length > 0) {
    details += '<div style="margin-top: 0.75rem;">';
    for (const g of chain.gaps) {
      details += `<div class="stat-row" style="margin-top: 0.35rem;">
        <span class="stat-label">${g.tail ? "Tail gap" : "Gap"} after seq ${g.after}</span>
        <span class="stat-value warn">${g.missing} missing</span>
      </div>`;
    }
    details += "</div>";
  }

  if (chain.edited_seqs && chain.edited_seqs.length > 0) {
    details += `<div class="stat-row" style="margin-top: 0.35rem;">
      <span class="stat-label">Edited sequences</span>
      <span class="stat-value danger">${chain.edited_seqs.join(", ")}</span>
    </div>`;
  }

  els.chainDetails.innerHTML = details;
}

// ── Investigation ───────────────────────────────────────────────────────────

async function investigate() {
  if (!connected) return;
  setLoading(els.btnInvestigate, true);

  try {
    const result = await client.investigate({
      dataId: els.dataId.value,
      exposure: els.exposure.value,
      leakedText: els.leakedText.value || null,
    });

    lastReport = result;
    renderChainStatus(result.chain);
    renderCanary(result.canary);
    renderSuspects(result.suspects);
    if (graph) {
      graph.setData(result.nodes, result.edges, result.suspects);
    }
    toast("Investigation complete", "success");
  } catch (err) {
    toast(`Investigation failed: ${err.message}`, "error");
  } finally {
    setLoading(els.btnInvestigate, false);
  }
}

function renderCanary(canary) {
  if (canary) {
    els.canaryResult.innerHTML = `
      <div class="canary-match">
        <span class="canary-icon">🐦</span>
        <div class="canary-info">
          <div class="canary-token">${canary.token}</div>
          <div class="canary-owner">Owner: <strong>${canary.owner}</strong></div>
        </div>
      </div>
    `;
  } else {
    els.canaryResult.innerHTML = `
      <div class="canary-none">No canary token matched in the leaked text</div>
    `;
  }
}

function renderSuspects(suspects) {
  if (!suspects || suspects.length === 0) {
    els.suspectsList.innerHTML = '<p class="muted">No suspects found</p>';
    return;
  }

  els.suspectsList.innerHTML = suspects
    .map((s, i) => {
      const rankClass = i < 3 ? `rank-${i + 1}` : "rank-other";
      const probColor =
        s.p > 0.5
          ? "var(--accent-rose)"
          : s.p > 0.2
          ? "var(--accent-amber)"
          : "var(--accent-cyan)";

      return `
        <div class="suspect-card" style="animation-delay: ${i * 0.08}s">
          <div class="suspect-rank ${rankClass}">#${i + 1}</div>
          <div class="suspect-info">
            <div class="suspect-name">${s.id}</div>
            <div class="suspect-why">${s.why}</div>
          </div>
          <div class="suspect-prob">
            <span class="prob-value" style="color: ${probColor}">${(s.p * 100).toFixed(1)}%</span>
            <span class="prob-label">probability</span>
            <div class="prob-bar">
              <div class="prob-bar-fill" style="width: ${s.p * 100}%"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ── Custodian Reveal ────────────────────────────────────────────────────────

async function reveal() {
  if (!els.adminKey.value) {
    toast("Admin key required for reveal", "error");
    return;
  }

  setLoading(els.btnReveal, true);

  try {
    const map = await client.reveal();
    const entries = Object.entries(map);

    if (entries.length === 0) {
      els.revealResult.innerHTML = '<p class="muted">No pseudonyms recorded yet</p>';
    } else {
      els.revealResult.innerHTML = `
        <table class="reveal-table">
          <thead>
            <tr><th>Pseudonym</th><th>Real Identity</th></tr>
          </thead>
          <tbody>
            ${entries
              .map(
                ([pseudo, real]) =>
                  `<tr><td>${pseudo}</td><td>${real}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;
    }
    toast("Identities revealed", "success");
  } catch (err) {
    toast(`Reveal failed: ${err.message}`, "error");
  } finally {
    setLoading(els.btnReveal, false);
  }
}

// ── Event Listeners ─────────────────────────────────────────────────────────

els.btnConnect.addEventListener("click", connect);
els.btnInvestigate.addEventListener("click", investigate);
els.btnVerify.addEventListener("click", verifyChain);
els.btnReveal.addEventListener("click", reveal);

// Allow Enter key on config fields to connect
[els.tracerUrl, els.erpUrl, els.readKey, els.adminKey].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connect();
  });
});

// Allow Enter key on investigation fields
[els.dataId, els.exposure].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && connected) investigate();
  });
});

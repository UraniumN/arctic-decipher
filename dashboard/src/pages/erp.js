import { client } from "../api/client.js";

let connected = false;

const $ = (id) => document.getElementById(id);
const els = {
  erpUrl: $("erp-url"),
  adminKey: $("admin-key"),
  statusDot: $("erp-status-indicator"),
  statusText: $("erp-status-text"),
  userId: $("erp-user-id"),
  recordId: $("erp-record-id"),
  output: $("erp-demo-output"),
  connect: $("btn-erp-connect"),
  readStudent: $("btn-read-student"),
  readFees: $("btn-read-fees"),
  exportRecord: $("btn-export-record"),
  simulateLeak: $("btn-simulate-leak"),
  registerCanaries: $("btn-register-canaries"),
  reveal: $("btn-reveal"),
  revealResult: $("reveal-result"),
};

const actionButtons = [
  els.readStudent,
  els.readFees,
  els.exportRecord,
  els.simulateLeak,
];

function toast(message, type = "info") {
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 3500);
}

function setLoading(button, loading) {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Working...";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = !connected;
  }
}

function configureClient() {
  client.configure({
    tracerUrl: "",
    erpUrl: els.erpUrl.value.trim(),
    readKey: "",
    adminKey: els.adminKey.value,
  });
}

async function connect() {
  const erpUrl = els.erpUrl.value.trim();
  if (!erpUrl) {
    toast("ERP URL is required", "error");
    return;
  }

  configureClient();
  els.statusDot.className = "status-dot checking";
  els.statusText.textContent = "Connecting...";
  setLoading(els.connect, true);

  try {
    const health = await client.healthErp();
    if (!health.ok) throw new Error("ERP health check failed");
    connected = true;
    els.statusDot.className = "status-dot online";
    els.statusText.textContent = "ERP Connected";
    actionButtons.forEach((button) => { button.disabled = false; });
    els.registerCanaries.disabled = !els.adminKey.value;
    els.reveal.disabled = !els.adminKey.value;
    toast("Connected to ERP", "success");
  } catch (error) {
    connected = false;
    els.statusDot.className = "status-dot offline";
    els.statusText.textContent = "Connection failed";
    actionButtons.forEach((button) => { button.disabled = true; });
    els.registerCanaries.disabled = true;
    els.reveal.disabled = true;
    toast(`ERP connection failed: ${error.message}`, "error");
  } finally {
    setLoading(els.connect, false);
    els.connect.disabled = false;
  }
}

async function runAction(button, action, successMessage, onSuccess) {
  if (!connected) return;
  configureClient();
  setLoading(button, true);
  els.output.textContent = "Loading...";

  try {
    const result = await action(els.recordId.value, els.userId.value);
    els.output.textContent = JSON.stringify(result, null, 2);
    if (onSuccess) onSuccess(result);
    toast(successMessage, "success");
  } catch (error) {
    els.output.textContent = error.message;
    toast(`ERP request failed: ${error.message}`, "error");
  } finally {
    setLoading(button, false);
  }
}

async function registerCanaries() {
  if (!connected) return;
  configureClient();
  setLoading(els.registerCanaries, true);
  try {
    await client.registerCanaries();
    els.output.textContent = "Canary tokens registered with the tracer.";
    toast("Canary tokens registered", "success");
  } catch (error) {
    els.output.textContent = error.message;
    toast(`Canary registration failed: ${error.message}`, "error");
  } finally {
    setLoading(els.registerCanaries, false);
  }
}

async function revealIdentities() {
  if (!connected || !els.adminKey.value) return;
  configureClient();
  setLoading(els.reveal, true);
  try {
    const identities = await client.reveal();
    const rows = Object.entries(identities);
    if (rows.length === 0) {
      els.revealResult.textContent = "No demo identities are available.";
      return;
    }
    const table = document.createElement("table");
    table.className = "reveal-table";
    table.innerHTML = "<thead><tr><th>Pseudonym</th><th>Demo identity</th></tr></thead>";
    const body = document.createElement("tbody");
    rows.forEach(([pseudo, identity]) => {
      const row = document.createElement("tr");
      const pseudoCell = document.createElement("td");
      const identityCell = document.createElement("td");
      pseudoCell.textContent = pseudo;
      identityCell.textContent = identity;
      row.append(pseudoCell, identityCell);
      body.appendChild(row);
    });
    table.appendChild(body);
    els.revealResult.replaceChildren(table);
    toast("Demo identities revealed", "success");
  } catch (error) {
    els.revealResult.textContent = error.message;
    toast(`Reveal failed: ${error.message}`, "error");
  } finally {
    setLoading(els.reveal, false);
  }
}

els.connect.addEventListener("click", connect);
els.readStudent.addEventListener("click", () =>
  runAction(els.readStudent, (id, userId) => client.readStudent(id, userId), "Student loaded")
);
els.readFees.addEventListener("click", () =>
  runAction(els.readFees, (id, userId) => client.readFees(id, userId), "Fee record loaded")
);
els.exportRecord.addEventListener("click", () =>
  runAction(els.exportRecord, (id, userId) => client.exportRecord(id, userId), "Record exported")
);
els.simulateLeak.addEventListener("click", () =>
  runAction(
    els.simulateLeak,
    (id) => client.simulateLeak(id),
    "Leak simulated; investigation details are ready on the other dashboard",
    (result) => {
      window.localStorage.setItem("leaktrace.pending-investigation", JSON.stringify({
        dataId: els.recordId.value,
        exposure: "public_bucket",
        leakedText: JSON.stringify(result.leaked, null, 2),
      }));
    }
  )
);
els.registerCanaries.addEventListener("click", registerCanaries);
els.reveal.addEventListener("click", revealIdentities);
els.adminKey.addEventListener("input", () => {
  els.registerCanaries.disabled = !connected || !els.adminKey.value;
  els.reveal.disabled = !connected || !els.adminKey.value;
});

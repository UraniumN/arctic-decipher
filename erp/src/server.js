/**
 * LeakTrace ERP — Express server entry point.
 *
 * Responsibilities:
 * - Serve fake student and fee data
 * - Pseudonymize user identities with HMAC
 * - Emit events to the tracer on every data access
 * - Generate and register canary tokens
 * - Provide custodian reveal (pseudonym → real identity)
 */

const express = require("express");
const cors = require("cors");
const { pseudonymize, getCustodianMap } = require("./services/custodian");
const { emitEvents, registerCanariesWithTracer } = require("./services/tracer-client");
const { getStudentRecord, getFeeRecord, getExportRecord } = require("./data/records");
const { generateCanaryToken } = require("./services/canary");

const app = express();
app.use(express.json());

const ADMIN_KEY = process.env.ADMIN_KEY;
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || "http://localhost:5173";

// CORS configuration
app.use(
  cors({
    origin: DASHBOARD_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["content-type", "x-user-id", "x-admin-key", "x-read-key", "x-ingest-key"],
  })
);

/**
 * Constant-time key comparison.
 */
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || "";
  if (!ADMIN_KEY || !timingSafeEqual(key, ADMIN_KEY)) {
    return res.status(401).json({ detail: "bad key" });
  }
  next();
}

function timingSafeEqual(a, b) {
  const crypto = require("crypto");
  if (a.length !== b.length) {
    // Pad to equal length to avoid timing leak on length
    const maxLen = Math.max(a.length, b.length);
    a = a.padEnd(maxLen, "\0");
    b = b.padEnd(maxLen, "\0");
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function makeUUID() {
  const crypto = require("crypto");
  return crypto.randomUUID();
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

// ── Health ──────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ── Student data ────────────────────────────────────────────────────────────

app.get("/students/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ detail: "x-user-id header required" });

  const record = getStudentRecord(req.params.id);
  if (!record) return res.status(404).json({ detail: "student not found" });

  const pseudo = pseudonymize(userId);
  const ts = nowUnix();

  // Emit read event to tracer
  await emitEvents([
    {
      event_id: makeUUID(),
      ts,
      actor: pseudo,
      action: "read",
      target: "svc_students",
      data_id: req.params.id,
      status: 200,
    },
  ]);

  res.json(record);
});

// ── Fee data ────────────────────────────────────────────────────────────────

app.get("/fees/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ detail: "x-user-id header required" });

  const record = getFeeRecord(req.params.id);
  if (!record) return res.status(404).json({ detail: "fee record not found" });

  const pseudo = pseudonymize(userId);
  const ts = nowUnix();

  await emitEvents([
    {
      event_id: makeUUID(),
      ts,
      actor: pseudo,
      action: "read",
      target: "svc_fees",
      data_id: req.params.id,
      status: 200,
    },
  ]);

  res.json(record);
});

// ── Export ───────────────────────────────────────────────────────────────────

app.post("/export/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ detail: "x-user-id header required" });

  const record = getExportRecord(req.params.id);
  if (!record) return res.status(404).json({ detail: "record not found" });

  const pseudo = pseudonymize(userId);
  const ts = nowUnix();

  // Generate and embed canary token
  const canaryToken = generateCanaryToken("svc_export");
  record.note_ref = `${canaryToken}@trap.test`;

  // Emit the full export event sequence
  await emitEvents([
    {
      event_id: makeUUID(),
      ts,
      actor: pseudo,
      action: "request",
      target: "svc_export",
      data_id: req.params.id,
      status: 200,
    },
    {
      event_id: makeUUID(),
      ts,
      actor: "svc_students",
      action: "transfer",
      target: "svc_export",
      data_id: req.params.id,
      status: 200,
    },
    {
      event_id: makeUUID(),
      ts,
      actor: "svc_fees",
      action: "transfer",
      target: "svc_export",
      data_id: req.params.id,
      status: 200,
    },
  ]);

  res.json(record);
});

// ── Leak simulation (demo only) ─────────────────────────────────────────────

app.post("/leak/:id", async (req, res) => {
  const record = getExportRecord(req.params.id);
  if (!record) return res.status(404).json({ detail: "record not found" });

  record.note_ref = `${generateCanaryToken("svc_export")}@trap.test`;
  const ts = nowUnix();

  // Emit the publish event (leak)
  await emitEvents([
    {
      event_id: makeUUID(),
      ts,
      actor: "svc_export",
      action: "publish",
      target: "public_bucket",
      data_id: req.params.id,
      status: 200,
    },
  ]);

  res.json({ leaked: record });
});

// ── Admin: register canaries ────────────────────────────────────────────────

app.post("/admin/register-canaries", requireAdmin, async (req, res) => {
  const canaries = [
    { token: generateCanaryToken("svc_export"), service: "svc_export" },
    { token: generateCanaryToken("svc_students"), service: "svc_students" },
    { token: generateCanaryToken("svc_fees"), service: "svc_fees" },
  ];

  const status = await registerCanariesWithTracer(canaries);
  res.json({ tracer_status: status });
});

// ── Custodian: reveal pseudonyms ────────────────────────────────────────────

app.get("/custodian/reveal", requireAdmin, (req, res) => {
  res.json(getCustodianMap());
});

// ── Start server (local dev) ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`ERP server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

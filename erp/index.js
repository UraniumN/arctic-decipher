const express = require('express');
const crypto = require('crypto');
const { waitUntil } = require('@vercel/functions');

for (const k of ['HMAC_KEY', 'TRACER_URL', 'INGEST_KEY', 'ADMIN_KEY', 'DASHBOARD_ORIGIN']) {
  if (!process.env[k]) throw new Error(`Missing env var ${k}`);
}
const { HMAC_KEY, TRACER_URL, INGEST_KEY, ADMIN_KEY, DASHBOARD_ORIGIN } = process.env;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': DASHBOARD_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type, x-admin-key, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const STUDENTS = {
  S1001: { name: 'Asha Verma', email: 'asha@example.edu', cgpa: 8.4 },
  S1002: { name: 'Rohan Das', email: 'rohan@example.edu', cgpa: 7.9 },
  S1003: { name: 'Maya Patel', email: 'maya@example.edu', cgpa: 3.81 },
  S1004: { name: 'Leo Kim', email: 'leo@example.edu', cgpa: 3.28 },
  S1005: { name: 'Nia Johnson', email: 'nia@example.edu', cgpa: 3.64 },
};
const FEES = {
  S1001: { due: 12000, paid: 12000 },
  S1002: { due: 12000, paid: 6000 },
  S1003: { due: 11800, paid: 8000 },
  S1004: { due: 13200, paid: 13200 },
  S1005: { due: 10500, paid: 7000 },
};
const USERS = ['clerk01', 'dean01', 'intern01'];
const SERVICES = ['svc_students', 'svc_fees', 'svc_export'];

const hmac = (s) => crypto.createHmac('sha256', HMAC_KEY).update(s).digest('hex');
const pseudo = (id) => 'p_' + hmac('user:' + id).slice(0, 10);
const canary = (svc) => 'tok_' + hmac('canary:' + svc).slice(0, 6);

const safeEq = (a = '', b = '') => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const needAdmin = (req, res) => {
  if (!safeEq(req.get('x-admin-key'), ADMIN_KEY)) {
    res.status(401).json({ error: 'bad key' });
    return false;
  }
  return true;
};

const evt = (actor, action, target, data_id, status = 200) => ({
  event_id: crypto.randomUUID(),
  ts: Math.floor(Date.now() / 1000),
  actor,
  action,
  target,
  data_id,
  status,
});

async function sendBatch(events) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${TRACER_URL}/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ingest-key': INGEST_KEY,
        },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) return;
      const bodyText = await response.text();
      throw new Error(`tracer ${response.status}: ${bodyText.slice(0, 200)}`);
    } catch (error) {
      if (attempt === 2) {
        console.error('TRACE_FAILED', JSON.stringify(events), error.message);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

const flush = (events) => waitUntil(sendBatch(events));

const actor = (req, res) => {
  const userId = req.get('x-user-id');
  if (!USERS.includes(userId)) {
    res.status(401).json({ error: 'unknown x-user-id' });
    return null;
  }
  return pseudo(userId);
};

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/students/:id', (req, res) => {
  const userToken = actor(req, res);
  if (!userToken) return;

  const record = STUDENTS[req.params.id];
  if (!record) return res.status(404).json({ error: 'not found' });

  flush([evt(userToken, 'read', 'svc_students', req.params.id)]);
  res.json(record);
});

app.get('/fees/:id', (req, res) => {
  const userToken = actor(req, res);
  if (!userToken) return;

  const record = FEES[req.params.id];
  if (!record) return res.status(404).json({ error: 'not found' });

  flush([evt(userToken, 'read', 'svc_fees', req.params.id)]);
  res.json(record);
});

app.post('/export/:id', (req, res) => {
  const userToken = actor(req, res);
  if (!userToken) return;

  const id = req.params.id;
  if (!STUDENTS[id]) return res.status(404).json({ error: 'not found' });

  flush([
    evt(userToken, 'request', 'svc_export', id),
    evt('svc_students', 'transfer', 'svc_export', id),
    evt('svc_fees', 'transfer', 'svc_export', id),
  ]);

  res.json({
    ...STUDENTS[id],
    ...FEES[id],
    note_ref: `${canary('svc_export')}@trap.test`,
  });
});

app.post('/leak/:id', (req, res) => {
  const id = req.params.id;
  if (!STUDENTS[id]) return res.status(404).json({ error: 'not found' });

  flush([evt('svc_export', 'publish', 'public_bucket', id)]);
  res.json({
    leaked: {
      ...STUDENTS[id],
      ...FEES[id],
      note_ref: `${canary('svc_export')}@trap.test`,
    },
  });
});

app.post('/admin/register-canaries', async (req, res) => {
  if (!needAdmin(req, res)) return;

  const canaries = SERVICES.map((service) => ({
    token: canary(service),
    service,
  }));

  const response = await fetch(`${TRACER_URL}/canaries`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ingest-key': INGEST_KEY,
    },
    body: JSON.stringify({ canaries }),
    signal: AbortSignal.timeout(8000),
  });

  res.status(response.ok ? 200 : 502).json({ tracer_status: response.status });
});

app.get('/custodian/reveal', (req, res) => {
  if (!needAdmin(req, res)) return;

  const map = {};
  USERS.forEach((userId) => {
    map[pseudo(userId)] = userId;
  });
  res.json(map);
});

module.exports = app;

if (require.main === module) {
  app.listen(3000, () => console.log('ERP on :3000'));
}

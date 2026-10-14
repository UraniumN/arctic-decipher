# Part B: ERP (Node.js) + Dashboard

**Owner:** Agent B  **Folders:** `erp/`, `dashboard/`  **Read first:** `LeakTrace_CONTRACT.md`

**Reference docs:** `LeakTrace_PartB_Architecture.md` (structure) and `LeakTrace_PartB_Design.md` (decisions and algorithms).

## Your job

Build and deploy the university ERP (the main service) and the dashboard. The ERP emits pseudonymized events to the tracer, plants canary tokens, and acts as the custodian that can reveal identities. The dashboard shows the investigation. You do not need the real tracer to finish: use the mock tracer below until Agent A hands over the real URL. Follow the endpoint shapes, headers, names, and formats in the contract exactly.

## Deliverables

1. `erp/index.js` and `erp/package.json`
2. `dashboard/index.html` wired to the tracer and ERP endpoints (configurable URLs)
3. `erp/mock-tracer.js` (local test helper, not deployed)
4. Deployed Vercel projects: ERP (Root Directory `erp`) and dashboard (Root Directory `dashboard`, static)
5. Handoff note to Agent A: the ERP URL and the admin key

## Environment variables (ERP only)

| Variable | Notes |
|---|---|
| `HMAC_KEY` | Custodian secret. Never share it with the tracer |
| `TRACER_URL` | https, no trailing slash. Use `http://localhost:8000` with the mock |
| `INGEST_KEY` | Must equal the tracer's value |
| `ADMIN_KEY` | Admin key for reveal and canary registration |
| `DASHBOARD_ORIGIN` | Exact dashboard origin, no trailing slash |

## 1. ERP (Node.js)

### `erp/package.json`

```json
{
  "name": "leaktrace-erp",
  "version": "1.0.0",
  "main": "index.js",
  "engines": { "node": "22.x" },
  "dependencies": {
    "express": "^4.19.2",
    "@vercel/functions": "^2.0.0"
  }
}
```

Check Vercel's currently supported Node versions and adjust `engines` if the build complains.

### `erp/index.js`

```js
const express = require('express');
const crypto = require('crypto');
const { waitUntil } = require('@vercel/functions');

for (const k of ['HMAC_KEY', 'TRACER_URL', 'INGEST_KEY', 'ADMIN_KEY', 'DASHBOARD_ORIGIN']) {
  if (!process.env[k]) throw new Error(`Missing env var ${k}`);   // fail loudly, not silently
}
const { HMAC_KEY, TRACER_URL, INGEST_KEY, ADMIN_KEY, DASHBOARD_ORIGIN } = process.env;

const app = express();
app.use(express.json());

// CORS (dashboard calls /custodian/reveal)
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': DASHBOARD_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type, x-admin-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---- fake data (fake only; never load real student records) ----
const STUDENTS = {
  S1001: { name: 'Asha Verma', email: 'asha@example.edu', cgpa: 8.4 },
  S1002: { name: 'Rohan Das', email: 'rohan@example.edu', cgpa: 7.9 },
};
const FEES = { S1001: { due: 12000, paid: 12000 }, S1002: { due: 12000, paid: 6000 } };
const USERS = ['clerk01', 'dean01', 'intern01'];

// ---- custodian helpers (HMAC key never leaves the ERP) ----
const hmac = (s) => crypto.createHmac('sha256', HMAC_KEY).update(s).digest('hex');
const pseudo = (id) => 'p_' + hmac('user:' + id).slice(0, 10);
const canary = (svc) => 'tok_' + hmac('canary:' + svc).slice(0, 6);
const SERVICES = ['svc_students', 'svc_fees', 'svc_export'];

const safeEq = (a = '', b = '') => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const needAdmin = (req, res) => {
  if (!safeEq(req.get('x-admin-key'), ADMIN_KEY)) { res.status(401).json({ error: 'bad key' }); return false; }
  return true;
};

// ---- tracing ----
const evt = (actor, action, target, data_id, status = 200) => ({
  event_id: crypto.randomUUID(), ts: Math.floor(Date.now() / 1000),
  actor, action, target, data_id, status,
});

async function sendBatch(events) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${TRACER_URL}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-ingest-key': INGEST_KEY },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) return;
      throw new Error(`tracer ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } catch (e) {
      if (attempt === 2) { console.error('TRACE_FAILED', JSON.stringify(events), e.message); return; }
      await new Promise((ok) => setTimeout(ok, 300 * (attempt + 1)));   // retries are safe: event_id dedupes
    }
  }
}
// waitUntil keeps the function alive until delivery finishes, after the response is sent
const flush = (events) => waitUntil(sendBatch(events));

// Prototype identity: header only. A real system takes this from an authenticated session.
const actor = (req, res) => {
  const u = req.get('x-user-id');
  if (!USERS.includes(u)) { res.status(401).json({ error: 'unknown x-user-id' }); return null; }
  return pseudo(u);
};

// ---- routes ----
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/students/:id', (req, res) => {
  const a = actor(req, res); if (!a) return;
  const rec = STUDENTS[req.params.id];
  if (!rec) return res.status(404).json({ error: 'not found' });
  flush([evt(a, 'read', 'svc_students', req.params.id)]);
  res.json(rec);
});

app.get('/fees/:id', (req, res) => {
  const a = actor(req, res); if (!a) return;
  const rec = FEES[req.params.id];
  if (!rec) return res.status(404).json({ error: 'not found' });
  flush([evt(a, 'read', 'svc_fees', req.params.id)]);
  res.json(rec);
});

// export combines student + fee data and plants this service's canary token
app.post('/export/:id', (req, res) => {
  const a = actor(req, res); if (!a) return;
  const id = req.params.id;
  if (!STUDENTS[id]) return res.status(404).json({ error: 'not found' });
  flush([
    evt(a, 'request', 'svc_export', id),
    evt('svc_students', 'transfer', 'svc_export', id),
    evt('svc_fees', 'transfer', 'svc_export', id),
  ]);
  res.json({ ...STUDENTS[id], ...FEES[id], note_ref: `${canary('svc_export')}@trap.test` });
});

// demo: simulate the export copy being published to a public bucket (the exposure point)
app.post('/leak/:id', (req, res) => {
  const id = req.params.id;
  if (!STUDENTS[id]) return res.status(404).json({ error: 'not found' });
  flush([evt('svc_export', 'publish', 'public_bucket', id)]);
  res.json({ leaked: { ...STUDENTS[id], ...FEES[id], note_ref: `${canary('svc_export')}@trap.test` } });
});

// admin: register canary tokens with the tracer (run once after deploy)
app.post('/admin/register-canaries', async (req, res) => {
  if (!needAdmin(req, res)) return;
  const canaries = SERVICES.map((s) => ({ token: canary(s), service: s }));
  const r = await fetch(`${TRACER_URL}/canaries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ingest-key': INGEST_KEY },
    body: JSON.stringify({ canaries }),
    signal: AbortSignal.timeout(8000),
  });
  res.status(r.ok ? 200 : 502).json({ tracer_status: r.status });
});

// admin: custodian reveal (pseudonym -> real user)
app.get('/custodian/reveal', (req, res) => {
  if (!needAdmin(req, res)) return;
  const map = {};
  USERS.forEach((u) => { map[pseudo(u)] = u; });
  res.json(map);
});

module.exports = app;                                    // Vercel imports the exported app
if (require.main === module) app.listen(3000, () => console.log('ERP on :3000'));   // local only
```

Notes:
- Do not call `app.listen` on Vercel. The `require.main` guard keeps it local-only.
- If the Vercel build says it cannot find an entrypoint, check the Express page of the Vercel docs for the current accepted filenames and rename `index.js` accordingly.
- Locally, `waitUntil` simply lets the promise run.

## 2. Dashboard

Deploy `dashboard/index.html` (from the earlier dashboard) as a static project with no framework and no build command.

Replace the hardcoded `SAMPLE` with live data, and wrap the script's startup in an `async` function:

```js
const CFG = {
  TRACER: 'https://leaktrace-tracer.vercel.app',   // no trailing slash
  ERP: 'https://leaktrace-erp.vercel.app',
};
const READ_KEY = prompt('Read key');                 // kept in memory only
const body = { data_id: 'S1001', exposure: 'public_bucket', leaked_text: prompt('Paste leaked content') };

const res = await fetch(CFG.TRACER + '/investigate', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-read-key': READ_KEY },
  body: JSON.stringify(body),
});
if (!res.ok) throw new Error('Tracer ' + res.status + ': ' + await res.text());
const D = await res.json();
```

For the custodian toggle, fetch `CFG.ERP + '/custodian/reveal'` with the `x-admin-key` header and use the returned `{pseudonym: realUser}` map in place of `real(id)`. Services keep their plain names.

## 3. Mock tracer for local testing

Use this until the real tracer exists. It checks the ingest key, prints every event, and returns the contract's response shapes.

### `erp/mock-tracer.js`

```js
const express = require('express');
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'content-type, x-read-key, x-ingest-key',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const IK = process.env.INGEST_KEY || 'ik', RK = process.env.READ_KEY || 'rk';
const seen = new Set();

app.get('/health', (q, s) => s.json({ ok: true }));
app.post('/events', (q, s) => {
  if (q.get('x-ingest-key') !== IK) return s.status(401).json({ detail: 'bad key' });
  let added = 0;
  for (const e of q.body.events || []) {
    if (seen.has(e.event_id)) continue;
    seen.add(e.event_id); added++;
    console.log('EVENT', e.actor, e.action, e.target, e.data_id);
  }
  s.json({ ok: true, added });
});
app.post('/canaries', (q, s) => {
  if (q.get('x-ingest-key') !== IK) return s.status(401).json({ detail: 'bad key' });
  console.log('CANARIES', JSON.stringify(q.body.canaries));
  s.json({ ok: true });
});
app.post('/investigate', (q, s) => {
  if (q.get('x-read-key') !== RK) return s.status(401).json({ detail: 'bad key' });
  s.json({
    case: `${q.body.data_id} found at ${q.body.exposure || 'public_bucket'}`,
    leak: 'public_bucket',
    chain: { events: 4, gaps: [{ after: 2, missing: 1, between: ['svc_students', 'svc_fees'] }], edited_seqs: [] },
    canary: { token: 'tok_ab12cd', owner: 'svc_export' },
    nodes: ['svc_students', 'svc_fees', 'svc_export', 'public_bucket'].map((id) => ({ id })),
    edges: [
      { s: 'svc_students', t: 'svc_export', inferred: false },
      { s: 'svc_fees', t: 'svc_export', inferred: true },
      { s: 'svc_export', t: 'public_bucket', inferred: false },
    ],
    suspects: [
      { id: 'svc_export', p: 0.74, why: 'Mock: handled the record 3s before the leak; canary match.' },
      { id: 'svc_fees', p: 0.2, why: 'Mock: path includes an inferred edge.' },
      { id: 'svc_students', p: 0.06, why: 'Mock: two hops from the exposure point.' },
    ],
  });
});
app.listen(8000, () => console.log('mock tracer on :8000'));
```

### Local run

```bash
cd erp && npm install
export HMAC_KEY=hk TRACER_URL=http://localhost:8000 INGEST_KEY=ik ADMIN_KEY=ak DASHBOARD_ORIGIN=http://localhost:5173
node mock-tracer.js &        # terminal 1
node index.js                # terminal 2 (ERP on :3000)
```

Serve the dashboard locally with `npx serve dashboard -l 5173` so its origin matches `DASHBOARD_ORIGIN`.

### Local checks

```bash
curl http://localhost:3000/health
curl -H "x-user-id: clerk01" http://localhost:3000/students/S1001          # mock prints one EVENT
curl -H "x-user-id: nobody" http://localhost:3000/students/S1001            # 401
curl -X POST -H "x-user-id: intern01" http://localhost:3000/export/S1001    # 3 EVENT lines, body has note_ref
curl -X POST http://localhost:3000/leak/S1001                               # 1 EVENT line (publish)
curl -X POST -H "x-admin-key: ak" http://localhost:3000/admin/register-canaries   # {"tracer_status":200}
curl -H "x-admin-key: ak" http://localhost:3000/custodian/reveal            # pseudonym -> user map
```

## 4. Definition of done

- [ ] Every ERP endpoint in the contract behaves as listed, with the exact event sequence for export-then-leak
- [ ] Missing or unknown `x-user-id` returns `401`; wrong `x-admin-key` returns `401`
- [ ] Missing env var makes the ERP fail loudly with the variable name
- [ ] The ERP still responds normally when the tracer is down (events fail with `TRACE_FAILED` in logs only)
- [ ] The dashboard renders the mock report: graph, ranked table, reasoning, integrity panel, canary card
- [ ] The dashboard shows a clear error message when the tracer returns a non-200 response
- [ ] The custodian toggle swaps pseudonyms for real user names using `/custodian/reveal`
- [ ] Tracer and ERP URLs in the dashboard come from one config object at the top of the script
- [ ] Deployed ERP passes the local checks against the deployed URL (with `TRACER_URL` pointing at the mock or real tracer)

## 5. Not your job

The database, the hash chain, scoring, and canary matching. The ERP only generates tokens and pseudonyms; the tracer stores and uses them.

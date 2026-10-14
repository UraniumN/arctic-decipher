const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, x-read-key, x-ingest-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const IK = process.env.INGEST_KEY || 'ik';
const RK = process.env.READ_KEY || 'rk';
const seen = new Set();

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/health/db', (req, res) => {
  if (req.get('x-read-key') !== RK) {
    return res.status(401).json({ detail: 'bad key' });
  }
  res.json({ db: 'ok' });
});
app.get('/verify', (req, res) => {
  if (req.get('x-read-key') !== RK) {
    return res.status(401).json({ detail: 'bad key' });
  }
  res.json({
    events: 4,
    head_seq: 4,
    gaps: [{ after: 2, missing: 1, between: ['svc_students', 'svc_fees'] }],
    edited_seqs: [],
  });
});

app.post('/events', (req, res) => {
  if (req.get('x-ingest-key') !== IK) {
    return res.status(401).json({ detail: 'bad key' });
  }

  let added = 0;
  for (const event of req.body.events || []) {
    if (seen.has(event.event_id)) continue;
    seen.add(event.event_id);
    added += 1;
    console.log('EVENT', event.actor, event.action, event.target, event.data_id);
  }

  res.json({ ok: true, added });
});

app.post('/canaries', (req, res) => {
  if (req.get('x-ingest-key') !== IK) {
    return res.status(401).json({ detail: 'bad key' });
  }

  console.log('CANARIES', JSON.stringify(req.body.canaries));
  res.json({ ok: true });
});

app.post('/investigate', (req, res) => {
  if (req.get('x-read-key') !== RK) {
    return res.status(401).json({ detail: 'bad key' });
  }

  res.json({
    case: `${req.body.data_id} found at ${req.body.exposure || 'public_bucket'}`,
    leak: 'public_bucket',
    chain: {
      events: 4,
      gaps: [{ after: 2, missing: 1, between: ['svc_students', 'svc_fees'] }],
      edited_seqs: [],
    },
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

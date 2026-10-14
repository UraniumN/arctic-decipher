# LeakTrace — Dashboard

> **Owner:** Agent B  
> **Directory:** `dashboard/`  
> **Tech:** Vanilla JavaScript (ES modules), HTML5 Canvas, CSS3, Vite

The dashboard app contains two separate pages: the **investigation dashboard** and the **ERP demo dashboard**. The investigation page focuses on tracer reports; the ERP demo page is used to read/export records and simulate demo activity.

---

## Features

- **Interactive Provenance Graph:** Built on HTML5 Canvas. Shows observed hops (solid arrows) and gap-inferred links (dashed lines).
- **Suspect Attribution Cards:** Ranked attribution probabilities with human-readable rationale (hop count, time decay, canary token match).
- **Leak Inspector:** Paste any leaked JSON payload or sample; automatically scans for embedded canary tokens.
- **Chain Integrity Monitor:** Real-time tamper verification detecting missing events, hash edits, and tail truncations.
- **Custodian Identity Reveal:** Toggle between pseudonym tokens (`p_...`) and real identities when supplied with the `ADMIN_KEY`.
The ERP demo has its own page at `/erp.html`, linked from the navigation bar. The investigation page remains at `/`.

## Demo workflow

1. In the ERP Demo page, connect to the ERP and provide the admin key.
2. Choose a demo user and student ID (`S1001`–`S1005`).
3. Register canary tokens after starting or resetting the tracer.
4. Read a record, export it, or simulate a leak.
5. Open the separate investigation dashboard; the simulated leak's record ID and content are filled in automatically. Connect there with the tracer read key and run the investigation.

The dashboard expects the ERP API on port `3001` and tracer on port `8000` for local development. The local mock tracer returns a sample investigation report rather than calculating a ranking from ingested events.

---

## Configuration

The dashboard features a live configuration panel at the top:

- **Tracer URL:** Target URL for `/verify` and `/investigate` (default: `http://localhost:8000`).
- **ERP URL:** Target URL for `/custodian/reveal` (default: `http://localhost:3001`).
- **Read Key (`x-read-key`):** Sent to Tracer for verification and investigation queries.
- **Admin Key (`x-admin-key`):** Sent to ERP to reveal real identities.

---

## Local Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

### 3. Production Build

```bash
npm run build
npm run preview
```

---

## Testing

```bash
# Run smoke tests
npm test
# or
node tests/test_client.js
```

---

## Vercel Deployment

1. Create a new Vercel project with **Root Directory** set to `dashboard`.
2. Framework Preset: **Vite**.
3. Build Command: `vite build` (or `npm run build`).
4. Output Directory: `dist`.
5. Deploy.

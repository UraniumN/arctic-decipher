# LeakTrace — Dashboard

> **Owner:** Agent B  
> **Directory:** `dashboard/`  
> **Tech:** Vanilla JavaScript (ES modules), HTML5 Canvas, CSS3, Vite

The **Dashboard** is the investigator's visual cockpit. It connects directly to the Tracer and ERP via HTTP, renders interactive provenance DAG graphs, illustrates inferred log gap paths, shows suspect ranking likelihoods, and reveals custodian identities.

---

## Features

- **Interactive Provenance Graph:** Built on HTML5 Canvas. Shows observed hops (solid arrows) and gap-inferred links (dashed lines).
- **Suspect Attribution Cards:** Ranked attribution probabilities with human-readable rationale (hop count, time decay, canary token match).
- **Leak Inspector:** Paste any leaked JSON payload or sample; automatically scans for embedded canary tokens.
- **Chain Integrity Monitor:** Real-time tamper verification detecting missing events, hash edits, and tail truncations.
- **Custodian Identity Reveal:** Toggle between pseudonym tokens (`p_...`) and real identities when supplied with the `ADMIN_KEY`.

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

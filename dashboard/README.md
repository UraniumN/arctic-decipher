# LeakTrace — Dashboard (React + TypeScript)

> **Owner:** Agent B  
> **Directory:** `dashboard/`  
> **Tech:** React 18, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Vite

The **Dashboard** is the investigator's visual cockpit. It connects directly to the Tracer and ERP via HTTP, rendering provenance timelines, chain integrity monitors, canary token matches, suspect ranking likelihoods, and custodian identity reveals.

---

## Features

- **Provenance Timeline:** Visualizes multi-entity activity spans, request/transfer/publish operations, and highlights log gap intervals.
- **Suspect Ranking Cards:** Ranked attribution probabilities with human-readable rationale (hop count, time decay, canary token match).
- **Canary Token Matcher:** Identifies matched trap tokens in leaked data (`tok_...`) and highlights scanned fields.
- **Chain Integrity Monitor:** Real-time tamper verification detecting missing events, hash edits, and tail truncations with sparkline activity charts.
- **Custodian Identity Reveal:** Toggle between pseudonym tokens (`p_...`) and real identities when supplied with the `ADMIN_KEY`.
- **Slide-out Connection Drawer:** In-browser configuration for Tracer URL, ERP URL, and access keys with real-time health verification.

---

## Component Architecture

```
src/
├── App.tsx                     # Main dashboard controller & layout
├── api.ts                      # Type-safe API client for Tracer & ERP
├── data.ts                     # Fallback mock datasets & schema types
├── index.css                   # Tailwind v4 theme & custom color tokens
├── index.tsx                   # React root entry point
└── components/
    ├── CanaryCard.tsx          # Canary token match card & field grid
    ├── CardHeader.tsx          # Reusable card header with actions
    ├── ChainCard.tsx           # Hash chain integrity & sparkline rate
    ├── ConfigDrawer.tsx        # Slide-out drawer for endpoints & keys
    ├── FilterBar.tsx           # Case filter bar with re-run action
    ├── Rail.tsx                # Left navigation icon rail
    ├── SuspectsCard.tsx        # Ranked suspects list & custodian toggle
    ├── TimelineCard.tsx        # Visual provenance timeline chart
    └── TopBar.tsx              # Top navigation bar & live status pill
```

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
# Run unit & smoke tests
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

# LeakTrace Dashboard

The dashboard is a React and TypeScript investigation interface with a separate ERP demo page.

## Pages

- `/` — investigation dashboard, with cases, event logs, chain verification, custodian view, and investigation details.
- `/erp.html` — ERP demo for reading student and fee records, exporting records, simulating a leak, registering canaries, and revealing demo identities.

The ERP Demo link is available in the investigation dashboard header. A simulated leak carries its record ID and JSON content to the investigation view using browser `localStorage`.

## Local setup

Install dependencies and start the Vite server:

```powershell
cd dashboard
npm install
npm run dev
```

The dashboard uses `http://localhost:8000` for the tracer and `http://localhost:3001` for the ERP by default. Set the service keys in the connection settings as needed. The local mock tracer returns a sample investigation report rather than computing a ranking from ingested events.

## Build and test

```powershell
npm test
npm run build
npm run preview
```

Configure Vercel with `dashboard` as the root directory, Vite as the framework, and `dist` as the output directory.

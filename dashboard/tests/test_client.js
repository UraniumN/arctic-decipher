/**
 * Dashboard smoke tests for the React app and separate ERP demo.
 * Run with Node.js: npm test
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log("Dashboard tests:");

test("React investigation app renders the main dashboard views", () => {
  const app = read("src/App.tsx");
  assert.match(app, /export function App/);
  for (const component of [
    "CasesTable",
    "EventTable",
    "ChainHeader",
    "CustodianHeader",
    "SuspectsCard",
    "TimelineCard",
  ]) {
    assert.ok(app.includes(component), `App should render ${component}`);
  }
});

test("React API client exposes the tracer and custodian routes", () => {
  const api = read("src/api.ts");
  for (const method of ["verifyChain", "runInvestigation", "revealCustodian"]) {
    assert.ok(api.includes(method), `API should export ${method}`);
  }
});

test("ERP demo is a separate multi-page build entry", () => {
  const erpPage = read("erp.html");
  const buildConfig = read("vite.config.ts");
  const erpApp = read("src/pages/erp.js");
  assert.ok(erpPage.includes("/src/pages/erp.js"));
  assert.ok(buildConfig.includes("erp.html"));
  assert.ok(erpApp.includes("readStudent"));
  assert.ok(erpApp.includes("registerCanaries"));
  assert.ok(erpApp.includes("simulateLeak"));
  assert.ok(erpApp.includes('localStorage.setItem("leaktrace.pending-investigation"'));
  assert.ok(read("src/api/client.js").includes("simulateLeak"));
});

test("investigation app consumes simulated leak handoff", () => {
  const app = read("src/App.tsx");
  assert.ok(app.includes('localStorage.getItem("leaktrace.pending-investigation"'));
  assert.ok(app.includes("setLeakedText(details.leakedText)"));
  assert.ok(!read("src/components/TopBar.tsx").includes('href="/erp.html"'));
  assert.ok(read("erp.html").includes('href="/">Investigation</a>'));
  assert.ok(read("index.html").includes("/src/index.tsx"));
});

test("demo data covers all five student records", () => {
  const erpPage = read("erp.html");
  for (const id of ["S1001", "S1002", "S1003", "S1004", "S1005"]) {
    assert.ok(erpPage.includes(id), `ERP demo should offer ${id}`);
  }
});

console.log("\nAll dashboard tests completed.");

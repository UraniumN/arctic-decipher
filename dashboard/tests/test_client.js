/**
 * Dashboard smoke tests — tests for React + TypeScript redesign with all 5 screens.
 * Run with Node.js: node tests/test_client.js
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("Dashboard TypeScript client tests:");

test("main App component exists and links all 5 views", () => {
  const appPath = path.join(__dirname, "..", "src", "App.tsx");
  assert(fs.existsSync(appPath), "App.tsx should exist");
  const content = fs.readFileSync(appPath, "utf-8");
  assert(content.includes("export function App"), "Should export App component");
  // Screen 1: Cases
  assert(content.includes("CasesTable"), "Should render CasesTable");
  assert(content.includes("NewCaseCard"), "Should render NewCaseCard");
  // Screen 2: Event log
  assert(content.includes("LogHeader"), "Should render LogHeader");
  assert(content.includes("EventTable"), "Should render EventTable");
  assert(content.includes("EventDetail"), "Should render EventDetail");
  // Screen 3: Chain
  assert(content.includes("ChainHeader"), "Should render ChainHeader");
  assert(content.includes("SummaryCard"), "Should render SummaryCard");
  assert(content.includes("SequenceStrip"), "Should render SequenceStrip");
  assert(content.includes("FindingsList"), "Should render FindingsList");
  assert(content.includes("ContextRows"), "Should render ContextRows");
  // Screen 4: Custodian
  assert(content.includes("CustodianHeader"), "Should render CustodianHeader");
  assert(content.includes("IdentityTable"), "Should render IdentityTable");
  assert(content.includes("RevealLog"), "Should render RevealLog");
  // Screen 5: Investigate
  assert(content.includes("SuspectsCard"), "Should render SuspectsCard");
  assert(content.includes("ChainCard"), "Should render ChainCard");
  assert(content.includes("CanaryCard"), "Should render CanaryCard");
  assert(content.includes("TimelineCard"), "Should render TimelineCard");
});

test("API client module exists and exports core contract methods", () => {
  const apiPath = path.join(__dirname, "..", "src", "api.ts");
  assert(fs.existsSync(apiPath), "api.ts should exist");
  const content = fs.readFileSync(apiPath, "utf-8");
  assert(content.includes("verifyChain"), "Should export verifyChain");
  assert(content.includes("runInvestigation"), "Should export runInvestigation");
  assert(content.includes("revealCustodian"), "Should export revealCustodian");
});

test("data definitions exist for all screens", () => {
  const dataPath = path.join(__dirname, "..", "src", "data.ts");
  assert(fs.existsSync(dataPath), "data.ts should exist");
  const content = fs.readFileSync(dataPath, "utf-8");
  // Screen 1
  assert(content.includes("cases"), "Should export cases data");
  // Screen 2
  assert(content.includes("events"), "Should export events data");
  assert(content.includes("gaps"), "Should export gaps data");
  // Screen 3
  assert(content.includes("findings"), "Should export findings data");
  assert(content.includes("contextFor"), "Should export contextFor function");
  // Screen 4
  assert(content.includes("identities"), "Should export identities data");
  assert(content.includes("revealLog"), "Should export revealLog data");
  // Investigate
  assert(content.includes("suspects"), "Should export suspects data");
  assert(content.includes("spans"), "Should export spans data");
  assert(content.includes("chainGap"), "Should export chainGap data");
});

test("Vite HTML entry point and Tailwind config exist", () => {
  const htmlPath = path.join(__dirname, "..", "index.html");
  assert(fs.existsSync(htmlPath), "index.html should exist");
  const cssPath = path.join(__dirname, "..", "src", "index.css");
  assert(fs.existsSync(cssPath), "index.css should exist");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  assert(cssContent.includes("tailwindcss"), "Should import tailwindcss");
});

console.log("\nAll dashboard tests completed.");

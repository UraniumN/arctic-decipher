/**
 * Dashboard smoke tests — tests for API client module.
 * Run with Node.js: node tests/test_client.js
 */

// Basic unit tests for the client module structure
const assert = require("assert");

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("Dashboard client tests:");

test("client module can be described", () => {
  // The client is an ES module, so we just verify the file structure exists
  const fs = require("fs");
  const path = require("path");
  const clientPath = path.join(__dirname, "..", "src", "api", "client.js");
  assert(fs.existsSync(clientPath), "client.js should exist");
  const content = fs.readFileSync(clientPath, "utf-8");
  assert(content.includes("LeakTraceClient"), "Should export LeakTraceClient class");
  assert(content.includes("healthTracer"), "Should have healthTracer method");
  assert(content.includes("investigate"), "Should have investigate method");
  assert(content.includes("verify"), "Should have verify method");
  assert(content.includes("reveal"), "Should have reveal method");
});

test("graph module exists", () => {
  const fs = require("fs");
  const path = require("path");
  const graphPath = path.join(__dirname, "..", "src", "components", "graph.js");
  assert(fs.existsSync(graphPath), "graph.js should exist");
  const content = fs.readFileSync(graphPath, "utf-8");
  assert(content.includes("ProvenanceGraph"), "Should export ProvenanceGraph class");
  assert(content.includes("setData"), "Should have setData method");
});

test("main app module exists", () => {
  const fs = require("fs");
  const path = require("path");
  const appPath = path.join(__dirname, "..", "src", "pages", "app.js");
  assert(fs.existsSync(appPath), "app.js should exist");
  const content = fs.readFileSync(appPath, "utf-8");
  assert(content.includes("investigate"), "Should handle investigate");
  assert(content.includes("verifyChain"), "Should handle chain verification");
});

console.log("\nAll dashboard tests completed.");

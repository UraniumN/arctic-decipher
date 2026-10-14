/**
 * Basic ERP endpoint tests.
 */

const assert = require("assert");

// Simple test helper
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// Test custodian
const { pseudonymize, getCustodianMap } = require("../src/services/custodian");

console.log("Custodian tests:");

test("pseudonymize returns p_ prefix with 10 hex chars", () => {
  const p = pseudonymize("clerk01");
  assert(p.startsWith("p_"), `Expected p_ prefix, got: ${p}`);
  assert.strictEqual(p.length, 12, `Expected length 12, got: ${p.length}`);
  assert(/^p_[0-9a-f]{10}$/.test(p), `Expected p_XXXXXXXXXX format, got: ${p}`);
});

test("pseudonymize is deterministic", () => {
  const p1 = pseudonymize("clerk01");
  const p2 = pseudonymize("clerk01");
  assert.strictEqual(p1, p2);
});

test("different users get different pseudonyms", () => {
  const p1 = pseudonymize("clerk01");
  const p2 = pseudonymize("dean01");
  assert.notStrictEqual(p1, p2);
});

test("custodian map includes pseudonymized users", () => {
  pseudonymize("intern01");
  const map = getCustodianMap();
  assert(Object.keys(map).length >= 3, "Expected at least 3 entries");
  const values = Object.values(map);
  assert(values.includes("clerk01"), "Expected clerk01 in map values");
});

// Test canary
const { generateCanaryToken } = require("../src/services/canary");

console.log("\nCanary tests:");

test("generateCanaryToken returns tok_ prefix with 6 hex chars", () => {
  const token = generateCanaryToken();
  assert(token.startsWith("tok_"), `Expected tok_ prefix, got: ${token}`);
  assert(/^tok_[0-9a-f]{6}$/.test(token), `Expected tok_XXXXXX format, got: ${token}`);
});

test("tokens are unique", () => {
  const tokens = new Set();
  for (let i = 0; i < 100; i++) {
    tokens.add(generateCanaryToken());
  }
  assert(tokens.size > 90, "Expected mostly unique tokens");
});

// Test records
const { getStudentRecord, getFeeRecord, getExportRecord } = require("../src/data/records");

console.log("\nRecords tests:");

test("getStudentRecord returns S1001", () => {
  const r = getStudentRecord("S1001");
  assert(r, "Expected record");
  assert.strictEqual(r.id, "S1001");
  assert.strictEqual(r.name, "Alice Nguyen");
});

test("getStudentRecord returns null for unknown", () => {
  const r = getStudentRecord("UNKNOWN");
  assert.strictEqual(r, null);
});

test("getExportRecord combines student + fees", () => {
  const r = getExportRecord("S1001");
  assert(r, "Expected record");
  assert.strictEqual(r.id, "S1001");
  assert(r.fees, "Expected fees object");
  assert.strictEqual(r.fees.tuition, 12500);
});

console.log("\nAll tests completed.");

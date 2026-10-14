/**
 * Canary token generation.
 *
 * Format: tok_ + 6 random hex characters
 * Planted as <token>@trap.test in the note_ref field.
 */

const crypto = require("crypto");

/**
 * Generate a canary token in the format tok_XXXXXX (6 hex chars).
 */
function generateCanaryToken() {
  const bytes = crypto.randomBytes(3);
  return `tok_${bytes.toString("hex")}`;
}

module.exports = { generateCanaryToken };

/**
 * Canary token generation.
 *
 * Format: tok_ + 6 random hex characters
 * Planted as <token>@trap.test in the note_ref field.
 */

const crypto = require("crypto");
const HMAC_KEY = process.env.HMAC_KEY || "default-dev-key";

/**
 * Generate a canary token. Supplying a service creates a stable token for
 * that service so exports and tracer registrations use the same value.
 */
function generateCanaryToken(service) {
  if (service) {
    const digest = crypto
      .createHmac("sha256", HMAC_KEY)
      .update(`canary:${service}`)
      .digest("hex");
    return `tok_${digest.slice(0, 6)}`;
  }

  const bytes = crypto.randomBytes(3);
  return `tok_${bytes.toString("hex")}`;
}

module.exports = { generateCanaryToken };

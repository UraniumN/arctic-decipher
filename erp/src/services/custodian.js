/**
 * Custodian service — HMAC-based pseudonymization and reveal.
 *
 * The ERP is the only service that holds the HMAC_KEY and can map
 * pseudonyms back to real user identities.
 *
 * Pseudonym format: p_ + first 10 hex chars of HMAC-SHA256(userId)
 */

const crypto = require("crypto");

const HMAC_KEY = process.env.HMAC_KEY || "default-dev-key";

// In-memory map of pseudonym -> real identity (populated on pseudonymize calls)
const custodianMap = {};

// Demo users per the contract
const DEMO_USERS = ["clerk01", "dean01", "intern01"];

/**
 * Create a pseudonym for a user ID.
 * Format: p_ + first 10 hex characters of HMAC-SHA256(userId, HMAC_KEY)
 */
function pseudonymize(userId) {
  const hmac = crypto.createHmac("sha256", HMAC_KEY);
  hmac.update(userId);
  const hash = hmac.digest("hex");
  const pseudo = `p_${hash.substring(0, 10)}`;

  // Track the mapping for custodian reveal
  custodianMap[pseudo] = userId;

  return pseudo;
}

/**
 * Return the full pseudonym -> real identity map.
 */
function getCustodianMap() {
  // Ensure demo users are pre-populated
  for (const user of DEMO_USERS) {
    pseudonymize(user);
  }
  return { ...custodianMap };
}

module.exports = { pseudonymize, getCustodianMap };

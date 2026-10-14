/**
 * Tracer client — sends events and canary registrations to the tracer.
 *
 * Implements retry logic for resilient event delivery.
 * In Vercel, the ERP should wrap calls in waitUntil to ensure delivery.
 */

const TRACER_URL = process.env.TRACER_URL || "http://localhost:8000";
const INGEST_KEY = process.env.INGEST_KEY || "ik";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Send a batch of events to the tracer's POST /events endpoint.
 * Retries up to MAX_RETRIES times on failure.
 */
async function emitEvents(events) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${TRACER_URL}/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ingest-key": INGEST_KEY,
        },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      console.error(
        `TRACE_FAILED attempt=${attempt} status=${response.status} body=${await response.text()}`
      );
    } catch (err) {
      console.error(`TRACE_FAILED attempt=${attempt} error=${err.message}`);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }

  console.error("TRACE_FAILED all retries exhausted");
  return null;
}

/**
 * Register canary tokens with the tracer's POST /canaries endpoint.
 * Returns the HTTP status code from the tracer.
 */
async function registerCanariesWithTracer(canaries) {
  try {
    const response = await fetch(`${TRACER_URL}/canaries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ingest-key": INGEST_KEY,
      },
      body: JSON.stringify({ canaries }),
    });
    return response.status;
  } catch (err) {
    console.error(`CANARY_REGISTER_FAILED error=${err.message}`);
    return 500;
  }
}

module.exports = { emitEvents, registerCanariesWithTracer };

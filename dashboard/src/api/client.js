/**
 * LeakTrace API Client
 *
 * Handles all communication with the Tracer and ERP services.
 * Used by the dashboard's main app logic.
 */

export class LeakTraceClient {
  constructor() {
    this.tracerUrl = "";
    this.erpUrl = "";
    this.readKey = "";
    this.adminKey = "";
  }

  configure({ tracerUrl, erpUrl, readKey, adminKey }) {
    this.tracerUrl = tracerUrl.replace(/\/$/, "");
    this.erpUrl = erpUrl.replace(/\/$/, "");
    this.readKey = readKey;
    this.adminKey = adminKey;
  }

  /**
   * GET /health — no key required
   */
  async healthTracer() {
    const res = await fetch(`${this.tracerUrl}/health`);
    return res.json();
  }

  /**
   * GET /health/db — requires x-read-key
   */
  async healthDb() {
    const res = await fetch(`${this.tracerUrl}/health/db`, {
      headers: { "x-read-key": this.readKey },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * GET /verify — requires x-read-key
   */
  async verify() {
    const res = await fetch(`${this.tracerUrl}/verify`, {
      headers: { "x-read-key": this.readKey },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * POST /investigate — requires x-read-key
   */
  async investigate({ dataId, exposure, leakedText, tau = 600 }) {
    const body = {
      data_id: dataId,
      exposure,
      leaked_text: leakedText || null,
      tau,
    };
    const res = await fetch(`${this.tracerUrl}/investigate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-read-key": this.readKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * GET /custodian/reveal — requires x-admin-key on the ERP
   */
  async reveal() {
    const res = await fetch(`${this.erpUrl}/custodian/reveal`, {
      headers: { "x-admin-key": this.adminKey },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * GET /health — ERP health check, no key required
   */
  async healthErp() {
    const res = await fetch(`${this.erpUrl}/health`);
    return res.json();
  }
}

// Singleton instance
export const client = new LeakTraceClient();

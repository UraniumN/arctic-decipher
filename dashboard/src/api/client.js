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
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
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
   * ERP demo routes — data access includes the prototype x-user-id header.
   */
  async readStudent(id, userId) {
    return this.erpRequest(`/students/${encodeURIComponent(id)}`, userId);
  }

  async readFees(id, userId) {
    return this.erpRequest(`/fees/${encodeURIComponent(id)}`, userId);
  }

  async exportRecord(id, userId) {
    return this.erpRequest(`/export/${encodeURIComponent(id)}`, userId, "POST");
  }

  async simulateLeak(id) {
    return this.erpRequest(`/leak/${encodeURIComponent(id)}`, null, "POST");
  }

  async registerCanaries() {
    const res = await fetch(`${this.erpUrl}/admin/register-canaries`, {
      method: "POST",
      headers: { "x-admin-key": this.adminKey },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const result = await res.json();
    if (result.tracer_status !== 200) {
      throw new Error(`Tracer rejected canary registration (${result.tracer_status})`);
    }
    return result;
  }

  async erpRequest(path, userId, method = "GET") {
    const headers = {};
    if (userId) headers["x-user-id"] = userId;
    const res = await fetch(`${this.erpUrl}${path}`, { method, headers });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * GET /health — ERP health check, no key required
   */
  async healthErp() {
    const res = await fetch(`${this.erpUrl}/health`);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }
}

// Singleton instance
export const client = new LeakTraceClient();

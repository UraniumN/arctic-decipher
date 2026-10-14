/**
 * LeakTrace Dashboard API Client
 * Connects to Tracer API (port 8000) and ERP API (port 3001) per the Monorepo Contract.
 */

export interface VerifyResponse {
  events: number;
  head_seq: number;
  gaps: Array<{
    after: number;
    missing: number;
    between: [string | null, string | null];
    tail?: boolean;
  }>;
  edited_seqs: number[];
}

export interface Suspect {
  id: string;
  p: number;
  why: string;
  real?: string;
}

export interface InvestigateResponse {
  case: string;
  leak: string;
  chain: {
    events: number;
    gaps: any[];
    edited_seqs: number[];
  };
  canary: {
    token: string;
    owner: string;
  } | null;
  nodes: Array<{ id: string }>;
  edges: Array<{ s: string; t: string; inferred: boolean }>;
  suspects: Suspect[];
}

export interface Config {
  tracerUrl: string;
  erpUrl: string;
  readKey: string;
  adminKey: string;
}

export const defaultConfig: Config = {
  tracerUrl: "http://localhost:8000",
  erpUrl: "http://localhost:3001",
  readKey: "rk",
  adminKey: "ak",
};

export async function verifyChain(config: Config): Promise<VerifyResponse> {
  const res = await fetch(`${config.tracerUrl}/verify`, {
    headers: {
      "x-read-key": config.readKey,
    },
  });
  if (!res.ok) throw new Error(`Verify failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function runInvestigation(
  config: Config,
  dataId: string = "S1001",
  exposure: string = "public_bucket",
  leakedText?: string
): Promise<InvestigateResponse> {
  const body: any = { data_id: dataId, exposure };
  if (leakedText) body.leaked_text = leakedText;

  const res = await fetch(`${config.tracerUrl}/investigate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-read-key": config.readKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Investigation failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function revealCustodian(config: Config): Promise<Record<string, string>> {
  const res = await fetch(`${config.erpUrl}/custodian/reveal`, {
    headers: {
      "x-admin-key": config.adminKey,
    },
  });
  if (!res.ok) throw new Error(`Custodian reveal failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function checkConnectivity(config: Config): Promise<{ tracer: boolean; db: boolean; erp: boolean }> {
  let tracer = false;
  let db = false;
  let erp = false;

  try {
    const tRes = await fetch(`${config.tracerUrl}/health`);
    tracer = tRes.ok;
  } catch (e) {}

  try {
    const dbRes = await fetch(`${config.tracerUrl}/health/db`, {
      headers: { "x-read-key": config.readKey },
    });
    db = dbRes.ok;
  } catch (e) {}

  try {
    const eRes = await fetch(`${config.erpUrl}/health`);
    erp = eRes.ok;
  } catch (e) {}

  return { tracer, db, erp };
}

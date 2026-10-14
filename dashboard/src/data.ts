export type Action = "request" | "read" | "transfer" | "publish";

// ─── INVESTIGATION DATA ──────────────────────────────────────────────────────

export type Suspect = {
  id: string;
  p: number;
  why: string;
  real: string;
};

export const suspects: Suspect[] = [
  {
    id: "p_a3f9c2d1e4",
    p: 0.624,
    why: "Requested svc_export 2s before S1001 was published to public_bucket",
    real: "Daniel Okafor",
  },
  {
    id: "p_7be21c04aa",
    p: 0.211,
    why: "Read S1001 twice inside the leak window from a new device",
    real: "Priya Raman",
  },
  {
    id: "p_c90d5e7f13",
    p: 0.098,
    why: "Holds export role; activity overlaps the chain gap",
    real: "Marcus Lee",
  },
  {
    id: "p_12f8ab3e6d",
    p: 0.067,
    why: "Accessed neighbouring record S1002 only",
    real: "Hana Sato",
  },
];

export type Span = {
  node: string;
  start: number;
  end: number;
  action: Action;
  events: number;
  actor?: string;
};

/** Minutes relative to the leak window (0 = window start, 30 = exposure). */
export const spans: Span[] = [
  { node: "p_a3f9c2d1e4", start: 1, end: 9, action: "request", events: 16, actor: "p_a3f9c2d1e4" },
  { node: "p_7be21c04aa", start: 4, end: 13, action: "request", events: 7, actor: "p_7be21c04aa" },
  { node: "p_c90d5e7f13", start: 15, end: 19, action: "request", events: 3, actor: "p_c90d5e7f13" },
  { node: "svc_students", start: 6, end: 18, action: "transfer", events: 21 },
  { node: "svc_fees", start: 11, end: 17, action: "transfer", events: 9 },
  { node: "svc_export", start: 18, end: 28, action: "transfer", events: 14 },
  { node: "public_bucket", start: 27, end: 30, action: "publish", events: 4 },
];

export const timelineNodes = [
  "p_a3f9c2d1e4",
  "p_7be21c04aa",
  "p_c90d5e7f13",
  "svc_students",
  "svc_fees",
  "svc_export",
  "public_bucket",
];

/** Missing-sequence gap reported by chain verification. */
export const chainGap = { start: 20.5, end: 23, after: 1182, missing: 3 };

/** Events per minute across the window — dips where the gap sits. */
export const eventRate = [
  12, 18, 14, 22, 19, 26, 21, 30, 24, 28, 33, 27, 31, 25, 36, 29, 34, 30, 38, 32, 9, 2, 4, 26, 31,
  28, 35, 30, 41, 37,
];

export const leakedFields = [
  "id", "name", "dob", "email", "phone", "address", "program", "year", "gpa", "fees_due",
  "advisor", "status", "note_ref", "updated_at", "campus", "intake", "scholarship", "guardian",
  "nationality", "visa", "locker", "library_id", "transcript", "flags",
];
export const canaryField = "note_ref";

// ─── CASES (SCREEN 1) ────────────────────────────────────────────────────────

export type CaseStatus = "open" | "closed";

export type Case = {
  dataId: string;
  exposure: string;
  top: string;
  p: number;
  canary: boolean;
  missing: number;
  edited: number;
  updated: string;
  status: CaseStatus;
};

export const cases: Case[] = [
  { dataId: "S1001", exposure: "public_bucket", top: "p_a3f9c2d1e4", p: 0.624, canary: true, missing: 3, edited: 0, updated: "2 min ago", status: "open" },
  { dataId: "S1017", exposure: "pastebin_mirror", top: "svc_export", p: 0.41, canary: false, missing: 0, edited: 1, updated: "1 h ago", status: "open" },
  { dataId: "S1042", exposure: "public_bucket", top: "p_7be21c04aa", p: 0.88, canary: true, missing: 0, edited: 0, updated: "3 h ago", status: "open" },
  { dataId: "S0987", exposure: "email_relay", top: "p_c90d5e7f13", p: 0.33, canary: false, missing: 5, edited: 0, updated: "Yesterday", status: "open" },
  { dataId: "S0961", exposure: "public_bucket", top: "svc_fees", p: 0.71, canary: true, missing: 0, edited: 0, updated: "Oct 12", status: "closed" },
  { dataId: "S0950", exposure: "forum_post", top: "p_12f8ab3e6d", p: 0.52, canary: false, missing: 0, edited: 0, updated: "Oct 10", status: "closed" },
  { dataId: "S0912", exposure: "public_bucket", top: "svc_export", p: 0.94, canary: true, missing: 0, edited: 0, updated: "Oct 4", status: "closed" },
];

// ─── EVENT LOG (SCREEN 2) ────────────────────────────────────────────────────

export type LogEvent = {
  seq: number;
  eventId: string;
  time: string;
  actor: string;
  action: Action;
  target: string;
  dataId: string | null;
  status: number;
  prevHash: string;
  hash: string;
};

export type Gap = { after: number; missing: number };

function hex(n: number, len = 64) {
  let s = "";
  let x = (n * 2654435761) >>> 0;
  for (let i = 0; i < len; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += ((x >>> 16) % 16).toString(16);
  }
  return s;
}

function uuid(n: number) {
  const h = hex(n + 7, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const raw: [number, string, string, Action, string, string | null, number][] = [
  [1189, "14:32:04", "svc_export", "publish", "public_bucket", "S1001", 200],
  [1188, "14:32:02", "svc_fees", "transfer", "svc_export", "S1001", 200],
  [1187, "14:32:02", "svc_students", "transfer", "svc_export", "S1001", 200],
  [1186, "14:32:00", "p_a3f9c2d1e4", "request", "svc_export", "S1001", 200],
  [1182, "14:29:41", "svc_export", "read", "svc_students", "S1002", 200],
  [1181, "14:29:38", "p_7be21c04aa", "read", "svc_students", "S1001", 200],
  [1180, "14:29:12", "p_c90d5e7f13", "request", "svc_fees", "S1001", 403],
  [1179, "14:28:55", "p_12f8ab3e6d", "read", "svc_students", "S1002", 200],
  [1178, "14:28:40", "p_7be21c04aa", "read", "svc_students", "S1001", 200],
  [1177, "14:27:09", "svc_students", "transfer", "svc_fees", null, 200],
  [1176, "14:26:51", "p_5d0e8c71b2", "request", "svc_students", "S1017", 200],
  [1175, "14:26:30", "p_a3f9c2d1e4", "read", "svc_fees", "S1001", 200],
  [1174, "14:25:02", "p_93bc27e5f0", "read", "svc_students", "S0912", 404],
];

export const events: LogEvent[] = raw.map(([seq, time, actor, action, target, dataId, status]) => ({
  seq,
  eventId: uuid(seq),
  time,
  actor,
  action,
  target,
  dataId,
  status,
  prevHash: hex(seq - 1),
  hash: hex(seq),
}));

export const gaps: Gap[] = [{ after: 1182, missing: 3 }];

export const actions: Action[] = ["request", "read", "transfer", "publish"];

// ─── CHAIN VERIFICATION (SCREEN 3) ───────────────────────────────────────────

export const chain = { events: 1284, headSeq: 1289, verified: "2 min ago" };

export type Finding = {
  id: string;
  kind: "gap" | "tail" | "edit";
  after: number;
  missing: number;
  between: [string, string];
};

export const findings: Finding[] = [
  { id: "g1182", kind: "gap", after: 1182, missing: 3, between: ["svc_export", "p_c90d5e7f13"] },
  { id: "e904", kind: "edit", after: 904, missing: 0, between: ["p_7be21c04aa", "svc_students"] },
  { id: "g640", kind: "gap", after: 640, missing: 1, between: ["svc_students", "p_7be21c04aa"] },
  { id: "t1288", kind: "tail", after: 1288, missing: 1, between: ["public_bucket", "—"] },
];

export type Row = {
  seq: number | null;
  actor?: string;
  action?: string;
  target?: string;
  dataId?: string;
  hash?: string;
  state: "ok" | "missing" | "edited";
};

const chainActions = ["request", "transfer", "transfer", "read", "publish"];
const chainActors = ["p_a3f9c2d1e4", "svc_students", "svc_fees", "svc_export", "p_7be21c04aa"];
const chainTargets = ["svc_export", "svc_export", "svc_export", "svc_students", "public_bucket"];

function shortHex(n: number) {
  let s = "";
  let x = n * 2654435761;
  for (let i = 0; i < 8; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += (x % 16).toString(16);
  }
  return s;
}

function generateChainRow(seq: number, state: Row["state"] = "ok"): Row {
  const k = seq % 5;
  return {
    seq,
    actor: chainActors[k],
    action: chainActions[k],
    target: chainTargets[k],
    dataId: `S10${(seq % 40).toString().padStart(2, "0")}`,
    hash: shortHex(seq),
    state,
  };
}

/** Rows around a finding: two before, the hole or edit, two after. */
export function contextFor(f: Finding): Row[] {
  if (f.kind === "edit") {
    return [
      generateChainRow(f.after - 2),
      generateChainRow(f.after - 1),
      generateChainRow(f.after, "edited"),
      generateChainRow(f.after + 1),
      generateChainRow(f.after + 2),
    ];
  }
  const before = [generateChainRow(f.after - 2), generateChainRow(f.after - 1), generateChainRow(f.after)];
  const hole: Row[] = Array.from({ length: f.missing }, (_, i) => ({ seq: f.after + 1 + i, state: "missing" }));
  const after = f.kind === "tail" ? [] : [generateChainRow(f.after + f.missing + 1), generateChainRow(f.after + f.missing + 2)];
  return [...before, ...hole, ...after];
}

// ─── CUSTODIAN REVEAL (SCREEN 4) ─────────────────────────────────────────────

export type Identity = {
  pseudonym: string;
  real: string;
  role: string;
  cases: string[];
  topIn?: string;
};

export const identities: Identity[] = [
  { pseudonym: "p_a3f9c2d1e4", real: "Daniel Okafor", role: "Registrar", cases: ["S1001", "S0987"], topIn: "S1001" },
  { pseudonym: "p_7be21c04aa", real: "Priya Raman", role: "Finance officer", cases: ["S1001", "S1042"], topIn: "S1042" },
  { pseudonym: "p_c90d5e7f13", real: "Marcus Lee", role: "Data engineer", cases: ["S1001", "S0987"], topIn: "S0987" },
  { pseudonym: "p_12f8ab3e6d", real: "Hana Sato", role: "Advisor", cases: ["S1001", "S0950"] },
  { pseudonym: "p_5d0e8c71b2", real: "Tomás Rivera", role: "Admissions", cases: ["S1017"] },
  { pseudonym: "p_e64a1f09cd", real: "Amara Nwosu", role: "Library staff", cases: [] },
  { pseudonym: "p_93bc27e5f0", real: "Lena Fischer", role: "IT support", cases: ["S0912"] },
  { pseudonym: "p_0af4d6b83e", real: "Kenji Watanabe", role: "Registrar", cases: [] },
];

export type RevealEntry = { who: string; scope: string; when: string };

export const revealLog: RevealEntry[] = [
  { who: "Investigator", scope: "S1001", when: "2 min ago" },
  { who: "A. Mensah", scope: "All", when: "Yesterday 16:40" },
  { who: "Investigator", scope: "S0961", when: "Oct 12" },
  { who: "A. Mensah", scope: "S0912", when: "Oct 4" },
];

/**
 * In-memory student and fee records for the demo.
 *
 * Demo-only student and fee records.
 */

const students = {
  S1001: {
    id: "S1001",
    name: "Alice Nguyen",
    programme: "BSc Computer Science",
    year: 3,
    gpa: 3.72,
    note_ref: null,
  },
  S1002: {
    id: "S1002",
    name: "Bob Martinez",
    programme: "BA Economics",
    year: 2,
    gpa: 3.45,
    note_ref: null,
  },
  S1003: {
    id: "S1003",
    name: "Maya Patel",
    programme: "BSc Biology",
    year: 1,
    gpa: 3.81,
    note_ref: null,
  },
  S1004: {
    id: "S1004",
    name: "Leo Kim",
    programme: "BEng Electrical Engineering",
    year: 4,
    gpa: 3.28,
    note_ref: null,
  },
  S1005: {
    id: "S1005",
    name: "Nia Johnson",
    programme: "BA History",
    year: 2,
    gpa: 3.64,
    note_ref: null,
  },
};

const fees = {
  S1001: {
    id: "S1001",
    tuition: 12500,
    paid: 10000,
    balance: 2500,
    note_ref: null,
  },
  S1002: {
    id: "S1002",
    tuition: 11000,
    paid: 11000,
    balance: 0,
    note_ref: null,
  },
  S1003: {
    id: "S1003",
    tuition: 11800,
    paid: 8000,
    balance: 3800,
    note_ref: null,
  },
  S1004: {
    id: "S1004",
    tuition: 13200,
    paid: 13200,
    balance: 0,
    note_ref: null,
  },
  S1005: {
    id: "S1005",
    tuition: 10500,
    paid: 7000,
    balance: 3500,
    note_ref: null,
  },
};

/**
 * Get a student record by ID.
 */
function getStudentRecord(id) {
  const record = students[id];
  return record ? { ...record } : null;
}

/**
 * Get a fee record by ID.
 */
function getFeeRecord(id) {
  const record = fees[id];
  return record ? { ...record } : null;
}

/**
 * Get a combined export record (student + fees) by ID.
 */
function getExportRecord(id) {
  const student = students[id];
  const fee = fees[id];
  if (!student) return null;

  return {
    ...student,
    fees: fee ? { tuition: fee.tuition, paid: fee.paid, balance: fee.balance } : null,
  };
}

module.exports = { getStudentRecord, getFeeRecord, getExportRecord };

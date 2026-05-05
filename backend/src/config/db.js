const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbFile =
  process.env.DB_FILE || path.join(__dirname, "../../database.sqlite");

const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  /* =========================
     USERS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =========================
     GROUPS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      monthly_contribution REAL DEFAULT 1000,
      yearly_interest_target REAL DEFAULT 5000,
      monthly_interest_rate REAL DEFAULT 0.20,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  /* =========================
     MEMBERS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      is_signatory INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);

  /* =========================
     CONTRIBUTIONS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 1000,
      month TEXT NOT NULL,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY(approved_by) REFERENCES members(id)
    )
  `);

  /* =========================
     LOANS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      principal REAL NOT NULL,
      balance REAL NOT NULL,
      purpose TEXT,
      status TEXT DEFAULT 'pending',
      approvals INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      disbursed_at TEXT,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  /* =========================
     LOAN APPROVALS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS loan_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      signatory_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(loan_id, signatory_id),
      FOREIGN KEY(loan_id) REFERENCES loans(id) ON DELETE CASCADE,
      FOREIGN KEY(signatory_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  /* =========================
     PAYMENTS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      loan_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('contribution','loan_repayment')),
      amount REAL NOT NULL,
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY(loan_id) REFERENCES loans(id) ON DELETE SET NULL,
      FOREIGN KEY(approved_by) REFERENCES members(id)
    )
  `);

  /* =========================
     PAYMENT APPROVALS
  ========================= */

  await run(`
    CREATE TABLE IF NOT EXISTS payment_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      signatory_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(payment_id, signatory_id),
      FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY(signatory_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  console.log("SQLite database connected successfully");
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
};
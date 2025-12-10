const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'app.db');

let dbInstance = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
    const db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function get(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function init() {
  if (dbInstance) return dbInstance;
  const db = await openDb();

  // create tables
  await run(db, `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    note TEXT,
    date TEXT NOT NULL
  );`);

  await run(db, `CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT
  );`);

  // seed courses if empty
  const cnt = await get(db, 'SELECT COUNT(1) as c FROM courses');
  if (cnt && cnt.c === 0) {
    const stmt = db.prepare('INSERT INTO courses (title, description) VALUES (?, ?)');
    await new Promise((resolve, reject) => {
      let i = 1;
      function next() {
        if (i > 50) return stmt.finalize((err) => err ? reject(err) : resolve());
        stmt.run(`Course ${i}`, `Description for course ${i}`, (err) => {
          if (err) return reject(err);
          i++;
          // small next tick to avoid blocking
          setImmediate(next);
        });
      }
      next();
    });
  }

  dbInstance = db;
  return dbInstance;
}

function getDB() {
  if (!dbInstance) throw new Error('Database not initialized. Call init() first.');
  return dbInstance;
}

async function getRecentExpenses(limit = 5) {
  const db = getDB();
  return all(db, 'SELECT * FROM expenses ORDER BY date DESC LIMIT ?', [limit]);
}

async function getAllExpenses() {
  const db = getDB();
  return all(db, 'SELECT * FROM expenses ORDER BY date DESC');
}

async function getTotal() {
  const db = getDB();
  const row = await get(db, 'SELECT SUM(amount) as total FROM expenses');
  return row ? (row.total || 0) : 0;
}

async function addExpense(item) {
  const db = getDB();
  const { title, amount, type, note, date } = item;
  const res = await run(db, 'INSERT INTO expenses (title, amount, type, note, date) VALUES (?, ?, ?, ?, ?)', [title, amount, type, note, date]);
  return res ? res.lastID : null;
}

async function getCourses(perPage = 10) {
  const db = getDB();
  return all(db, 'SELECT * FROM courses LIMIT ?', [perPage]);
}

module.exports = { init, getDB, getRecentExpenses, getAllExpenses, getTotal, addExpense, getCourses };

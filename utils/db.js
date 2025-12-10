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
    category TEXT,
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

  // migrate JSON expenses if present (data/expenses.json)
  try {
    const jsonFile = path.join(DB_DIR, 'expenses.json');
    if (fs.existsSync(jsonFile)) {
      const raw = fs.readFileSync(jsonFile, 'utf8');
      const arr = JSON.parse(raw || '[]');
      if (Array.isArray(arr) && arr.length > 0) {
        for (const it of arr) {
          // avoid duplicates by checking same date+title
          // if date missing, skip
          if (!it.date) continue;
          const exists = await get(db, 'SELECT COUNT(1) as c FROM expenses WHERE date = ? AND title = ?', [it.date, it.title || '']);
          if (exists && exists.c > 0) continue;
          const title = it.title || 'Untitled';
          const amount = Number(it.amount) || 0;
          const type = it.type || 'expense';
          const category = it.category || null;
          const note = it.note || '';
          const date = it.date;
          await run(db, 'INSERT INTO expenses (title, amount, type, category, note, date) VALUES (?, ?, ?, ?, ?, ?)', [title, amount, type, category, note, date]);
        }
        // rename imported file to backup
        try {
          fs.renameSync(jsonFile, jsonFile + '.bak');
        } catch (e) {
          // ignore rename errors
        }
      }
    }
  } catch (e) {
    // ignore migration errors but log
    console.error('Expenses migration error:', e && e.stack ? e.stack : e);
  }

  dbInstance = db;
  return dbInstance;
}

// Add category column to existing table if missing (safe to run multiple times)
async function ensureCategoryColumn() {
  const db = await init();
  try {
    await run(db, "ALTER TABLE expenses ADD COLUMN category TEXT");
  } catch (e) {
    // SQLite throws if column exists; ignore
  }
}

// call once to ensure schema has category
ensureCategoryColumn().catch(() => {});

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
  const { title, amount, type, category, note, date } = item;
  const res = await run(db, 'INSERT INTO expenses (title, amount, type, category, note, date) VALUES (?, ?, ?, ?, ?, ?)', [title, amount, type, category || null, note, date]);
  return res ? res.lastID : null;
}

async function getCourses(perPage = 10) {
  const db = getDB();
  return all(db, 'SELECT * FROM courses LIMIT ?', [perPage]);
}

module.exports = { init, getDB, getRecentExpenses, getAllExpenses, getTotal, addExpense, getCourses };
async function resetAll() {
  const db = await init();
  await run(db, 'DELETE FROM expenses');
  await run(db, 'DELETE FROM courses');
  // reseed courses
  const stmt = db.prepare('INSERT INTO courses (title, description) VALUES (?, ?)');
  for (let i = 1; i <= 50; i++) {
    await new Promise((resolve, reject) => stmt.run(`Course ${i}`, `Description for course ${i}`, (err) => err ? reject(err) : resolve()));
  }
  stmt.finalize();
}

module.exports = { init, getDB, getRecentExpenses, getAllExpenses, getTotal, addExpense, getCourses, resetAll };

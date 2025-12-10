var express = require('express');
var router = express.Router();
var db = require('../utils/db');

// GET /api/v1/courses?per_page=2
router.get('/v1/courses', async function(req, res, next) {
  try {
    var perPage = parseInt(req.query.per_page, 10) || 10;
    if (perPage < 1) perPage = 1;
    var rows = await db.getCourses(perPage);
    // get total count
    const totalRow = await db.getDB().get('SELECT COUNT(1) as c FROM courses');
    var total = totalRow ? totalRow.c : rows.length;
    res.json({ data: rows, total: total, per_page: perPage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

// GET /api/v1/expenses/summary - returns daily totals and totals by type
router.get('/v1/expenses/summary', async function(req, res, next) {
  try {
    const dbConn = db.getDB();
    const daily = await new Promise((resolve, reject) => {
      dbConn.all("SELECT date(date) as d, SUM(amount) as total FROM expenses GROUP BY d ORDER BY d DESC LIMIT 30", [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    const types = await new Promise((resolve, reject) => {
      dbConn.all("SELECT type, SUM(amount) as total FROM expenses GROUP BY type", [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // return daily in chronological order (old -> new)
    res.json({ daily: (daily || []).slice().reverse(), types: types || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/expenses/events - return expense records as calendar events
router.get('/v1/expenses/events', async function(req, res, next) {
  try {
    const dbConn = db.getDB();
    const rows = await new Promise((resolve, reject) => {
      dbConn.all('SELECT id, title, amount, type, date FROM expenses ORDER BY date DESC', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    const events = (rows || []).map(r => ({
      id: r.id,
      title: `${r.title} (${r.amount})`,
      start: r.date,
      extendedProps: { amount: r.amount, type: r.type }
    }));
    res.json(events);
  } catch (err) {
    next(err);
  }
});

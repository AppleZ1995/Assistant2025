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

var express = require('express');
var router = express.Router();
var db = require('../utils/db');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    const recent = await db.getRecentExpenses(5);
    const total = await db.getTotal();
    res.render('index', { title: 'Assistant2025', recent: recent, total: total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

var express = require('express');
var router = express.Router();
var db = require('../utils/db');

// POST /admin/reset - reset all data (destructive)
router.post('/reset', async function(req, res, next) {
  try {
    await db.resetAll();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

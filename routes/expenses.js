var express = require('express');
var router = express.Router();
var db = require('../utils/db');

// GET /expenses - list all records
router.get('/', async function(req, res, next) {
  try {
    const items = await db.getAllExpenses();
    const total = await db.getTotal();
    res.render('expenses', { items: items, total: total });
  } catch (err) {
    next(err);
  }
});

// GET /expenses/new - form to add a record
router.get('/new', function(req, res, next) {
  res.render('new_expense');
});

// POST /expenses - add a new record
router.post('/', async function(req, res, next) {
  try {
    var title = req.body.title || 'Untitled';
    var amount = parseFloat(req.body.amount);
    if (isNaN(amount)) amount = 0;
    var type = req.body.type === 'income' ? 'income' : 'expense';
    var signed = type === 'income' ? Math.abs(amount) : -Math.abs(amount);
    var item = {
      title: title,
      amount: signed,
      type: type,
      category: req.body.category || null,
      note: req.body.note || '',
      date: new Date().toISOString()
    };
    await db.addExpense(item);
    res.redirect('/expenses');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

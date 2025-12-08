var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);

// catch 404 and respond appropriately for HTML, JSON, or plain text
app.use(function(req, res, next) {
  res.status(404);

  // Prefer JSON for API routes or when client prefers JSON
  if (req.path.startsWith('/api') || req.xhr || req.accepts('json') && !req.accepts('html')) {
    return res.json({ error: 'Not Found', url: req.originalUrl });
  }

  // Render HTML page for browsers
  if (req.accepts('html')) {
    return res.render('404', { url: req.originalUrl });
  }

  // Fallback to plain text
  res.type('txt').send('Not Found');
});

// error handler
app.use(function(err, req, res, next) {
  // If the error is a 404, render a friendly 404 page
  if (err.status === 404) {
    res.status(404);
    return res.render('404', { url: req.originalUrl });
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page for other errors
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

var express = require('express');
var router = express.Router();

// Simple in-memory sample data for courses
var sampleCourses = [];
for (var i = 1; i <= 50; i++) {
  sampleCourses.push({ id: i, title: 'Course ' + i, description: 'Description for course ' + i });
}

// GET /api/v1/courses?per_page=2
router.get('/v1/courses', function(req, res, next) {
  var perPage = parseInt(req.query.per_page, 10) || 10;
  if (perPage < 1) perPage = 1;
  var limited = sampleCourses.slice(0, perPage);
  res.json({ data: limited, total: sampleCourses.length, per_page: perPage });
});

module.exports = router;

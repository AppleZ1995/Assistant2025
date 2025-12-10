var fs = require('fs');
var path = require('path');

var dataDir = path.join(__dirname, '..', 'data');
var filePath = path.join(dataDir, 'expenses.json');

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf8');
}

function read() {
  try {
    ensure();
    var raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function write(items) {
  ensure();
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
}

module.exports = { read: read, write: write };

const fs = require('fs');
const path = require('path');
const { generate } = require('./codegen');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_PATH = path.join(ROOT, 'content', 'data.json');
const BACKUP_PATH = path.join(ROOT, 'content', 'data.json.bak');
const GENERATED_PATH = path.join(ROOT, 'content-data.js');

function load() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function regenerate(data) {
  const code = generate(data);
  const tmp = `${GENERATED_PATH}.tmp`;
  fs.writeFileSync(tmp, code, 'utf8');
  fs.renameSync(tmp, GENERATED_PATH);
}

function save(data) {
  if (fs.existsSync(DATA_PATH)) {
    fs.copyFileSync(DATA_PATH, BACKUP_PATH);
  }
  const tmp = `${DATA_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, DATA_PATH);
  regenerate(data);
}

module.exports = { load, save, regenerate, ROOT, DATA_PATH };

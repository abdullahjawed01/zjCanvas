// Manages server/.env — session secret + admin password hash. Never stores
// a plaintext password on disk: if ADMIN_PASSWORD is supplied (env or a
// first-run .env line) it is hashed once and the plaintext is discarded; if
// nothing is supplied at all, a random password is generated and printed to
// the console a single time on first boot.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('./auth');

const ENV_PATH = path.join(__dirname, '..', '.env');

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  });
  return result;
}

function writeEnvFile(filePath, values) {
  const lines = Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function generatePassword(length = 14) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += charset[bytes[i] % charset.length];
  return out;
}

function currentPort(stored) {
  return process.env.PORT || stored.PORT || '3000';
}

function persist(sessionSecret, passwordHash, stored) {
  writeEnvFile(ENV_PATH, {
    SESSION_SECRET: sessionSecret,
    ADMIN_PASSWORD_HASH: passwordHash,
    PORT: currentPort(stored),
    NODE_ENV: process.env.NODE_ENV || stored.NODE_ENV || 'development',
  });
}

function ensureCredentials() {
  const stored = parseEnvFile(ENV_PATH);
  let changed = false;

  let sessionSecret = process.env.SESSION_SECRET || stored.SESSION_SECRET;
  if (!sessionSecret) {
    sessionSecret = crypto.randomBytes(48).toString('hex');
    changed = true;
  }

  let passwordHash = process.env.ADMIN_PASSWORD_HASH || stored.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    const suppliedPlaintext = process.env.ADMIN_PASSWORD || stored.ADMIN_PASSWORD;
    const plaintext = suppliedPlaintext || generatePassword();
    passwordHash = hashPassword(plaintext);
    changed = true;
    if (!suppliedPlaintext) {
      // eslint-disable-next-line no-console
      console.log('\n============================================================');
      console.log(' zjCanvas Admin — generated password (shown once, save it):');
      console.log(` ${plaintext}`);
      console.log(' Log in at /admin, then change it from the Settings tab.');
      console.log('============================================================\n');
    }
  }

  process.env.SESSION_SECRET = sessionSecret;
  process.env.ADMIN_PASSWORD_HASH = passwordHash;
  process.env.NODE_ENV = process.env.NODE_ENV || stored.NODE_ENV || 'development';
  process.env.PORT = currentPort(stored);

  if (changed) persist(sessionSecret, passwordHash, stored);
}

function updatePassword(newPlain) {
  const hash = hashPassword(newPlain);
  process.env.ADMIN_PASSWORD_HASH = hash;
  const stored = parseEnvFile(ENV_PATH);
  persist(process.env.SESSION_SECRET, hash, stored);
}

module.exports = { ensureCredentials, updatePassword, ENV_PATH };

const express = require('express');
const { verifyPassword, isRateLimited, recordFailedAttempt, clearAttempts } = require('../lib/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  const { password } = req.body || {};
  if (!verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  clearAttempts(ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error, please retry.' });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});

router.post('/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => {
    res.clearCookie('zjc_admin_sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

module.exports = router;

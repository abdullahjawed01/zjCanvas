const path = require('path');
const express = require('express');
const session = require('express-session');

const credentials = require('./lib/credentials');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

credentials.ensureCredentials();

const ROOT = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind nginx in production

app.use(express.json({ limit: '2mb' }));
app.use(session({
  name: 'zjc_admin_sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 12 * 60 * 60 * 1000, // 12h
  },
}));

app.use('/api/admin', authRoutes);
app.use('/api/admin', apiRoutes);

app.use('/admin', express.static(path.join(__dirname, 'public_admin')));

// Never serve server internals or the raw content store / secrets if this
// process is hit directly for a path nginx would otherwise deny.
app.use((req, res, next) => {
  if (/^\/(server|content)(\/|$)/.test(req.path) || /\.(env|bak)$/i.test(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(ROOT));

app.use((req, res) => {
  res.status(404).sendFile(path.join(ROOT, '404.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`zjCanvas admin server listening on port ${port} (${isProd ? 'production' : 'development'})`);
});

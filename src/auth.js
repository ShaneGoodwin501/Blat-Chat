// Auth helpers: password hashing, session middleware, role check.
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const path = require('path');

const BCRYPT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// Express middleware: 401 if not logged in.
//
// /api/* paths always get a JSON 401, even if the Accept header would
// prefer HTML. The previous implementation used `req.accepts('html')`
// as a proxy for "is this a browser navigation?" — but fetch() calls
// from chat.js don't set an Accept header (so it defaults to */*, and
// Express's content negotiation picks html), which sent 302 redirects
// to /login. The browser followed the redirect, got the login page
// HTML (200), and the client crashed trying to JSON.parse it.
//
// HTML routes (/) keep the redirect-to-login behaviour so the user
// gets a normal browser experience when they hit the site directly.
//
// Note: we check both req.path and (req.baseUrl + req.path) because
// when this middleware is used INSIDE a mounted router
// (app.use('/api/auth', router); router.get('/me', requireAuth, ...))
// the inner req.path is RELATIVE to the mount point — it's `/me`,
// not `/api/auth/me`. req.baseUrl gives the mount path, so the
// combined string is the full URL.
function isApiPath(req) {
  if (req.path.startsWith('/api/')) return true;
  if ((req.baseUrl || '').startsWith('/api/')) return true;
  return false;
}
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (isApiPath(req)) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  if (req.accepts('html')) return res.redirect('/login');
  return res.status(401).json({ error: 'not_authenticated' });
}

// Express middleware: 403 if not admin. Always JSON (only ever used on
// /api/admin/* routes, so no HTML-redirect ambiguity).
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'not_authenticated' });
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

function buildSessionMiddleware(db) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error('FATAL: SESSION_SECRET is missing or too short. Generate one with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    process.exit(1);
  }
  return session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 900000 } }),
    secret,
    resave: false,
    saveUninitialized: false,
    name: 'blatchat.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.PUBLIC_ORIGIN ? process.env.PUBLIC_ORIGIN.startsWith('https') : false,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  });
}

module.exports = { hashPassword, verifyPassword, requireAuth, requireAdmin, buildSessionMiddleware };

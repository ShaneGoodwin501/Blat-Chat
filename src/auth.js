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

// Express middleware: 401 if not logged in
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.accepts('html') && !req.xhr) return res.redirect('/login');
  return res.status(401).json({ error: 'not_authenticated' });
}

// Express middleware: 403 if not admin
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

// Blat-Chat entry point.
// Single Node process: Express + Socket.IO on the same port, behind nginx in prod.

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const { Server: SocketIOServer } = require('socket.io');

const { init: initDb } = require('./src/db');
const { buildSessionMiddleware, hashPassword, requireAuth } = require('./src/auth');
const { buildAuthRouter } = require('./src/routes/auth');
const { buildChatRouter } = require('./src/routes/chat');
const { buildAdminRouter } = require('./src/routes/admin');
const { buildUploadRouter } = require('./src/routes/upload');
const { buildAvatarRouter } = require('./src/routes/avatar');
const { buildPublicSettingsRouter, buildAdminSettingsRouter, buildUserLanguageRouter, getDefaultLanguage, getEffectiveLanguage } = require('./src/routes/settings');
const { attachSockets } = require('./src/sockets');

// ---- Config ----
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || '';

if (TRUST_PROXY) {
  console.log('Trusting X-Forwarded-* from proxy');
}

// ---- DB ----
const db = initDb(DATA_DIR);

// ---- Bootstrap admin from env (only if users table is empty) ----
(function bootstrapAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn('No users in DB and ADMIN_USERNAME/ADMIN_PASSWORD not set.');
    console.warn('Create the first user by running:  npm run create-user -- <username> <password> --admin');
    return;
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD is too short (min 8). Edit .env and restart.');
    process.exit(1);
  }
  db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, active)
    VALUES (?, ?, ?, 'admin', 1)
  `).run(username, hashPassword(password), username);
  console.log(`Bootstrap admin '${username}' created. Set a strong password in production.`);
})();

// ---- App ----
const app = express();
app.set('trust proxy', TRUST_PROXY ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false, // turn off helmet's default `upgrade-insecure-requests` — it forces HTTP→HTTPS even when there is no HTTPS
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.socket.io"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "ws:", "wss:"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const sessionMiddleware = buildSessionMiddleware(db);
app.use(sessionMiddleware);

app.use(express.urlencoded({ extended: false, limit: '64kb' }));
// Global JSON body size cap. Per-route express.json() is still allowed
// (for uploads/forms), but a 64KB cap here prevents giant JSON bodies
// from clogging the parser. Larger multipart bodies go through multer.
app.use(express.json({ limit: '64kb' }));

// Serve uploaded files to authenticated users only
const uploadsDir = path.join(DATA_DIR, 'uploads');
app.get('/uploads/:filename', requireAuth, (req, res) => {
  const safe = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, safe);
  if (!filePath.startsWith(uploadsDir)) return res.status(400).end();
  if (!fs.existsSync(filePath)) return res.status(404).end();
  const att = db.prepare('SELECT mime FROM attachments WHERE filename = ?').get(safe);
  res.setHeader('Content-Type', att?.mime || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

// Serve profile photos. Always JPEG. Long cache is fine because we
// version the URL with ?v=<ts> from the client.
const avatarDir = path.join(DATA_DIR, 'avatars');
app.get('/avatars/:user_id', requireAuth, (req, res) => {
  const id = String(req.params.user_id).replace(/[^0-9]/g, '');
  if (!id) return res.status(400).end();
  const filePath = path.join(avatarDir, `${id}.jpg`);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

// HTML routes FIRST — must run before the static middleware, otherwise
// express.static with `extensions: ['html']` will serve /admin and /
// by mapping them to admin.html / index.html directly, bypassing our auth.
function sendHtml(req, res, file) {
  // Inject the user's effective language (own preference, else admin default)
  // into the markup so the client can render in the right language
  // synchronously (no async fetch, no flash of English). Set
  // Cache-Control: no-store so the back-forward cache doesn't restore
  // a stale page with the previous language.
  try {
    const html = fs.readFileSync(path.join(__dirname, 'public', file), 'utf-8');
    const userId = req.session && req.session.userId;
    const lang = getEffectiveLanguage(db, userId);
    const rendered = html
      .replace(/<meta name="blatchat-lang" content="[^"]*">/, `<meta name="blatchat-lang" content="${lang}">`)
      .replace('__BLATCHAT_LANG__', lang);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.type('html').send(rendered);
  } catch (e) {
    res.status(500).end('Failed to render page.');
  }
}

app.get('/', requireAuth, (req, res) => sendHtml(req, res, 'index.html'));
app.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/');
  sendHtml(req, res, 'login.html');
});
app.get('/admin', requireAuth, (req, res) => {
  if (req.session?.role !== 'admin') return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
  sendHtml(req, res, 'admin.html');
});
app.get('/403', (req, res) => sendHtml(req, res, '403.html'));

// Serve the PWA manifest with the correct content type so Android Chrome
// recognises it (express.static would otherwise send application/json).
// Must be registered BEFORE the static middleware below, otherwise the
// static handler will claim the request first.
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Static frontend assets (CSS, JS, images). `index: false` + no extensions
// so it only serves files that actually exist under /public/.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API
app.use('/api/auth', buildAuthRouter(db));
app.use('/api', buildChatRouter(db));
app.use('/api/admin', buildAdminRouter(db, () => io, DATA_DIR));
app.use('/api/admin', buildAdminSettingsRouter(db));
app.use('/api', buildUploadRouter(db, DATA_DIR));
app.use('/api/auth', buildAvatarRouter(db, DATA_DIR));
app.use('/api/auth', buildUserLanguageRouter(db));
app.use('/api/settings', buildPublicSettingsRouter(db));

// Health
app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Server + Socket.IO ----
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: PUBLIC_ORIGIN ? { origin: PUBLIC_ORIGIN, credentials: true } : {},
});
attachSockets(io, db, sessionMiddleware);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Blat-Chat listening on http://127.0.0.1:${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
});

process.on('SIGTERM', () => server.close(() => db.close()));
process.on('SIGINT', () => server.close(() => process.exit(0)));

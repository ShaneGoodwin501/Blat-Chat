# Blat-Chat

A small, family-only chat room with user auth, admin-managed access, and
photo sharing. Built for a single chat room with shared history visible
to every authenticated member.

## Features

- 🔐 User accounts with bcrypt-hashed passwords (admin creates users)
- 💬 Single shared chat room — everyone sees the same history
- 📷 Photo uploads (JPG, PNG, GIF, WebP) up to 10MB, stored on the server
- 🎤 Voice messages via the browser's MediaRecorder, up to 5 minutes
- 🌓 Dark theme, white text, mobile-friendly responsive layout
- 🪪 Change your nickname in chat at any time
- 🛠 Admin page: create, rename, reset password, promote/demote, disable, delete
- 🧹 Danger zone: bulk-delete all messages or "keep last N days"
- 🌐 Bilingual UI: English + Russian, switchable per-user
- 🔌 Real-time over WebSockets (Socket.IO) with HTTP polling fallback
- 📱 PWA-installable (iOS via Share → Add to Home Screen, Android via the manifest)
- 🔒 HTTPS-only in production (nginx + Let's Encrypt; see `deploy/setup-https.sh`)

## Stack

- **Backend**: Node.js 20+, Express 4, Socket.IO 4, better-sqlite3 11
- **Auth**: bcryptjs + express-session backed by SQLite
- **Frontend**: vanilla HTML/CSS/JS, no build step
- **Storage**: SQLite (`blatchat.db`) + filesystem (`uploads/`) under `DATA_DIR`
- **Reverse proxy**: nginx in production (see `deploy/nginx.conf`)

## Quick start (local)

```sh
# 1. Install
git clone https://github.com/ShaneGoodwin501/Blat-Chat.git
cd Blat-Chat
npm install

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET to a long random string.
# Generate one with:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the first admin user
npm run create-user -- shane <a-strong-password> --admin

# 4. Run
npm start
# → open http://127.0.0.1:3000
```

## Configuration (.env)

| Variable | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | yes | 32+ char random string. Used to sign session cookies. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | first run only | Bootstrap admin is created from these if the users table is empty. After the first user exists, set new passwords through the admin page. |
| `PORT` | no | Defaults to 3000. Bind to 127.0.0.1 when behind nginx. |
| `DATA_DIR` | no | Defaults to `./data`. Set to `/var/lib/blatchat` in production. |
| `PUBLIC_ORIGIN` | no | e.g. `https://chat.example.com`. Enables `secure` cookies and CORS. |
| `TRUST_PROXY` | no | `1` if behind nginx (so `req.ip` reflects the real client). |

## Production deployment

See `deploy/README.md` for the full step-by-step on a fresh Linode Nanode 1GB
running Ubuntu 24.04. The short version: install Node 22, clone the repo,
set `.env`, install the systemd unit, set up nginx + Let's Encrypt.

## Security notes

- Passwords: bcryptjs, 12 rounds. Min 8 chars on create/reset.
- Session cookies: `HttpOnly`, `SameSite=Strict`, `Secure` when `PUBLIC_ORIGIN` is HTTPS.
- Login: rate-limited to 20 attempts per 15 min per IP.
- Uploads: MIME and size validated, random UUID filenames (no path traversal).
- Helmet: CSP, X-Content-Type-Options, etc. CSP disables inline scripts and
  restricts connect-src to same-origin + ws/wss.
- SQL: every query is a prepared statement. No string interpolation.
- Output: every user-supplied string is HTML-escaped on render.
- Last-admin guard: you can't demote, disable, or delete the only remaining admin.

## Layout

```
.
├── server.js              # Express + Socket.IO entry point
├── package.json
├── .env.example
├── scripts/
│   └── create-user.js     # CLI: create users from the terminal
├── src/
│   ├── auth.js            # bcrypt, sessions, role check
│   ├── db.js              # SQLite schema
│   ├── sockets.js         # Socket.IO message + nickname
│   └── routes/
│       ├── auth.js        # /api/auth/{login,logout,me,password,avatar,preferred-language}
│       ├── chat.js        # /api/messages
│       ├── admin.js       # /api/admin/{users,messages}
│       ├── upload.js      # /api/{upload,upload-audio}
│       ├── avatar.js      # /api/auth/avatar
│       └── settings.js    # /api/{settings,admin/settings}
├── public/
│   ├── login.html
│   ├── index.html         # main chat
│   ├── admin.html         # user management
│   ├── 403.html
│   ├── manifest.json      # PWA manifest
│   ├── icons/             # PWA icons
│   ├── css/style.css
│   └── js/
│       ├── ui.js          # shared utilities (escapeHtml, modal, toast, …)
│       ├── i18n.js        # EN+RU translations
│       ├── viewport-height.js
│       ├── password-reveal.js
│       ├── avatar-crop.js
│       ├── login.js
│       ├── chat.js
│       └── admin.js
└── deploy/
    ├── blatchat.service
    ├── nginx.conf         # HTTPS-only site config (substitute your domain)
    ├── setup-https.sh     # one-shot certbot + nginx HTTPS setup
    └── README.md
```

## License

MIT (or whatever you decide — it's your family code, your call).

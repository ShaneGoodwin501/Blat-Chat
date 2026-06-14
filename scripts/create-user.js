#!/usr/bin/env node
// Create a user from the command line. Useful for the first admin
// when ADMIN_USERNAME/ADMIN_PASSWORD are not set in .env.
//
// Usage:
//   npm run create-user -- <username> <password>
//   npm run create-user -- <username> <password> --admin
//   npm run create-user -- <username> <password> --display "Nick Name"

require('dotenv').config();
const path = require('path');
const { init: initDb } = require('../src/db');
const { hashPassword } = require('../src/auth');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npm run create-user -- <username> <password> [--admin] [--display "Name"]');
  process.exit(2);
}
const [username, password] = args;
const isAdmin = args.includes('--admin');
const displayIdx = args.indexOf('--display');
const displayName = displayIdx > -1 ? args[displayIdx + 1] : username;

if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
  console.error('Username must be 3-32 chars: letters, digits, _ . -');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const db = initDb(dataDir);

const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
if (exists) {
  console.error(`User '${username}' already exists.`);
  process.exit(1);
}

db.prepare(`
  INSERT INTO users (username, password_hash, display_name, role, active)
  VALUES (?, ?, ?, ?, 1)
`).run(username, hashPassword(password), displayName, isAdmin ? 'admin' : 'user');

console.log(`Created user '${username}' (${displayName}) as ${isAdmin ? 'admin' : 'user'}`);
db.close();

// Photo uploads. Stored under DATA_DIR/uploads/ with a UUID filename.
// Only image MIME types, max 5MB. Auth required.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth } = require('../auth');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function buildUploadRouter(db, dataDir) {
  const router = express.Router();
  const uploadDir = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8).replace(/[^a-z0-9.]/g, '');
      const id = crypto.randomBytes(16).toString('hex');
      cb(null, `${id}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('bad_mime'));
      cb(null, true);
    },
  });

  // POST /upload (multipart/form-data, field "photo")
  router.post('/upload', requireAuth, (req, res) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        if (err.message === 'bad_mime') return res.status(400).json({ error: 'bad_mime' });
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large' });
        console.error('upload error', err);
        return res.status(500).json({ error: 'upload_failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'no_file' });

      const info = db.prepare(`
        INSERT INTO attachments (filename, original_name, mime, size, uploaded_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.session.userId);
      res.json({
        ok: true,
        attachment: {
          id: info.lastInsertRowid,
          filename: req.file.filename,
          original_name: req.file.originalname,
          mime: req.file.mimetype,
          size: req.file.size,
        },
      });
    });
  });

  return router;
}

module.exports = { buildUploadRouter };

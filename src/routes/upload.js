// Photo uploads. Stored under DATA_DIR/uploads/ with a UUID filename.
// Only image MIME types, max 5MB raw, but the server resizes anything
// larger than 1600px on the long edge to keep storage and bandwidth sane.
// Auth required.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { requireAuth } = require('../auth');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;       // resize anything larger than this on the long edge
const JPEG_QUALITY = 82;
const PNG_COMPRESSION = 8;

function buildUploadRouter(db, dataDir) {
  const router = express.Router();
  const uploadDir = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // We keep the file extension the client claims (sanitised) so static
  // serving can set the right Content-Type, but we re-save as JPEG/PNG
  // ourselves, so this is purely cosmetic.
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8).replace(/[^a-z0-9.]/g, '') || '.jpg';
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

  // Resize a saved file in-place. Returns the final on-disk filename,
  // the detected mime type, and the new size in bytes. Drops files we
  // can't process and rejects the upload.
  async function compressInPlace(filePath, claimedMime) {
    let pipeline = sharp(filePath, { failOn: 'none' }).rotate();
    const meta = await pipeline.metadata();
    if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      pipeline = pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });
    }
    const isPng = claimedMime === 'image/png';
    const isWebp = claimedMime === 'image/webp';
    const isGif = claimedMime === 'image/gif';
    // GIFs are animated; we keep the original to preserve animation. Same
    // for very small files where re-encoding would be a quality loss.
    const isSmall = (meta.width || 0) <= MAX_DIMENSION && (meta.height || 0) <= MAX_DIMENSION;
    if (isGif || (isSmall && (meta.size || 0) < 200 * 1024)) {
      // Don't re-encode; just read size back.
      return { mime: claimedMime, size: fs.statSync(filePath).size };
    }
    let buffer;
    if (isPng) {
      buffer = await pipeline.png({ compressionLevel: PNG_COMPRESSION }).toBuffer();
    } else if (isWebp) {
      buffer = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
    } else {
      // Default to JPEG for image/jpeg and unknown.
      buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }
    fs.writeFileSync(filePath, buffer);
    return { mime: isPng ? 'image/png' : (isWebp ? 'image/webp' : 'image/jpeg'), size: buffer.length };
  }

  // POST /upload (multipart/form-data, field "photo")
  router.post('/upload', requireAuth, (req, res) => {
    upload.single('photo')(req, res, async (err) => {
      if (err) {
        if (err.message === 'bad_mime') return res.status(400).json({ error: 'bad_mime' });
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large' });
        console.error('upload error', err);
        return res.status(500).json({ error: 'upload_failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'no_file' });

      try {
        const { mime, size } = await compressInPlace(req.file.path, req.file.mimetype);
        const info = db.prepare(`
          INSERT INTO attachments (filename, original_name, mime, size, uploaded_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.file.filename, req.file.originalname, mime, size, req.session.userId);
        res.json({
          ok: true,
          attachment: {
            id: info.lastInsertRowid,
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime,
            size,
          },
        });
      } catch (e) {
        // Clean up the temp file on any processing error.
        try { fs.unlinkSync(req.file.path); } catch {}
        console.error('upload process error', e);
        res.status(500).json({ error: 'process_failed' });
      }
    });
  });

  return router;
}

module.exports = { buildUploadRouter };

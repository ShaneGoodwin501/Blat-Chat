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
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;       // resize anything larger than this on the long edge
const JPEG_QUALITY = 82;
const PNG_COMPRESSION = 8;

// Voice messages: small set of MIMEs the browser can produce via
// MediaRecorder. The server stores them verbatim — no transcoding — so
// the same codec flows end-to-end. Order matters: a real recorded
// .webm on Chrome should not be flipped to mp4 server-side.
const ALLOWED_AUDIO_MIME = new Set([
  'audio/webm', 'audio/webm;codecs=opus',
  'audio/ogg', 'audio/ogg;codecs=opus',
  'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac',
]);
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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

  // Voice messages: same on-disk layout, but the file extension is
  // derived from the MIME (the browser sends a Blob whose `name` is
  // empty, so `path.extname('')` would yield no extension and the
  // static handler would lose the codec info).
  const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const id = crypto.randomBytes(16).toString('hex');
      const mime = (file.mimetype || '').toLowerCase();
      let ext = '.bin';
      if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('ogg')) ext = '.ogg';
      else if (mime.includes('mp4')) ext = '.m4a';
      else if (mime.includes('mpeg')) ext = '.mp3';
      else if (mime.includes('wav')) ext = '.wav';
      else if (mime.includes('aac')) ext = '.aac';
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

  const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: MAX_AUDIO_BYTES },
    fileFilter: (req, file, cb) => {
      // Browsers vary in what they put in the Blob's `type` for
      // MediaRecorder output. The formData appends a File with a
      // client-supplied name too — see client side. We accept any
      // audio/* MIME that matches our allow-list.
      const mt = (file.mimetype || '').toLowerCase();
      if (!ALLOWED_AUDIO_MIME.has(mt)) return cb(new Error('bad_mime'));
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

  // POST /upload-audio (multipart/form-data, field "audio")
  // Voice messages. No transcoding — we store the codec the client
  // produced so the same <audio> element plays it on the receiver's
  // browser. Records duration in `extra` so the receiver can show it
  // before the file finishes loading.
  router.post('/upload-audio', requireAuth, (req, res) => {
    uploadAudio.single('audio')(req, res, (err) => {
      if (err) {
        if (err.message === 'bad_mime') return res.status(400).json({ error: 'bad_mime' });
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large' });
        console.error('audio upload error', err);
        return res.status(500).json({ error: 'upload_failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'no_file' });

      const size = fs.statSync(req.file.path).size;
      const duration = Math.max(0, Math.min(3600, Number(req.body && req.body.duration) || 0));
      const originalName = (req.body && req.body.original_name) ? String(req.body.original_name).slice(0, 200) : 'voice-message';
      try {
        const info = db.prepare(`
          INSERT INTO attachments (filename, original_name, mime, size, uploaded_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.file.filename, originalName, req.file.mimetype, size, req.session.userId);
        res.json({
          ok: true,
          attachment: {
            id: info.lastInsertRowid,
            filename: req.file.filename,
            original_name: originalName,
            mime: req.file.mimetype,
            size,
            duration,
          },
        });
      } catch (e) {
        try { fs.unlinkSync(req.file.path); } catch {}
        console.error('audio upload process error', e);
        res.status(500).json({ error: 'process_failed' });
      }
    });
  });

  return router;
}

module.exports = { buildUploadRouter };

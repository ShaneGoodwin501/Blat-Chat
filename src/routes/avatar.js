// Profile-photo upload. Stored as DATA_DIR/avatars/<user_id>.jpg (always
// square, always JPEG, 256x256). The browser does the cropping before
// upload; the server just validates and stores.
//
// DELETE removes the avatar (revert to initials).

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { requireAuth } = require('../auth');

const MAX_BYTES = 2 * 1024 * 1024; // 2MB upload cap
const FINAL_SIZE = 256;             // final square edge
const FINAL_MIME = 'image/jpeg';

function buildAvatarRouter(db, dataDir) {
  const router = express.Router();
  const avatarDir = path.join(dataDir, 'avatars');
  if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES },
    fileFilter: (req, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        return cb(new Error('bad_mime'));
      }
      cb(null, true);
    },
  });

  // POST /api/auth/avatar — multipart/form-data, field "avatar"
  router.post('/avatar', requireAuth, (req, res) => {
    upload.single('avatar')(req, res, async (err) => {
      if (err) {
        if (err.message === 'bad_mime') return res.status(400).json({ error: 'bad_mime' });
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large' });
        console.error('avatar upload error', err);
        return res.status(500).json({ error: 'upload_failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'no_file' });

      try {
        // Re-encode to a 256x256 JPEG centred on the image. The browser
        // already did the user-facing crop; this normalises format and
        // strips any EXIF / metadata.
        const out = await sharp(req.file.buffer)
          .rotate() // honour EXIF orientation
          .resize(FINAL_SIZE, FINAL_SIZE, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();

        const target = path.join(avatarDir, `${req.session.userId}.jpg`);
        fs.writeFileSync(target, out);

        db.prepare('UPDATE users SET has_avatar = 1 WHERE id = ?').run(req.session.userId);

        // Build a versioned URL so the browser can cache-bust.
        const ts = Date.now();
        res.json({ ok: true, url: `/avatars/${req.session.userId}?v=${ts}` });
      } catch (e) {
        console.error('avatar process error', e);
        res.status(500).json({ error: 'process_failed' });
      }
    });
  });

  // DELETE /api/auth/avatar — remove the user's avatar, revert to initials.
  router.delete('/avatar', requireAuth, (req, res) => {
    const target = path.join(avatarDir, `${req.session.userId}.jpg`);
    try {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    } catch (e) {
      console.error('avatar delete error', e);
    }
    db.prepare('UPDATE users SET has_avatar = 0 WHERE id = ?').run(req.session.userId);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { buildAvatarRouter };

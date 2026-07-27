const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const uploadsDir = path.join(__dirname, '..', '..', config.uploadsDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_EXT = ['.mp4', '.webm', '.mov', '.avi'];

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(Object.assign(new Error(`Formato no soportado. Usar: ${ALLOWED_EXT.join(', ')}`), { status: 400 }));
  },
});

module.exports = upload;

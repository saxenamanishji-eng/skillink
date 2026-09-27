import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicUploadsDir = path.join(__dirname, '../public/uploads/avatars');
const secureUploadsDir = path.join(__dirname, '../secure_uploads/attachments');

// Ensure directories exist
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
if (!fs.existsSync(secureUploadsDir)) {
  fs.mkdirSync(secureUploadsDir, { recursive: true });
}

// Avatar Storage (Publicly readable)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, publicUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user ? req.user.id : 'anon'}-${uniqueSuffix}${ext}`);
  }
});

// Secure Attachment Storage (Not statically served)
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, secureUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `attach-${req.user ? req.user.id : 'anon'}-${uniqueSuffix}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed for profile pictures.'));
};

const documentFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|txt|docx|zip/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ext) {
    return cb(null, true);
  }
  cb(new Error('Invalid attachment format. Allowed: PNG, JPG, PDF, TXT, DOCX, ZIP.'));
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: imageFilter
});

export const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: documentFilter
});

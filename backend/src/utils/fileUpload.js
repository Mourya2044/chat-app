import multer, { diskStorage } from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, '../../uploads');

// Ensure upload directories exist
['images', 'videos', 'files'].forEach(dir => {
  const dirPath = join(UPLOAD_DIR, dir);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
});

const storage = diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'files';
    if (file.mimetype.startsWith('image/')) subDir = 'images';
    else if (file.mimetype.startsWith('video/')) subDir = 'videos';
    cb(null, join(UPLOAD_DIR, subDir));
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

// Upload route handler
const uploadFile = (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  let subDir = 'files';
  if (file.mimetype.startsWith('image/')) subDir = 'images';
  else if (file.mimetype.startsWith('video/')) subDir = 'videos';

  const fileUrl = `/uploads/${subDir}/${file.filename}`;

  res.json({
    fileUrl,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    messageType: subDir === 'images' ? 'image' : subDir === 'videos' ? 'video' : 'file'
  });
};

export { upload, uploadFile };

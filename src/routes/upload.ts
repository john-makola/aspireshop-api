import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// Ensure directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${uuid()}${ext}`);
  },
});

const allowedMimes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG"));
    }
  },
});

const router = Router();

// POST /api/upload
router.post("/", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  res.json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
  });
});

export default router;

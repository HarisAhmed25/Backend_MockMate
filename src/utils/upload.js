/**
 * Multer Upload Utility (Video Upload)
 * -------------------------------------
 * - Temporary storage in /uploads folder
 * - Only accepts video files (.mp4, .webm, .mkv)
 * - Rejects non-video uploads
 * - Safe and compatible with Firebase upload logic
 */

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created /uploads temporary folder");
}

// Allowed video formats
const allowedVideoTypes = ["video/mp4", "video/webm", "video/mkv"];

// Multer storage engine for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

// File filter to ensure only video uploads
const fileFilter = (req, file, cb) => {
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed"), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
});

module.exports = upload;

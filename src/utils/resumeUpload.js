/**
 * Multer Upload Utility (Resume Upload)
 * -------------------------------------
 * - Temporary storage in /uploads/resumes folder
 * - Only accepts resume files (PDF, DOC, DOCX, images)
 * - Max file size: 10MB
 * - Rejects non-resume uploads
 */

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/resumes");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created /uploads/resumes temporary folder");
}

// Allowed resume file types
const allowedMimeTypes = [
  "application/pdf", // PDF
  "application/msword", // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "image/jpeg", // JPEG
  "image/jpg", // JPG
  "image/png", // PNG
  "image/gif", // GIF
  "image/webp" // WEBP
];

// Allowed file extensions
const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Multer storage engine for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `resume_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter to ensure only resume files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, and image files (JPG, PNG, GIF, WEBP) are allowed"), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

module.exports = upload;


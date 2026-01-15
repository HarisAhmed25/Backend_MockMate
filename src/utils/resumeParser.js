/**
 * Resume Parser Utility
 * ----------------------
 * Extracts text from various resume file formats:
 * - PDF files
 * - DOC/DOCX files
 * - Image files (using OCR)
 */

const fs = require("fs");
const path = require("path");

// Lazy load modules to avoid errors if packages aren't installed
let pdfParse = null;
let mammoth = null;
let Tesseract = null;

function loadPdfParse() {
  if (!pdfParse) {
    try {
      pdfParse = require("pdf-parse");
    } catch (err) {
      throw new Error("pdf-parse package is not installed. Please run: npm install pdf-parse");
    }
  }
  return pdfParse;
}

function loadMammoth() {
  if (!mammoth) {
    try {
      mammoth = require("mammoth");
    } catch (err) {
      throw new Error("mammoth package is not installed. Please run: npm install mammoth");
    }
  }
  return mammoth;
}

function loadTesseract() {
  if (!Tesseract) {
    try {
      Tesseract = require("tesseract.js");
    } catch (err) {
      throw new Error("tesseract.js package is not installed. Please run: npm install tesseract.js");
    }
  }
  return Tesseract;
}

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    const pdfParseModule = loadPdfParse();
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParseModule(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDOCX(filePath) {
  try {
    const mammothModule = loadMammoth();
    const result = await mammothModule.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

/**
 * Extract text from DOC file (using mammoth or alternative)
 * Note: DOC format is older and harder to parse. Mammoth might not work.
 * For better DOC support, consider using textract or similar library.
 */
async function extractTextFromDOC(filePath) {
  try {
    // Try using mammoth first (might work for some DOC files)
    const mammothModule = loadMammoth();
    const result = await mammothModule.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    // If mammoth fails, return error message
    throw new Error(`Failed to extract text from DOC file. Please convert to DOCX or PDF format. ${error.message}`);
  }
}

/**
 * Extract text from image using OCR
 */
async function extractTextFromImage(filePath) {
  try {
    const TesseractModule = loadTesseract();
    const { data: { text } } = await TesseractModule.recognize(filePath, "eng", {
      logger: (m) => {
        // Optional: log OCR progress
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Main function to extract text from resume file
 * Automatically detects file type and uses appropriate parser
 */
async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (ext) {
      case ".pdf":
        return await extractTextFromPDF(filePath);

      case ".docx":
        return await extractTextFromDOCX(filePath);

      case ".doc":
        return await extractTextFromDOC(filePath);

      case ".jpg":
      case ".jpeg":
      case ".png":
      case ".gif":
      case ".webp":
        return await extractTextFromImage(filePath);

      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Clean up temporary file
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error.message);
  }
}

module.exports = {
  extractResumeText,
  cleanupFile,
};


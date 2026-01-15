const express = require('express');
const router = express.Router();

const {
  createPreInterviewSetup,
  getUserSetup,
  deletePreInterviewSetup
} = require('../controllers/preInterviewController');

const {
  startInterview,
  sendAnswer,
  finishInterview,
  textToSpeech,
  getInterviewSession
} = require('../controllers/SessionController');

const { saveBodyLanguage, getBodyLanguage } = require('../controllers/bodyLanguage.controller');
const { getInterviewPerformance } = require('../controllers/interviewPerformance.controller');
const { detectCheating } = require('../controllers/cheatingDetection.controller');
const { verifyFace } = require('../controllers/faceController');

const authMiddleware = require('../middlewares/authMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const multer = require('multer');

// Rate limiter: 100 requests per 15 minutes
const faceRateLimit = rateLimitMiddleware(15 * 60 * 1000, 100);

// Configure multer for in-memory file storage (for forwarding to Python service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ---------------------------------------------
// Pre-interview setup routes
// ---------------------------------------------
router.post('/setup', authMiddleware, createPreInterviewSetup);
router.get('/setup', authMiddleware, getUserSetup);
router.delete('/setup/:id', authMiddleware, deletePreInterviewSetup);

// ---------------------------------------------
// Interview session routes
// ---------------------------------------------
router.post('/start', authMiddleware, startInterview);
router.get('/session/:sessionId', authMiddleware, getInterviewSession); // Get session by sessionId
router.post('/answer', authMiddleware, sendAnswer);
router.post('/finish', authMiddleware, finishInterview);
router.post('/tts', authMiddleware, textToSpeech);
router.post('/body-language', authMiddleware, saveBodyLanguage);
router.get('/body-language/:sessionId', authMiddleware, getBodyLanguage);

/**
 * @swagger
 * /api/interview/verify-face:
 *   post:
 *     summary: Verify face identity
 *     tags: [Interview]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - faceEmbedding
 *             properties:
 *               userId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               faceEmbedding:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/verify-face', authMiddleware, faceRateLimit, verifyFace);

// detect-cheating route - handles both file upload and JSON base64
// Use multer only for multipart requests, otherwise skip it
router.post('/detect-cheating', authMiddleware, (req, res, next) => {
  // Check if request is multipart/form-data (file upload)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Use multer for file uploads
    upload.single('file')(req, res, next);
  } else {
    // Skip multer for JSON requests (express.json() already handled in app.js)
    next();
  }
}, detectCheating);
router.get('/:interviewId/performance', authMiddleware, getInterviewPerformance);

module.exports = router;

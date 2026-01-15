const express = require('express');
const router = express.Router();

const { uploadResume } = require('../controllers/resumeController');
const authMiddleware = require('../middlewares/authMiddleware');
const resumeUpload = require('../utils/resumeUpload');

// ---------------------------------------------
// Resume upload routes
// ---------------------------------------------
router.post('/upload', authMiddleware, resumeUpload.single('resume'), uploadResume);

module.exports = router;


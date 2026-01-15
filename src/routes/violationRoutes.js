const express = require("express");
const router = express.Router();
const { logViolation, getViolationsBySession } = require("../controllers/violation.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const rateLimitMiddleware = require("../middlewares/rateLimitMiddleware");

// Rate limiter: 50 requests per 15 minutes for violation logging (bit more restrictive)
const violationRateLimit = rateLimitMiddleware(15 * 60 * 1000, 50);

/**
 * @swagger
 * /api/interview/log-violation:
 *   post:
 *     summary: Log a proctoring violation
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
 *               - interviewId
 *               - violationType
 *               - actionTaken
 *             properties:
 *               userId:
 *                 type: string
 *               interviewId:
 *                 type: string
 *               violationType:
 *                 type: string
 *                 enum: [camera_off, camera_covered, face_mismatch, multiple_faces]
 *               actionTaken:
 *                 type: string
 *                 enum: [warning, final_warning, terminated]
 *               screenshotUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Violation logged successfully
 */
router.post("/log-violation",
    (req, res, next) => {
        console.log(`[VIOLATION_DEBUG] Incoming Request: ${req.method} ${req.originalUrl}`);
        console.log(`[VIOLATION_DEBUG] Headers: ${JSON.stringify(req.headers['authorization'] ? 'Auth Header Present' : 'No Auth Header')}`);
        next();
    },
    authMiddleware,
    violationRateLimit,
    logViolation
);

/**
 * @swagger
 * /api/interview/violations/{interviewId}:
 *   get:
 *     summary: Get all violations for an interview session
 *     tags: [Interview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: interviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of violations
 */
router.get("/violations/:interviewId", authMiddleware, getViolationsBySession);

module.exports = router;

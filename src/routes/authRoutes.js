const express = require("express");
const router = express.Router();
const {
  registerUser,
  registerAdmin,
  loginUser,
  googleAuthStart,
  googleAuthCallback,
  logout,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ----------------------
// Auth Routes
// ----------------------

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Register a new ADMIN (Requires Secret Key)
 *     tags: [Auth]
 */
router.post("/register-admin", registerAdmin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [Auth]
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Auth]
 */
router.post("/verify-otp", verifyOtp);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password after OTP verification
 *     tags: [Auth]
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/auth/google/start:
 *   get:
 *     summary: Start Google OAuth flow (login or signup) - redirects to Google consent URL
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [login, signup]
 *         description: Whether this Google OAuth attempt is for login or signup (default: login)
 *     responses:
 *       200:
 *         description: Returns Google OAuth URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.get("/google/start", googleAuthStart);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback - handles Google redirect
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error from Google OAuth
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json]
 *         description: If set to json (or if Accept is application/json), callback returns JSON with 200/400 instead of redirecting
 */
router.get("/google/callback", googleAuthCallback);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user (protected)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns current user data
 *       401:
 *         description: Not authorized
 */
router.get("/me", authMiddleware, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post("/logout", logout);

module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { getMe, updateProfile, changePassword, getProfileById } = require("../controllers/authController");

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile settings
 */

// Update Profile
router.put("/update", authMiddleware, updateProfile);

// Get logged-in user
router.get("/me", authMiddleware, getMe);
router.get("/", authMiddleware, getMe); // Alias for /me

// Get user profile by ID
router.get("/:id", authMiddleware, getProfileById);

// Change Password
router.put("/update-password", authMiddleware, changePassword);

module.exports = router;

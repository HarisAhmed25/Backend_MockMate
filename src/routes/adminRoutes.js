const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// All admin routes require both authentication and admin role
router.use(authMiddleware, adminMiddleware);

/**
 * Dashboard Summary
 */
router.get("/dashboard/summary", adminController.getDashboardSummary);

/**
 * User Management
 */
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.get("/profile/:id", adminController.getUserById); // Alias for User Profile view

/**
 * Interview Management
 */
router.get("/interviews", adminController.getInterviews);
router.get("/interviews/:id", adminController.getInterviewById);

/**
 * Violation Management
 */
router.get("/violations", adminController.getViolationLogs);

/**
 * AI Settings Management
 */
router.get("/ai-settings", adminController.getAISettings);
router.patch("/ai-settings", adminController.updateAISettings);

/**
 * Roles CRUD
 */
router.get("/roles", adminController.getRoles);
router.post("/roles", adminController.createRole);
router.patch("/roles/:id", adminController.updateRole);
router.delete("/roles/:id", adminController.deleteRole);

/**
 * Questions CRUD
 */
router.get("/questions", adminController.getQuestions);
router.post("/questions", adminController.createQuestion);
router.patch("/questions/:id", adminController.updateQuestion);
router.delete("/questions/:id", adminController.deleteQuestion);

module.exports = router;

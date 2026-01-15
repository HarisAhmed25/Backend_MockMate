const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { getDashboardStats, getAITips } = require("../controllers/dashboardController");

// Dashboard summary
router.get("/summary", authMiddleware, getDashboardStats);

// AI interview tips (fixed route)
router.get("/ai-tips", authMiddleware, getAITips);

module.exports = router;

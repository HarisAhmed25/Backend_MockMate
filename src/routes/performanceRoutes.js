const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const { getPerformanceSummary } = require("../controllers/performanceController");

router.get("/summary", authMiddleware, getPerformanceSummary);

module.exports = router;

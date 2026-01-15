const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  getMyReports,
  getMyReportById,
  compareReports,
  getReportPdfData,
} = require("../controllers/reportController");

// All report routes are protected: users can only access their own reports
router.get("/", authMiddleware, getMyReports);
// NOTE: Keep specific routes above "/:id" to avoid route conflicts
router.get("/compare", authMiddleware, compareReports);
router.get("/:id/pdf", authMiddleware, getReportPdfData);
router.get("/:id", authMiddleware, getMyReportById);

module.exports = router;



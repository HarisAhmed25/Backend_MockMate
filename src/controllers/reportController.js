const mongoose = require("mongoose");
const InterviewReport = require("../models/InterviewReport");

function indicatorFromDelta(delta) {
  if (delta > 0) return "+";
  if (delta < 0) return "-";
  return "0";
}

function diffMetric(currentValue, previousValue) {
  const curr = Number(currentValue || 0);
  const prev = Number(previousValue || 0);
  const delta = curr - prev;
  return { delta, indicator: indicatorFromDelta(delta) };
}

function pickBodyLanguageNumeric(bodyLanguage) {
  if (!bodyLanguage) return null;
  // Handle migration: if dominantBehavior is missing, default to 'confident'
  // If old data has dominantExpression, we map 'happy'/'neutral' -> 'confident'
  // But strictly, we just want to ensure we return dominantBehavior.

  let behavior = bodyLanguage.dominantBehavior;
  if (!behavior) {
    // Basic migration logic for old reports
    behavior = 'confident';
  }

  return {
    eyeContact: Number(bodyLanguage.eyeContact || 0),
    engagement: Number(bodyLanguage.engagement || 0),
    attention: Number(bodyLanguage.attention || 0),
    stability: Number(bodyLanguage.stability || 0),
    sampleCount: Number(bodyLanguage.sampleCount || 0),
    dominantBehavior: behavior,
    // Frontend Compatibility: Map dominantBehavior to dominantExpression
    dominantExpression: behavior,
    // Frontend Compatibility: Map stability to expressionConfidence (to avoid broken %)
    expressionConfidence: Number(bodyLanguage.stability || 0),
  };
}

async function findPreviousReportForUser({ userId, role, beforeDate }) {
  // Previous report MUST be for the same user AND same role (per requirement),
  // and created before the current report.
  if (!beforeDate) return null;

  const query = {
    userId,
    createdAt: { $lt: beforeDate },
  };
  if (role) query.role = role;

  return InterviewReport.findOne(query)
    .sort({ createdAt: -1 })
    .select("_id role overallPercentage answerQuality bodyLanguage createdAt");
}

function buildImprovement({ currentReport, previousReport }) {
  if (!previousReport) {
    return {
      hasPrevious: false,
      previousReportId: null,
      overallPercentageDifference: null,
      answerQualityDifference: null,
      bodyLanguageDifference: null,
    };
  }

  const overallPercentageDifference = diffMetric(
    currentReport.overallPercentage,
    previousReport.overallPercentage
  );

  const answerQualityDifference = {
    technicalAccuracy: diffMetric(
      currentReport.answerQuality?.technicalAccuracy,
      previousReport.answerQuality?.technicalAccuracy
    ),
    completeness: diffMetric(
      currentReport.answerQuality?.completeness,
      previousReport.answerQuality?.completeness
    ),
    conciseness: diffMetric(
      currentReport.answerQuality?.conciseness,
      previousReport.answerQuality?.conciseness
    ),
    problemSolving: diffMetric(
      currentReport.answerQuality?.problemSolving,
      previousReport.answerQuality?.problemSolving
    ),
  };

  const currBL = pickBodyLanguageNumeric(currentReport.bodyLanguage);
  const prevBL = pickBodyLanguageNumeric(previousReport.bodyLanguage);
  const bodyLanguageDifference = currBL && prevBL
    ? {
      eyeContact: diffMetric(currBL.eyeContact, prevBL.eyeContact),
      engagement: diffMetric(currBL.engagement, prevBL.engagement),
      attention: diffMetric(currBL.attention, prevBL.attention),
      stability: diffMetric(currBL.stability, prevBL.stability),
      sampleCount: diffMetric(currBL.sampleCount, prevBL.sampleCount),
      dominantBehaviorChanged: currBL.dominantBehavior !== prevBL.dominantBehavior,
    }
    : null;

  return {
    hasPrevious: true,
    previousReportId: previousReport._id,
    overallPercentageDifference,
    answerQualityDifference,
    bodyLanguageDifference,
  };
}

/**
 * GET /api/reports
 * List all reports for the logged-in user (latest first).
 * Returns minimal fields for listing.
 */
exports.getMyReports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Optional: fetch multiple specific reports in one call
    // Example: GET /api/reports?ids=ID1,ID2
    const idsRaw = (req.query && req.query.ids) ? String(req.query.ids) : "";

    // Default list: minimal fields for fast listing
    if (!idsRaw) {
      const reports = await InterviewReport.find({ userId })
        .sort({ createdAt: -1 })
        .select("_id interviewId role overallPercentage createdAt");

      return res.json({ success: true, reports });
    }

    const ids = idsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const invalid = ids.find((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid) {
      return res.status(400).json({ success: false, message: "Invalid report id in ids list" });
    }

    // For multi-fetch, return full report docs (useful for comparisons in UI)
    const reports = await InterviewReport.find({
      userId,
      _id: { $in: ids },
    }).sort({ createdAt: -1 });

    return res.json({ success: true, reports });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id
 * Get full report details for logged-in user.
 * Ownership is enforced by querying with userId.
 */
exports.getMyReportById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid report id" });
    }

    const report = await InterviewReport.findOne({ _id: id, userId });
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    // Fetch previous report for improvement analytics
    const previousReport = await findPreviousReportForUser({
      userId,
      role: report.role,
      beforeDate: report.createdAt,
    });

    const improvement = buildImprovement({ currentReport: report, previousReport });

    // Frontend Compatibility: Patch report with legacy fields
    const reportObj = report.toObject();
    if (reportObj.bodyLanguage) {
      reportObj.bodyLanguage.dominantExpression = reportObj.bodyLanguage.dominantBehavior || 'confident';
      reportObj.bodyLanguage.expressionConfidence = reportObj.bodyLanguage.stability || 0;
      // Frontend Compatibility: Ensure expression also matches dominantBehavior
      reportObj.bodyLanguage.expression = reportObj.bodyLanguage.dominantBehavior || 'confident';
    }

    return res.json({
      success: true,
      report: reportObj,
      previousReport: previousReport
        ? {
          id: previousReport._id,
          role: previousReport.role,
          overallPercentage: previousReport.overallPercentage,
          createdAt: previousReport.createdAt,
        }
        : null,
      improvement,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/compare?first=ID1&second=ID2
 * Comparison rules:
 * - Compare ONLY within the same role
 * - Default behavior: compare user's latest report vs previous report with SAME role
 * - Backwards-compatible: if first & second IDs are provided, they must be SAME role
 */
exports.compareReports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const firstId = req.query?.first ? String(req.query.first) : "";
    const secondId = req.query?.second ? String(req.query.second) : "";

    const computeComparison = ({ previous, latest }) => {
      // Differences are computed as: latest - previous
      const overallPercentageDifference = diffMetric(
        latest.overallPercentage,
        previous.overallPercentage
      );

      const answerQualityDifference = {
        technicalAccuracy: diffMetric(
          latest.answerQuality?.technicalAccuracy,
          previous.answerQuality?.technicalAccuracy
        ),
        completeness: diffMetric(
          latest.answerQuality?.completeness,
          previous.answerQuality?.completeness
        ),
        conciseness: diffMetric(
          latest.answerQuality?.conciseness,
          previous.answerQuality?.conciseness
        ),
        problemSolving: diffMetric(
          latest.answerQuality?.problemSolving,
          previous.answerQuality?.problemSolving
        ),
      };

      const prevBL = pickBodyLanguageNumeric(previous.bodyLanguage);
      const latestBL = pickBodyLanguageNumeric(latest.bodyLanguage);
      const bodyLanguageDifference = prevBL && latestBL
        ? {
          eyeContact: diffMetric(latestBL.eyeContact, prevBL.eyeContact),
          engagement: diffMetric(latestBL.engagement, prevBL.engagement),
          attention: diffMetric(latestBL.attention, prevBL.attention),
          stability: diffMetric(latestBL.stability, prevBL.stability),
          sampleCount: diffMetric(latestBL.sampleCount, prevBL.sampleCount),
          dominantBehaviorChanged: latestBL.dominantBehavior !== prevBL.dominantBehavior,
        }
        : null;

      return {
        overallPercentageDifference,
        answerQualityDifference,
        bodyLanguageDifference,
      };
    };

    // If first/second are provided: enforce same-role comparison
    if (firstId || secondId) {
      if (!firstId || !secondId) {
        return res.status(400).json({ success: false, message: "first and second are required together" });
      }
      if (!mongoose.Types.ObjectId.isValid(firstId) || !mongoose.Types.ObjectId.isValid(secondId)) {
        return res.status(400).json({ success: false, message: "Invalid report id" });
      }

      const [a, b] = await Promise.all([
        InterviewReport.findOne({ _id: firstId, userId }),
        InterviewReport.findOne({ _id: secondId, userId }),
      ]);

      if (!a || !b) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      if (String(a.role || "").toLowerCase() !== String(b.role || "").toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "Cannot compare reports of different roles",
        });
      }

      // Determine latest vs previous by createdAt
      const latest = (new Date(a.createdAt) >= new Date(b.createdAt)) ? a : b;
      const previous = (latest === a) ? b : a;

      return res.json({
        success: true,
        comparisonAvailable: true,
        role: latest.role,
        // Backwards-compatible keys (frontend often expects first/second)
        first: previous,
        second: latest,
        // Newer semantic keys (kept for clarity)
        latest,
        previous,
        comparison: computeComparison({ previous, latest }),
      });
    }

    // Default: fetch latest report, then previous report with SAME role
    const latest = await InterviewReport.findOne({ userId }).sort({ createdAt: -1 });
    if (!latest) {
      return res.json({
        success: true,
        comparisonAvailable: false,
        first: null,
        second: null,
        comparison: null,
        message: "Comparison unavailable: no reports found",
      });
    }

    const previous = await findPreviousReportForUser({
      userId,
      role: latest.role,
      beforeDate: latest.createdAt,
    });

    if (!previous) {
      return res.json({
        success: true,
        comparisonAvailable: false,
        role: latest.role,
        // Keep keys stable for frontend parsing
        first: null,
        second: {
          id: latest._id,
          role: latest.role,
          overallPercentage: latest.overallPercentage,
          createdAt: latest.createdAt,
        },
        comparison: null,
        latest: {
          id: latest._id,
          role: latest.role,
          overallPercentage: latest.overallPercentage,
          createdAt: latest.createdAt,
        },
        message: "Comparison unavailable: no previous report for this role",
      });
    }

    return res.json({
      success: true,
      comparisonAvailable: true,
      role: latest.role,
      // Backwards-compatible keys
      first: previous,
      second: latest,
      // Newer semantic keys
      latest,
      previous,
      comparison: computeComparison({ previous, latest }),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id/pdf
 * Returns structured "PDF-ready" data (does NOT generate a PDF).
 */
exports.getReportPdfData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid report id" });
    }

    const report = await InterviewReport.findOne({ _id: id, userId });
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const previousReport = await findPreviousReportForUser({
      userId,
      role: report.role,
      beforeDate: report.createdAt,
    });
    const improvement = buildImprovement({ currentReport: report, previousReport });

    // Keep payload stable for future PDF generation (frontend or server-side)
    const pdfData = {
      meta: {
        reportId: report._id,
        interviewId: report.interviewId,
        userId: report.userId,
        role: report.role,
        createdAt: report.createdAt,
        generatedAt: new Date(),
      },
      report: {
        overallPercentage: report.overallPercentage,
        answerQuality: report.answerQuality,
        bodyLanguage: report.bodyLanguage,
        questions: report.questions,
        aiSummary: report.aiSummary,
      },
      previousReport: previousReport
        ? {
          id: previousReport._id,
          role: previousReport.role,
          overallPercentage: previousReport.overallPercentage,
          answerQuality: previousReport.answerQuality,
          bodyLanguage: previousReport.bodyLanguage,
          createdAt: previousReport.createdAt,
        }
        : null,
      improvement,
    };

    return res.json({ success: true, pdfData });
  } catch (err) {
    next(err);
  }
};



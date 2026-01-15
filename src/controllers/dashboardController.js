const InterviewSession = require("../models/InterviewSession");
const { safeChatCompletion } = require("../utils/openaiClient");

// ===============================
// 📌 1. DASHBOARD STATS
// ===============================
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await InterviewSession.find({
      userId,
      isCompleted: true
    }).sort({ createdAt: -1 });

    const total = sessions.length;

    if (total === 0) {
      return res.json({
        success: true,
        summary: {
          interviewsCompleted: 0,
          averagePercentage: 0,
          improvement: 0,
          lastInterviewSummary: ""
        }
      });
    }

    // last session
    const last = sessions[0];
    const lastAvg = Math.round(
      (last.technicalAccuracy +
        last.completeness +
        last.conciseness +
        last.problemSolving) / 4
    );

    let improvement = 0;

    if (total > 1) {
      const prev = sessions[1];
      const prevAvg = Math.round(
        (prev.technicalAccuracy +
          prev.completeness +
          prev.conciseness +
          prev.problemSolving) / 4
      );
      improvement = lastAvg - prevAvg;
    }

    return res.json({
      success: true,
      summary: {
        interviewsCompleted: total,
        averagePercentage: lastAvg,
        improvement,
        lastInterviewSummary: last.aiSummary || ""
      }
    });

  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: "Failed to load summary" });
  }
};

// ===============================
// 📌 2. AI TIPS (already correct)
// ===============================
exports.getAITips = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get last completed interview
    const lastSession = await InterviewSession.findOne({
      userId,
      isCompleted: true
    })
      .sort({ createdAt: -1 })
      .lean();

    // No interview completed yet
    if (!lastSession) {
      return res.json({
        success: true,
        tips: []
      });
    }

    // Return already generated tips
    return res.json({
      success: true,
      tips: lastSession.aiTips || []
    });

  } catch (error) {
    console.error("AI tips fetch error:", error);
    res.status(500).json({ message: "Failed to fetch AI tips" });
  }
};

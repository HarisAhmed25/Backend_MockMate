const InterviewSession = require("../models/InterviewSession");

exports.getPerformanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.query; // role=all | frontend | backend | sqa

    // Build base query
    const baseQuery = {
      userId,
      isCompleted: true
    };

    // Apply role filter if provided and not 'all'
    if (role && role !== 'all') {
      // Filter directly by role field (case-insensitive)
      baseQuery.role = role.toLowerCase();
    }

    // Fetch sessions with role filter applied
    const sessions = await InterviewSession.find(baseQuery)
      .sort({ createdAt: 1 }); // oldest → newest

    // ---------------------------------------
    // GET AVAILABLE ROLES (for dropdown)
    // ---------------------------------------
    // Get all unique roles from user's completed interviews
    const allUserSessions = await InterviewSession.find({
      userId,
      isCompleted: true
    }).select('role').lean();

    const availableRoles = [...new Set(allUserSessions.map(s => s.role).filter(Boolean))].sort();

    // ---------------------------------------
    // NO INTERVIEWS CASE
    // ---------------------------------------
    if (sessions.length === 0) {
      return res.json({
        success: true,
        summary: {
          interviewsCompleted: 0,
          progressOverTime: [],
          overallScore: 0,
          overallPercentage: 0,
          improvement: 0,
          answerQuality: {
            technicalAccuracy: 0,
            completeness: 0,
            conciseness: 0,
            problemSolving: 0
          },
          detailedAnswers: [],
          bodyLanguage: {},
          availableRoles: [], // Include available roles even when no interviews
          interviews: [] // Empty interviews list
        }
      });
    }

    // ---------------------------------------
    // BASIC METRICS
    // ---------------------------------------
    const interviewsCompleted = sessions.length;

    // Progress Trend Over Time (per interview %)
    const progressOverTime = sessions.map(s =>
      Math.round(s.overallPercentage || 0)
    );

    // Average of all session scores (from ALL filtered interviews, not just last)
    const overallPercentage = progressOverTime.length > 0
      ? Math.round(progressOverTime.reduce((a, b) => a + b, 0) / progressOverTime.length)
      : 0;

    // Calculate overallScore from average percentage
    // Use average question count across all interviews (not just last one)
    const avgQuestionCount = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.questions?.length || 0), 0) / sessions.length)
      : 0;
    const overallScore = Math.round(
      (overallPercentage / 100) * (avgQuestionCount * 10)
    );

    // Recent improvement (last vs previous)
    const improvement =
      progressOverTime.length > 1
        ? progressOverTime[progressOverTime.length - 1] -
        progressOverTime[progressOverTime.length - 2]
        : 0;

    // ---------------------------------------
    // RUBRIC AVERAGES (REAL INTERVIEW SCORING)
    // ---------------------------------------
    // Calculate averages from ALL filtered sessions (not just last one)
    // Each interview has its own evaluation stored in the session
    const avg = field => {
      const sum = sessions.reduce((acc, s) => acc + (s[field] || 0), 0);
      return sessions.length > 0 ? Math.round(sum / sessions.length) : 0;
    };

    const averageTechnical = avg("technicalAccuracy");
    const averageComplete = avg("completeness");
    const averageConcise = avg("conciseness");
    const averageProblemSolve = avg("problemSolving");

    // ---------------------------------------
    // DETAILED ANSWER STRUCTURE
    // ---------------------------------------
    const detailedAnswers = sessions.map(s => ({
      sessionId: s._id,
      questions: s.questions.map(q => ({
        question: q.question,
        answer: q.answer,
        score: q.score,
        feedback: q.feedback
      })),
      finalSummary: s.aiSummary
    }));

    // ---------------------------------------
    // BODY LANGUAGE METRICS
    // ---------------------------------------
    const bodyLanguageData = sessions
      .filter(s => s.bodyLanguage && s.bodyLanguage.sampleCount > 0)
      .map(s => s.bodyLanguage);

    let bodyLanguage = {
      eyeContact: 0,
      engagement: 0,
      attention: 0,
      stability: 0,
      dominantBehavior: 'confident',
      overallScore: 0
    };

    if (bodyLanguageData.length > 0) {
      // Calculate averages
      bodyLanguage.eyeContact = Math.round(
        bodyLanguageData.reduce((sum, d) => sum + (d.eyeContact || 0), 0) / bodyLanguageData.length
      );
      bodyLanguage.engagement = Math.round(
        bodyLanguageData.reduce((sum, d) => sum + (d.engagement || 0), 0) / bodyLanguageData.length
      );
      bodyLanguage.attention = Math.round(
        bodyLanguageData.reduce((sum, d) => sum + (d.attention || 0), 0) / bodyLanguageData.length
      );
      bodyLanguage.stability = Math.round(
        bodyLanguageData.reduce((sum, d) => sum + (d.stability || 0), 0) / bodyLanguageData.length
      );

      // Find dominant behavior (most common)
      const behaviorCounts = {};
      bodyLanguageData.forEach(d => {
        // Fallback for migration: map expression to behavior if needed, or default
        let behavior = d.dominantBehavior;
        if (!behavior) {
          // Basic mapping if old data exists
          if (['nervous', 'sad'].includes(d.dominantExpression)) behavior = 'nervous';
          else if (['happy', 'neutral'].includes(d.dominantExpression)) behavior = 'confident';
          else behavior = 'confident';
        }
        behaviorCounts[behavior] = (behaviorCounts[behavior] || 0) + 1;
      });

      if (Object.keys(behaviorCounts).length > 0) {
        bodyLanguage.dominantBehavior = Object.keys(behaviorCounts).reduce((a, b) =>
          behaviorCounts[a] > behaviorCounts[b] ? a : b
        );
        // Frontend Compatibility
        bodyLanguage.dominantExpression = bodyLanguage.dominantBehavior;
        bodyLanguage.expressionConfidence = bodyLanguage.stability || 0;
      }

      // Calculate overall score
      bodyLanguage.overallScore = Math.round(
        (bodyLanguage.eyeContact + bodyLanguage.engagement +
          bodyLanguage.attention + bodyLanguage.stability) / 4
      );
    }

    // ---------------------------------------
    // INDIVIDUAL INTERVIEWS LIST
    // ---------------------------------------
    // List of all interviews with basic performance data
    const interviews = sessions.map(s => ({
      interviewId: s._id,
      score: s.totalScore || 0,
      overallPercentage: s.overallPercentage || 0,
      createdAt: s.createdAt,
      role: s.role
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

    // ---------------------------------------
    // FINAL RESPONSE
    // ---------------------------------------
    return res.json({
      success: true,
      summary: {
        interviewsCompleted,
        progressOverTime,
        overallScore,
        overallPercentage,
        improvement,

        answerQuality: {
          technicalAccuracy: averageTechnical,
          completeness: averageComplete,
          conciseness: averageConcise,
          problemSolving: averageProblemSolve
        },

        detailedAnswers,
        bodyLanguage,
        availableRoles, // List of all available roles for dropdown
        interviews // NEW: List of individual interviews with performance data
      }
    });

  } catch (error) {
    console.error("Performance summary error:", error);
    res.status(500).json({ message: "Failed to fetch performance summary" });
  }
};

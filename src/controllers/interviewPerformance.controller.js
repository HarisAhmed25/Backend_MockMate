/**
 * Interview Performance Controller
 * Handles single interview performance details
 */

const InterviewSession = require('../models/InterviewSession');
const mongoose = require('mongoose');

/**
 * GET /api/interview/:interviewId/performance
 * Get detailed performance of a single interview
 */
exports.getInterviewPerformance = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'Interview ID is required'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interview ID format'
      });
    }

    // Find interview by interviewId AND userId (CRITICAL: both must match)
    // NEVER use findOne({ userId }) without interviewId - always include both
    const interview = await InterviewSession.findOne({
      _id: new mongoose.Types.ObjectId(interviewId),
      userId: new mongoose.Types.ObjectId(userId),
      isCompleted: true
    }).populate('setupId', 'desiredRole experienceLevel industry educationLevel');

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found, not completed, or access denied'
      });
    }

    // Log for debugging (remove in production if needed)
    console.log(`✅ Fetching performance for interviewId: ${interviewId}, userId: ${userId}`);

    // Extract performance data
    const performance = {
      interviewId: interview._id,
      role: interview.role,
      score: interview.totalScore || 0,
      overallPercentage: interview.overallPercentage || 0,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,

      // Answer quality metrics
      answerQuality: {
        technicalAccuracy: interview.technicalAccuracy || 0,
        completeness: interview.completeness || 0,
        conciseness: interview.conciseness || 0,
        problemSolving: interview.problemSolving || 0
      },

      // Questions and answers
      questions: interview.questions.map(q => ({
        question: q.question,
        answer: q.answer,
        score: q.score || 0,
        feedback: q.feedback || ''
      })),

      // AI summary
      summary: interview.aiSummary || '',

      // AI tips
      tips: interview.aiTips || [],

      // Body language data
      bodyLanguage: interview.bodyLanguage && interview.bodyLanguage.sampleCount > 0
        ? {
            eyeContact: interview.bodyLanguage.eyeContact || 0,
            engagement: interview.bodyLanguage.engagement || 0,
            attention: interview.bodyLanguage.attention || 0,
            stability: interview.bodyLanguage.stability || 0,
            expression: interview.bodyLanguage.expression || 'neutral',
            expressionConfidence: interview.bodyLanguage.expressionConfidence || 0,
            dominantExpression: interview.bodyLanguage.dominantExpression || 'neutral',
            sampleCount: interview.bodyLanguage.sampleCount || 0
          }
        : null,

      // Setup information
      setup: interview.setupId ? {
        desiredRole: interview.setupId.desiredRole,
        experienceLevel: interview.setupId.experienceLevel,
        industry: interview.setupId.industry,
        educationLevel: interview.setupId.educationLevel
      } : null,

      // Job Description (generated during interview start)
      jobDescription: interview.jobDescription && Array.isArray(interview.jobDescription) && interview.jobDescription.length > 0
        ? interview.jobDescription
        : []
    };

    return res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Interview performance error:', error);
    next(error);
  }
};


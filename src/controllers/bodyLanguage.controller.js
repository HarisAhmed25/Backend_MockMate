/**
 * Body Language Controller
 * Handles body language analysis API requests
 */

const bodyLanguageService = require('../services/bodyLanguage.service');
const InterviewSession = require('../models/InterviewSession');

/**
 * POST /api/interview/body-language
 * Save body language analysis results for an interview session
 */
exports.saveBodyLanguage = async (req, res, next) => {
  try {
    const {
      sessionId,
      eyeContact,
      engagement,
      attention,
      stability,
      dominantBehavior, // New behavior field
      sampleCount,
      timestamp
    } = req.body;
    const userId = req.user.id;

    // Validate sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required'
      });
    }

    // Prepare body language data object
    const bodyLanguageData = {
      eyeContact,
      engagement,
      attention,
      stability,
      dominantBehavior,
      sampleCount
    };

    // Validate scores
    const validation = bodyLanguageService.validateScores(bodyLanguageData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid body language data',
        errors: validation.errors
      });
    }

    // Verify session exists and belongs to user
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found or access denied'
      });
    }

    // Optional: Check if body language data already exists (prevent duplicate submissions)
    const hasExistingData = await bodyLanguageService.hasBodyLanguageData(sessionId);
    if (hasExistingData) {
      // Allow update - just log a warning
      console.warn(`⚠️ Body language data already exists for session ${sessionId}, updating...`);
    }

    // Save body language analysis
    await bodyLanguageService.saveBodyLanguageAnalysis(sessionId, bodyLanguageData);

    return res.json({
      success: true,
      message: 'Body language data saved successfully'
    });

  } catch (error) {
    // Handle specific errors
    if (error.message === 'Interview session not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // Generic error
    console.error('Body language save error:', error);
    next(error);
  }
};

/**
 * GET /api/interview/body-language/:sessionId
 * Get body language data for a specific session
 */
exports.getBodyLanguage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required'
      });
    }

    // Get body language data
    const bodyLanguage = await bodyLanguageService.getBodyLanguageData(sessionId, userId);

    return res.json({
      success: true,
      bodyLanguage
    });

  } catch (error) {
    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('No body language data')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // Generic error
    console.error('Body language get error:', error);
    next(error);
  }
};


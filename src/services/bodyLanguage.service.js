/**
 * Body Language Service
 * Handles body language analysis business logic
 */

const InterviewSession = require('../models/InterviewSession');

/**
 * Validate body language scores
 * @param {Object} data - Body language data object
 * @returns {Object} Validation result with isValid and errors
 */
function validateScores(data) {
  const errors = [];
  // Behavior validation
  const validBehaviors = ['confident', 'nervous', 'distracted'];

  // Validate numeric scores (0-100)
  const numericFields = ['eyeContact', 'engagement', 'attention', 'stability'];
  numericFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number' || isNaN(data[field])) {
        errors.push(`${field} must be a valid number`);
      } else if (data[field] < 0 || data[field] > 100) {
        errors.push(`${field} must be between 0 and 100`);
      }
    }
  });

  // Validate dominantBehavior enum
  if (data.dominantBehavior !== undefined && data.dominantBehavior !== null) {
    if (!validBehaviors.includes(data.dominantBehavior)) {
      errors.push(`dominantBehavior must be one of: ${validBehaviors.join(', ')}`);
    }
  }

  // Validate sampleCount
  if (data.sampleCount !== undefined && data.sampleCount !== null) {
    if (typeof data.sampleCount !== 'number' || isNaN(data.sampleCount) || data.sampleCount < 0) {
      errors.push('sampleCount must be a valid non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate overall body language score
 * @param {number} eyeContact - Eye contact score
 * @param {number} engagement - Engagement score
 * @param {number} attention - Attention score
 * @param {number} stability - Stability score
 * @returns {number} Overall score (average of all metrics)
 */
function calculateOverallScore(eyeContact, engagement, attention, stability) {
  return Math.round((eyeContact + engagement + attention + stability) / 4);
}

/**
 * Determine dominant behavior from metrics if not provided
 */
function determineDominantBehavior(eyeContact, stability, attention) {
  if (!eyeContact || !stability || !attention) return 'confident';

  if (attention < 50) return 'distracted';
  if (stability < 50 || eyeContact < 50) return 'nervous';
  return 'confident';
}

/**
 * Save body language analysis to interview session
 * @param {string} sessionId - Interview session ID
 * @param {Object} bodyLanguageData - Body language data object
 * @returns {Promise<Object>} Updated session
 */
async function saveBodyLanguageAnalysis(sessionId, bodyLanguageData) {
  const {
    eyeContact = 0,
    engagement = 0,
    attention = 0,
    stability = 0,
    dominantBehavior, // Optional, can be derived
    sampleCount = 0
  } = bodyLanguageData;

  // Calculate overall score
  const overallScore = calculateOverallScore(eyeContact, engagement, attention, stability);

  // Auto-determine behavior if missing
  const finalBehavior = dominantBehavior || determineDominantBehavior(eyeContact, stability, attention);

  // Update session with body language data (upsert - update if exists, create if not)
  const session = await InterviewSession.findByIdAndUpdate(
    sessionId,
    {
      bodyLanguage: {
        eyeContact: eyeContact || 0,
        engagement: engagement || 0,
        attention: attention || 0,
        stability: stability || 0,
        dominantBehavior: finalBehavior,
        sampleCount: sampleCount || 0,
        lastUpdated: new Date()
      }
    },
    { new: true, runValidators: true }
  );

  if (!session) {
    throw new Error('Interview session not found');
  }

  return session;
}

/**
 * Check if body language data already exists for a session
 * @param {string} sessionId - Interview session ID
 * @returns {Promise<boolean>} True if body language data exists
 */
async function hasBodyLanguageData(sessionId) {
  const session = await InterviewSession.findById(sessionId);
  return session && session.bodyLanguage && session.bodyLanguage.sampleCount > 0;
}

/**
 * Get body language data for a specific session
 * @param {string} sessionId - Interview session ID
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} Body language data
 */
async function getBodyLanguageData(sessionId, userId) {
  const session = await InterviewSession.findOne({ _id: sessionId, userId });

  if (!session) {
    throw new Error('Interview session not found or access denied');
  }

  if (!session.bodyLanguage || session.bodyLanguage.sampleCount === 0) {
    throw new Error('No body language data found for this session');
  }

  return session.bodyLanguage;
}

module.exports = {
  validateScores,
  calculateOverallScore,
  saveBodyLanguageAnalysis,
  hasBodyLanguageData,
  getBodyLanguageData
};


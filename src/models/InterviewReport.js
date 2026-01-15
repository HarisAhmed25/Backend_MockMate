const mongoose = require("mongoose");

/**
 * InterviewReport
 * Stores a snapshot of the final interview evaluation for a user.
 * This is for YOUR APP USERS (MongoDB users) — not Gmail accounts.
 */
const interviewReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link back to the interview session that produced this report
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      index: true,
    },

    role: { type: String, required: true, trim: true },

    overallPercentage: { type: Number, default: 0 },

    // Answer quality metrics
    answerQuality: {
      technicalAccuracy: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      conciseness: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
    },

    // Body language snapshot (copied from InterviewSession)
    // Body language snapshot (copied from InterviewSession)
    // Body language snapshot (copied from InterviewSession)
    bodyLanguage: {
      eyeContact: { type: Number, default: 0 }, // optional usage
      dominantBehavior: { type: String, default: "confident" },
      sampleCount: { type: Number, default: 0 },
      // New Analytics
      confidenceTrend: [Number], // [0.8, 0.9, 0.7...]
      nervousnessReduction: { type: Number, default: 0 }, // % reduced
      distractionPercentage: { type: Number, default: 0 },
      behaviorBreakdown: {
        confident: { type: Number, default: 0 },
        nervous: { type: Number, default: 0 },
        distracted: { type: Number, default: 0 }
      }
    },

    // Per-question Q/A + evaluation
    questions: [
      {
        question: { type: String, required: true },
        answer: { type: String, default: "" },
        score: { type: Number, default: 0 },
        feedback: { type: String, default: "" },
      },
    ],

    // Cheating summary
    cheating: {
      isDetected: { type: Boolean, default: false },
      incidentCount: { type: Number, default: 0 },
      penaltyPoints: { type: Number, default: 0 },
      evidenceImages: [String] // Paths to 1-2 evidence images
    },

    // AI-generated final summary
    aiSummary: { type: String, default: "" },
  },
  {
    timestamps: true, // includes createdAt (required) + updatedAt
  }
);

// Prevent duplicates if finishInterview is called more than once for the same session/user.
interviewReportSchema.index({ userId: 1, interviewId: 1 }, { unique: true });

module.exports = mongoose.model("InterviewReport", interviewReportSchema);



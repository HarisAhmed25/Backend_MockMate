const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Link to user's pre-interview setup
    setupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreInterview",
      required: true
    },

    // Interview role (stored directly for efficient filtering)
    // Flexible: accepts any role, auto-adds new roles to dropdown
    role: {
      type: String,
      required: true,
      lowercase: true, // Always store in lowercase for consistency
      trim: true
    },

    // Job Description (generated based on role, experience, education, industry)
    jobDescription: {
      type: [String],
      default: [],
      required: false // Allow empty array if generation fails
    },

    // Total questions generated (7 / 10 / 12)
    totalQuestions: {
      type: Number,
      required: true
    },

    currentIndex: {
      type: Number,
      default: 0
    },

    // All interview Q&A
    questions: [
      {
        question: { type: String, required: true },
        idealAnswer: {
          type: String,
          required: true,
          select: false // NEVER expose to frontend - hidden by default
        },
        answer: { type: String, default: "" },
        score: { type: Number, default: 0 },
        feedback: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        behavior: {
          confident: { type: Number, default: 0 },
          nervous: { type: Number, default: 0 },
          distracted: { type: Number, default: 0 }
        }
      }
    ],

    // -----------------------------
    // 🌟 AI EVALUATION RESULTS
    // -----------------------------
    totalScore: { type: Number, default: 0 },
    overallPercentage: { type: Number, default: 0 },

    technicalAccuracy: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    conciseness: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 },

    // AI-generated summary for user
    aiSummary: { type: String, default: "" },

    // 🌟 NEW: AI interviewer tips (persisted once per interview)
    // Format: Array of objects with tip, example, and resources
    aiTips: {
      type: [
        {
          tip: { type: String, required: true },
          example: { type: String, required: true },
          resources: [
            {
              type: { type: String, enum: ['book', 'website', 'course', 'article', 'youtube'], required: true },
              name: { type: String, required: true },
              link: { type: String, required: true }
            }
          ]
        }
      ],
      default: []
    },

    // -----------------------------
    // BODY LANGUAGE ANALYSIS
    // -----------------------------
    bodyLanguage: {
      eyeContact: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      attention: { type: Number, default: 0 },
      stability: { type: Number, default: 0 },

      // Behavior Analysis (Replaces old emotion-based analysis)
      dominantBehavior: {
        type: String,
        enum: ['confident', 'nervous', 'distracted'],
        default: 'confident'
      },

      sampleCount: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },

    // -----------------------------
    // CHEATING DETECTION
    // -----------------------------
    cheating: {
      isDetected: { type: Boolean, default: false },
      incidentCount: { type: Number, default: 0 },
      penaltyPoints: { type: Number, default: 0 },
      incidents: [
        {
          timestamp: { type: Date, default: Date.now },
          confidence: Number,
          detectedObjects: [String],
          imageUrl: String
        }
      ],
      faceMismatchCount: { type: Number, default: 0 },
      consecutiveMismatchCount: { type: Number, default: 0 }
    },

    // Marks when interview fully completed & evaluated
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);

const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema(
    {
        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewSession",
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        violationType: {
            type: String,
            required: true,
            enum: ["camera_off", "camera_covered", "face_mismatch", "multiple_faces"]
        },
        actionTaken: {
            type: String,
            required: true,
            enum: ["warning", "final_warning", "terminated"]
        },
        screenshotUrl: {
            type: String,
            default: null
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Indexes for fast querying of violation history
violationSchema.index({ interviewId: 1, timestamp: -1 });
violationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Violation", violationSchema);

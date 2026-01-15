const mongoose = require("mongoose");

const aiSettingsSchema = new mongoose.Schema(
    {
        faceMismatchThreshold: {
            type: Number,
            default: 0.96
        },
        penaltyPointsPerIncident: {
            type: Number,
            default: 10
        },
        maxEvidenceImages: {
            type: Number,
            default: 2
        },
        gptModel: {
            type: String,
            default: "gpt-4"
        },
        isProctoringEnabled: {
            type: Boolean,
            default: true
        },
        isFaceVerificationMandatory: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("AISettings", aiSettingsSchema);

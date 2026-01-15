const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            required: true,
            index: true
        },
        question: {
            type: String,
            required: true
        },
        idealAnswer: {
            type: String,
            required: true
        },
        experienceLevel: {
            type: String,
            enum: ["fresher", "intermediate", "senior"],
            required: true
        }
    },
    { timestamps: true }
);

// Search optimization
questionSchema.index({ roleId: 1, experienceLevel: 1 });

module.exports = mongoose.model("Question", questionSchema);

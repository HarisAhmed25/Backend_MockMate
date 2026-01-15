const User = require("../models/User");
const InterviewSession = require("../models/InterviewSession");
const Violation = require("../models/Violation");
const InterviewReport = require("../models/InterviewReport");
const AISettings = require("../models/AISettings");
const Role = require("../models/Role");
const Question = require("../models/Question");

/**
 * GET /admin/dashboard/summary
 * Get high-level stats for the admin dashboard
 */
exports.getDashboardSummary = async (req, res) => {
    try {
        // 1. User Stats
        const totalCandidates = await User.countDocuments({ role: 'user' }); // Only candidates
        const totalAllUsers = await User.countDocuments({}); // All users
        const totalAdmins = await User.countDocuments({ role: { $in: ['admin', 'super-admin'] } });
        const activeUsers = await User.countDocuments({ role: 'user', status: 'active' });

        // 2. Interview Stats
        const totalInterviews = await InterviewSession.countDocuments();
        const completedInterviews = await InterviewSession.countDocuments({ isCompleted: true });

        // Interviews Today (Using UTC to avoid timezone issues)
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0); // UTC Midnight
        const interviewsToday = await InterviewSession.countDocuments({ createdAt: { $gte: startOfToday } });

        // 3. Violation Stats
        const totalViolations = await Violation.countDocuments();

        // Aggregate face mismatches across all sessions
        const sessionsWithMismatches = await InterviewSession.aggregate([
            { $group: { _id: null, totalMismatches: { $sum: "$cheating.faceMismatchCount" } } }
        ]);
        const faceMismatchCount = sessionsWithMismatches[0]?.totalMismatches || 0;

        return res.json({
            success: true,
            summary: {
                totalUsers: totalAllUsers,        // Updated to ALL users
                totalCandidates: totalCandidates,
                totalAdmins,
                activeUsers,

                totalInterviews,
                completedInterviews,
                interviewsToday,

                totalViolations,
                faceMismatchCount
            }
        });
    } catch (error) {
        console.error("❌ Error fetching dashboard summary:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * User Management APIs
 */

exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const pageSize = parseInt(limit);

        const query = search
            ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { username: new RegExp(search, 'i') }] }
            : {};

        // Use aggregation to fetch users and their interview counts
        const users = await User.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: pageSize },
            {
                $lookup: {
                    from: "interviewsessions", // collection name for InterviewSession
                    localField: "_id",
                    foreignField: "userId",
                    as: "interviews"
                }
            },
            {
                $addFields: {
                    stats: {
                        totalInterviews: { $size: "$interviews" }
                    }
                }
            },
            {
                $project: {
                    passwordHash: 0,
                    interviews: 0,
                    faceEmbedding: 0,
                    resetPasswordToken: 0,
                    resetOtp: 0
                }
            }
        ]);

        const totalUsers = await User.countDocuments(query);

        return res.json({
            success: true,
            users,
            totalPages: Math.ceil(totalUsers / pageSize),
            currentPage: parseInt(page),
            totalUsers
        });
    } catch (error) {
        console.error("❌ Error in getUsers (Admin):", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent CastError if frontend sends the string "undefined" or "null"
        if (!id || id === "undefined" || id === "null" || id.length < 24) {
            return res.status(400).json({ success: false, message: "Invalid or missing User ID" });
        }

        const user = await User.findById(id).select("-passwordHash");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Fetch user stats
        const totalInterviews = await InterviewSession.countDocuments({ userId: user._id });
        const completedInterviews = await InterviewSession.countDocuments({ userId: user._id, isCompleted: true });

        // Fetch recent interviews
        const interviews = await InterviewSession.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(10);

        // Fetch reports for these interviews
        const reportIds = interviews.map(i => i._id);
        const reports = await InterviewReport.find({ interviewId: { $in: reportIds } });

        // Fetch violations for this user
        const totalViolations = await Violation.countDocuments({ userId: user._id });

        return res.json({
            success: true,
            user: {
                ...user.toObject(),
                stats: {
                    totalInterviews,
                    completedInterviews,
                    totalViolations
                },
                interviews,
                reports
            }
        });
    } catch (error) {
        console.error(`❌ Error fetching user profile for ${req.params.id}:`, error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Interview Management APIs

/**
 * Interview Management APIs
 */

exports.getInterviews = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const interviews = await InterviewSession.find()
            .populate("userId", "name email")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await InterviewSession.countDocuments();

        return res.json({
            success: true,
            interviews,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInterviewById = async (req, res) => {
    try {
        const interview = await InterviewSession.findById(req.params.id)
            .populate("userId", "name email")
            .populate("setupId");

        if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });

        // Fetch related report and violations
        const report = await InterviewReport.findOne({ interviewId: interview._id });
        const violations = await Violation.find({ interviewId: interview._id });

        return res.json({
            success: true,
            interview,
            report,
            violations
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Violation Management
 */

exports.getViolationLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, violationType, search } = req.query;
        let query = {};

        if (violationType) {
            query.violationType = violationType;
        }

        // If search is provided, we first find the users matching the search,
        // then find violations for those users.
        if (search) {
            const users = await User.find({
                $or: [
                    { name: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') },
                    { username: new RegExp(search, 'i') }
                ]
            }).select('_id');

            const userIds = users.map(user => user._id);
            query.userId = { $in: userIds };
        }

        const violations = await Violation.find(query)
            .populate("userId", "name email username")
            .populate("interviewId", "role")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ timestamp: -1 });

        const count = await Violation.countDocuments(query);

        return res.json({
            success: true,
            violations,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalViolations: count
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * AI Settings Management
 */

exports.getAISettings = async (req, res) => {
    try {
        let settings = await AISettings.findOne();
        if (!settings) {
            settings = await AISettings.create({});
        }
        return res.json({ success: true, settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAISettings = async (req, res) => {
    try {
        let settings = await AISettings.findOne();
        if (!settings) {
            settings = new AISettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        return res.json({ success: true, message: "AI Settings updated", settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Role & Question CRUD
 */

// Roles
exports.createRole = async (req, res) => {
    try {
        const role = await Role.create(req.body);
        return res.status(201).json({ success: true, role });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find();
        return res.json({ success: true, roles });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        return res.json({ success: true, role });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        await Role.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: "Role deleted" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Questions
exports.createQuestion = async (req, res) => {
    try {
        const question = await Question.create(req.body);
        return res.status(201).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const { roleId } = req.query;
        const query = roleId ? { roleId } : {};
        const questions = await Question.find(query).populate("roleId", "name");
        return res.json({ success: true, questions });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!question) return res.status(404).json({ success: false, message: "Question not found" });
        return res.json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: "Question deleted" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const InterviewSession = require('../src/models/InterviewSession');
const Violation = require('../src/models/Violation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fyp-backend';

const checkCounts = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Total Users
        const allUsers = await User.countDocuments({});
        const candidates = await User.countDocuments({ role: 'user' });
        const admins = await User.countDocuments({ role: 'admin' });
        console.log(`\nUsers Breakdown:`);
        console.log(`- All Users: ${allUsers}`);
        console.log(`- Candidates (role='user'): ${candidates}`);
        console.log(`- Admins (role='admin'): ${admins}`);

        // 2. Interviews
        const totalInterviews = await InterviewSession.countDocuments();

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0); // Local Midnight

        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0); // UTC Midnight

        const todayLocal = await InterviewSession.countDocuments({ createdAt: { $gte: startOfToday } });
        const todayUTC = await InterviewSession.countDocuments({ createdAt: { $gte: startOfTodayUTC } });

        console.log(`\nInterviews Breakdown:`);
        console.log(`- Total: ${totalInterviews}`);
        console.log(`- Today (Local Midnight ${startOfToday.toISOString()}): ${todayLocal}`);
        console.log(`- Today (UTC Midnight ${startOfTodayUTC.toISOString()}): ${todayUTC}`);

        // 3. Violations
        const totalViolations = await Violation.countDocuments();
        const faceMismatches = await InterviewSession.aggregate([
            { $group: { _id: null, totalMismatches: { $sum: "$cheating.faceMismatchCount" } } }
        ]);
        const countMismatch = faceMismatches[0]?.totalMismatches || 0;

        console.log(`\nViolations Breakdown:`);
        console.log(`- Total Violations Logs: ${totalViolations}`);
        console.log(`- Face Mismatches Sum: ${countMismatch}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

checkCounts();

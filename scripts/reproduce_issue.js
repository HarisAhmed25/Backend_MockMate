const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Load .env.local
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config();
}

const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Violation = require('../src/models/Violation');
const InterviewSession = require('../src/models/InterviewSession');

const API_URL = 'http://localhost:5000/api';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected to MongoDB');

        // 1. Find a REAL user (not Refine Tester)
        const user = await User.findOne({ name: { $ne: 'Refine Tester' } });
        if (!user) {
            console.error('❌ No real user found!');
            process.exit(1);
        }
        console.log(`👤 Using User: ${user.name} (${user.email}) ID: ${user._id}`);

        // 2. Find an interview session for this user (or any)
        // We need a valid interviewId as per controller validation
        let interview = await InterviewSession.findOne({ userId: user._id });
        if (!interview) {
            console.log('⚠️ No interview found for user, creating a dummy session...');
            interview = await InterviewSession.create({
                userId: user._id,
                setupId: new mongoose.Types.ObjectId(), // dummy valid ID
                status: 'active',
                role: 'software_engineer',
                totalQuestions: 5
            });
        }
        console.log(`📝 Using Interview ID: ${interview._id}`);

        // 3. Generate Token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('🔑 Token generated');

        // 4. Send Request
        console.log('🚀 Sending Log Violation Request...');
        const payload = {
            userId: user._id,
            interviewId: interview._id,
            violationType: 'face_mismatch',
            actionTaken: 'warning',
            // Simulate 500KB image
            screenshot: 'data:image/jpeg;base64,' + 'A'.repeat(500 * 1024)
        };

        try {
            const res = await axios.post(`${API_URL}/interview/log-violation`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ API Response:', res.status, res.data.message);
        } catch (err) {
            console.error('❌ API Verification Failed:', err.response?.data || err.message);
        }

        // 5. Verify in DB
        const count = await Violation.countDocuments({ userId: user._id });
        console.log(`📊 Total Violations for User in DB: ${count}`);

    } catch (err) {
        console.error('❌ Script Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

run();

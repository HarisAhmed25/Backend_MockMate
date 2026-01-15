const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Prioritize .env.local
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config();
}
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Violation = require('../src/models/Violation');

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log('Mongo URI found:', !!uri);
        // Add timeout to fail fast
        await mongoose.connect(uri || 'mongodb://localhost:27017/fyp_db', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    console.log('\n--- All Users (Last 5) ---');
    const users = await User.find().sort({ createdAt: -1 }).limit(5);
    console.log(users.map(u => ({ id: u._id, name: u.name, email: u.email })));

    console.log('\n--- Recent Violations (Last 5) ---');
    const violations = await Violation.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .populate('userId', 'name email');

    console.log(JSON.stringify(violations, null, 2));

    console.log('\n--- Total Violations Count ---');
    const count = await Violation.countDocuments();
    console.log('Total:', count);

    process.exit();
};

run();

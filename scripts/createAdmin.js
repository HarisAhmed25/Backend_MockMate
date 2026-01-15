require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fyp-backend';

const createAdmin = async () => {
    // Usage: node scripts/createAdmin.js <username> <password> <email> [name]
    const username = process.argv[2];
    const password = process.argv[3];
    const email = process.argv[4]; // Email is still required for the DB schema (required: true)
    const name = process.argv[5] || "Admin User";

    if (!username || !password || !email) {
        console.error("Usage: node scripts/createAdmin.js <username> <password> <email> [name]");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Check by username OR email
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            console.log(`⚠️ User matches found (by email or username).`);

            if (existingUser.role === 'admin') {
                console.log(`ℹ️ This user is already an admin.`);
            }

            existingUser.username = username; // Update username if needed
            existingUser.role = 'admin';
            existingUser.passwordHash = await bcrypt.hash(password, 10);
            await existingUser.save();
            console.log(`✅ User updated to ADMIN role with new credentials.`);
        } else {
            const newUser = new User({
                name,
                email,
                username,
                passwordHash: await bcrypt.hash(password, 10),
                role: 'admin',
                status: 'active',
                citizenship: 'System Admin',
                dob: new Date(),
                faceEmbedding: []
            });
            await newUser.save();
            console.log(`✅ New Admin user created: ${username} (${email})`);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

createAdmin();

const bcrypt = require('bcrypt');

async function testLoginFix() {
    console.log("🧪 Testing Manual Login Fix...");

    // Mock users
    const googleUser = {
        email: "faadii557@gmail.com",
        passwordHash: null,
        provider: 'google'
    };

    const localUser = {
        email: "user@example.com",
        passwordHash: await bcrypt.hash("password123", 10),
        provider: 'local'
    };

    const passwordProvided = "password123";

    // Simulate logic in loginUser
    async function simulateLogin(user, password) {
        if (!user) {
            return { status: 401, message: "Invalid credentials" };
        }

        if (!user.passwordHash) {
            if (user.provider === 'google' || user.googleId) {
                return {
                    status: 400,
                    message: "This account is linked with Google. Please use 'Sign in with Google' to log in."
                };
            }
            return { status: 401, message: "Invalid credentials" };
        }

        try {
            const match = await bcrypt.compare(password, user.passwordHash);
            if (!match) return { status: 401, message: "Invalid credentials" };
            return { status: 200, message: "Login Successfully" };
        } catch (err) {
            console.error("❌ Bcrypt error:", err.message);
            return { status: 500, message: err.message };
        }
    }

    // Case 1: Google User manual login
    console.log("\n📡 Case 1: Google User manual login");
    const res1 = await simulateLogin(googleUser, passwordProvided);
    console.log("Result:", res1);
    if (res1.status === 400 && res1.message.includes("linked with Google")) {
        console.log("✅ SUCCESS: Correctly handled Google user manual login");
    } else {
        console.log("❌ FAILED: Incorrect handling for Google user");
    }

    // Case 2: Local User correct login
    console.log("\n📡 Case 2: Local User correct login");
    const res2 = await simulateLogin(localUser, "password123");
    console.log("Result:", res2);
    if (res2.status === 200) {
        console.log("✅ SUCCESS: Local user login works");
    } else {
        console.log("❌ FAILED: Local user login failed");
    }

    // Case 3: Local User incorrect login
    console.log("\n📡 Case 3: Local User incorrect login");
    const res3 = await simulateLogin(localUser, "wrongpassword");
    console.log("Result:", res3);
    if (res3.status === 401) {
        console.log("✅ SUCCESS: Incorrect password handled");
    } else {
        console.log("❌ FAILED: Incorrect password NOT handled correctly");
    }
}

testLoginFix();

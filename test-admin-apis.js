const axios = require('axios');

const API_URL = 'https://mockmate-frontend-six.vercel.app/api';
// You will need to replace these with actual JWT tokens during testing
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_HERE';
const USER_TOKEN = 'YOUR_USER_JWT_HERE';

async function testAdminAPI() {
    console.log("🚀 Starting Admin API Verification...");

    // 1. Test Dashboard Summary (Admin Only)
    try {
        console.log("\n--- Testing Admin Dashboard Summary ---");
        const res = await axios.get(`${API_URL}/admin/dashboard/summary`, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        console.log("✅ Admin access successful:", res.data.summary);
    } catch (err) {
        console.error("❌ Admin access failed:", err.response?.data || err.message);
    }

    // 2. Test RBAC (Standard user accessing admin route)
    try {
        console.log("\n--- Testing Role-Based Access Control (User Token) ---");
        const res = await axios.get(`${API_URL}/admin/dashboard/summary`, {
            headers: { Authorization: `Bearer ${USER_TOKEN}` }
        });
        console.log("❌ RBAC FAILED: User was able to access admin route!");
    } catch (err) {
        if (err.response?.status === 403) {
            console.log("✅ RBAC SUCCESS: Access denied with 403 Forbidden.");
        } else {
            console.error("❌ Unexpected error:", err.response?.status, err.response?.data);
        }
    }

    // 3. Test User List (Admin Only)
    try {
        console.log("\n--- Testing User List ---");
        const res = await axios.get(`${API_URL}/admin/users?limit=5`, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        console.log("✅ User list fetched successfully. Count:", res.data.users?.length);
    } catch (err) {
        console.error("❌ User list fetch failed.");
    }

    // 4. Test AI Settings
    try {
        console.log("\n--- Testing AI Settings ---");
        const res = await axios.get(`${API_URL}/admin/ai-settings`, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        console.log("✅ AI Settings fetched:", res.data.settings);
    } catch (err) {
        console.error("❌ AI Settings fetch failed.");
    }
}

console.log("NOTE: This script requires valid JWT tokens for an admin and a standard user.");
console.log("Set ADMIN_TOKEN and USER_TOKEN in the script before running.");
// testAdminAPI(); // Uncomment to run

/**
 * Test script for Violation Logging & Enforcement system.
 * This script demonstrates how to call the new endpoints and what to expect.
 * 
 * Note: This script is for demonstration/documentation purposes. 
 * To run it, you would need a valid JWT token and existing user/interview IDs.
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'YOUR_JWT_TOKEN'; // Replace with a valid token
const USER_ID = 'YOUR_USER_ID'; // Replace with a valid user ID
const INTERVIEW_ID = 'YOUR_INTERVIEW_ID'; // Replace with a valid interview ID

async function testViolationLogging() {
    console.log('🚀 Starting Violation Logging Test...');

    try {
        // 1. Log a camera_off violation
        console.log('\n--- 1. Logging Camera Off Violation ---');
        const logResponse = await axios.post(
            `${API_BASE_URL}/interview/log-violation`,
            {
                userId: USER_ID,
                interviewId: INTERVIEW_ID,
                violationType: 'camera_off',
                actionTaken: 'warning',
                screenshotUrl: 'https://example.com/screenshot1.jpg'
            },
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );
        console.log('Response Status:', logResponse.status);
        console.log('Response Body:', JSON.stringify(logResponse.data, null, 2));

        // 2. Log multiple face_mismatch violations to test escalation
        console.log('\n--- 2. Logging Multiple Face Mismatch Violations ---');
        for (let i = 0; i < 3; i++) {
            const mismatchResponse = await axios.post(
                `${API_BASE_URL}/interview/log-violation`,
                {
                    userId: USER_ID,
                    interviewId: INTERVIEW_ID,
                    violationType: 'face_mismatch',
                    actionTaken: i === 2 ? 'final_warning' : 'warning'
                },
                {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                }
            );
            console.log(`Mismatch ${i + 1} Status:`, mismatchResponse.status);
            console.log(`Mismatch ${i + 1} Enforcement:`, mismatchResponse.data.enforcement.recommendation);
        }

        // 3. Get Audit Trail
        console.log('\n--- 3. Fetching Audit Trail (Violations List) ---');
        const auditResponse = await axios.get(
            `${API_BASE_URL}/interview/violations/${INTERVIEW_ID}`,
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );
        console.log('Audit Count:', auditResponse.data.count);
        console.log('Latest Violation Type:', auditResponse.data.violations[0].violationType);

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

// In a real environment, you would run this. 
// For now, we'll just verify the logic via code review and these steps.
console.log('Verification script created. Ready to be used in a live environment.');
// testViolationLogging();

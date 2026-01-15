/**
 * Test script for Violation Logging & Enforcement system.
 */

const axios = require('axios');

const API_BASE_URL = 'https://mockmate-frontend-six.vercel.app/api';
const TOKEN = 'YOUR_JWT_TOKEN'; 
const USER_ID = 'YOUR_USER_ID'; 
const INTERVIEW_ID = 'YOUR_INTERVIEW_ID'; 

async function testViolationLogging() {
    console.log('🚀 Starting Violation Logging Test...');

    try {
        // Log a camera_off violation
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

        // Log multiple face_mismatch violations to test escalation
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

        // Get Audit Trail
        const auditResponse = await axios.get(
            `${API_BASE_URL}/interview/violations/${INTERVIEW_ID}`,
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );
        console.log('Audit Count:', auditResponse.data.count);
        console.log('Latest Violation Type:', auditResponse.data.violations[0].violationType);

        console.log('✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

testViolationLogging();

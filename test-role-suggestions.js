/**
 * Test script for AI Role Suggestion API
 * Runs multiple queries to verify GPT integration and API response format
 */

const axios = require('axios');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';
const ENDPOINT = `${BASE_URL}/api/roles/suggestions`;

const testCases = [
    'fro',
    'pyt',
    'data',
    'bac',
    'ios'
];

async function runTests() {
    console.log('🚀 Starting Role Suggestion API Tests...');

    for (const query of testCases) {
        try {
            console.log(`\n🔍 Testing query: "${query}"`);
            const response = await axios.get(ENDPOINT, { params: { query } });

            if (response.data.success) {
                console.log('✅ Success!');
                console.log('📝 Suggestions:', JSON.stringify(response.data.suggestions, null, 2));
            } else {
                console.error('❌ Failed:', response.data.message);
            }
        } catch (error) {
            console.error(`❌ Error testing "${query}":`, error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
        }
    }

    console.log('\n🏁 Tests completed.');
}

runTests();

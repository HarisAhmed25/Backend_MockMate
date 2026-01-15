/**
 * Quick test script for Job Descriptions API
 * Run: node test-jd-api.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

function testEndpoint(role) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/roles/${role}/jd`;
    
    console.log(`\n🧪 Testing: GET ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            console.log(`✅ SUCCESS for role: "${role}"`);
            console.log(`   Found ${json.jobDescriptions.length} job descriptions`);
            console.log(`   First JD: ${json.jobDescriptions[0].substring(0, 50)}...`);
            resolve(json);
          } else {
            console.log(`❌ FAILED: ${json.message}`);
            reject(json);
          }
        } catch (err) {
          console.log(`❌ PARSE ERROR: ${err.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}`);
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ REQUEST ERROR: ${err.message}`);
      console.log(`   Make sure the server is running on ${API_BASE}`);
      reject(err);
    });
  });
}

async function runTests() {
  console.log('🚀 Testing Job Descriptions API\n');
  console.log('='.repeat(50));
  
  const roles = ['frontend', 'backend', 'sqa'];
  
  for (const role of roles) {
    try {
      await testEndpoint(role);
    } catch (err) {
      // Continue with other tests
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed!');
  console.log('\n💡 If tests failed, make sure:');
  console.log('   1. Server is running: npm start');
  console.log('   2. Server is on port 5000');
  console.log('   3. No CORS issues');
}

runTests();


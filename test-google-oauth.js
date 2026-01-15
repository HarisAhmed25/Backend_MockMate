// Test script to check Google OAuth configuration
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

console.log('🔍 Google OAuth Configuration Check\n');
console.log('Environment Variables:');
console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 30) + '...)' : '❌ Missing');
console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set (' + process.env.GOOGLE_CLIENT_SECRET.substring(0, 10) + '...)' : '❌ Missing');
console.log('  GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ Missing');
console.log('  FRONTEND_ORIGIN:', process.env.FRONTEND_ORIGIN || '❌ Missing (default: http://localhost:5173)');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || '❌ Missing (default: 7d)');
console.log('  MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');
console.log('\n');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.error('❌ Missing required Google OAuth environment variables!');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET!');
  process.exit(1);
}

console.log('✅ All required environment variables are set!');
console.log('\n📝 Next steps:');
console.log('1. Make sure Google Cloud Console has these settings:');
console.log('   - Authorized JavaScript origins: http://localhost:5173');
console.log('   - Authorized redirect URIs: ' + process.env.GOOGLE_REDIRECT_URI);
console.log('2. Test the endpoint: http://localhost:5000/api/auth/google/start');
console.log('3. Check server console for detailed logs during OAuth flow');


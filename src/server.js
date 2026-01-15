const dotenv = require('dotenv');
const fs = require('fs');

// Load local secrets from .env.local if present (local-only file, gitignored)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
// Fallback to .env
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB()
  .then(async () => {
    // Ensure MongoDB indexes declared in schemas are actually created.
    // This is critical for preventing duplicate accounts (e.g., duplicate emails) in race conditions.
    try {
      await User.syncIndexes();
      console.log('✅ User indexes synced');
    } catch (e) {
      console.warn('⚠️ Failed to sync User indexes (duplicates may exist already):', e.message);
    }

    // Add an API index route that lists available endpoints
    app.get('/api', (req, res) => {
      res.json({
        endpoints: [
          { method: 'POST', path: '/api/auth/register', description: 'Register a new user' },
          { method: 'POST', path: '/api/auth/login', description: 'Login and receive a token' },
          { method: 'POST', path: '/api/interview/setup', description: 'Create a pre-interview setup' },
          { method: 'GET', path: '/api/interview/setup', description: 'Get pre-interview setups for a user (query: userId, latest=true)' },
        ],
      });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });

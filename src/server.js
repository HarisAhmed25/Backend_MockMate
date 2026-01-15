const dotenv = require('dotenv');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

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

// -------------------------------
// Python helper function
// -------------------------------
function runPythonScript(scriptPath, args = []) {
  // Detect Python
  let pythonCmd;
  const venvPython = path.join(__dirname, '..', 'cheating_detection', '.venv', 'Scripts', 'python.exe');
  pythonCmd = fs.existsSync(venvPython) ? venvPython : (process.platform === 'win32' ? 'python' : 'python3');

  const pythonProcess = spawn(pythonCmd, ['run.py'], {
    env: process.env,
    cwd: path.join(__dirname, '..', 'cheating_detection'), // Ensure cwd is correct
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data.toString()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data.toString()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python script exited with code ${code}`);
  });
}

// -------------------------------
// Connect to DB and start server
// -------------------------------
connectDB()
  .then(async () => {
    // Ensure MongoDB indexes declared in schemas are actually created.
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

    // -------------------------------
    // ✅ TEST: Spawn Python script (optional)
    // -------------------------------
    // Remove this call in production, or trigger only when needed
    runPythonScript('cheating_detection/run.py');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const profileRoutes = require('./routes/profileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // <-- REQUIRED
const helpRoutes = require('./routes/helpRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const reportRoutes = require('./routes/reportRoutes');
const violationRoutes = require('./routes/violationRoutes');
const adminRoutes = require('./routes/adminRoutes'); // New Admin Routes
const { detectCheating } = require('./controllers/cheatingDetection.controller');
const { verifyFace } = require('./controllers/faceController');
const authMiddleware = require('./middlewares/authMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
const multer = require('multer');

// Rate limiter for face verification: 100 requests per 15 minutes
const faceRateLimit = rateLimitMiddleware(15 * 60 * 1000, 100);

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for cheating detection (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// CORS configuration for Google OAuth
const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true, // Allow cookies if using HTTP-only cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Root
app.get('/', (req, res) => {
  res.send(`
		<html>
			<head><title>MockMate Backend API</title></head>
			<body>
				<h1>MockMate Backend API</h1>
				<p>Welcome! Visit <a href="/api-docs">/api-docs</a> for full API documentation.</p>
			</body>
		</html>
	`);
});

// Global Logger
app.use((req, res, next) => {
  if (req.originalUrl.includes('violation') || req.originalUrl.includes('cheating')) {
    const bodyStr = JSON.stringify(req.body) || "";
    console.log(`[GLOBAL_TRACE] ${req.method} ${req.originalUrl} - Body Size: ${bodyStr.length}`);
  }
  next();
});

// --------------------------
// ROUTE MOUNTING
// --------------------------

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interview', violationRoutes); // Moved UP
app.use('/api/interview', interviewRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/dashboard', dashboardRoutes); // <-- EXACT FIX
app.use('/api/roles', rolesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes); // Mount Admin Routes

// Direct route for detect-cheating (frontend calls /api/detect-cheating)
app.post('/api/detect-cheating', authMiddleware, (req, res, next) => {
  // Check if request is multipart/form-data (file upload)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Use multer for file uploads with error handling
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          phoneDetected: false,
          detectedObjects: [],
          confidence: 0.0
        });
      }
      next();
    });
  } else {
    // Skip multer for JSON requests (express.json() already handled)
    next();
  }
}, detectCheating);

// Direct route for verify-face
app.post('/api/verify-face', authMiddleware, faceRateLimit, verifyFace);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;

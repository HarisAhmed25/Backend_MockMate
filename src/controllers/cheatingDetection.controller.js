/**
 * Cheating Detection Controller
 * Handles cheating detection API requests by proxying to Python FastAPI service
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const InterviewSession = require('../models/InterviewSession');

// Python FastAPI service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
const PENALTY_PER_INCIDENT = 10; // Deduct 10 marks per cheating incident
const MAX_EVIDENCE_IMAGES = 2; // Only save 2 images for the report

/**
 * POST /api/interview/detect-cheating
 * Detect cheating materials in an uploaded image frame
 * Proxies request to Python FastAPI YOLOv8 service
 */
exports.detectCheating = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId || req.query.sessionId;

    console.log('🔍 Cheating detection request received:', {
      method: req.method,
      url: req.url,
      sessionId: sessionId ? 'Provided' : 'Missing',
      hasFile: !!req.file,
      hasFiles: !!req.files,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers['content-type'],
      pythonServiceUrl: PYTHON_SERVICE_URL
    });

    let detectionResult = null;
    let imageBuffer = null;

    // Check if file is uploaded via multipart/form-data
    if (req.file || req.files) {
      const file = req.file || (req.files && req.files[0]);

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      imageBuffer = file.buffer;

      // Create form data to forward to Python service
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype || 'image/jpeg'
      });

      // Forward request to Python FastAPI service
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/detect-cheating`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 5000 // 5 second timeout
        }
      );
      detectionResult = response.data;

    }
    // Check if image is sent as base64 in request body
    else if (req.body && req.body.image) {
      const { image } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 image data'
        });
      }

      // Convert base64 to buffer for potential saving
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, 'base64');

      // Forward base64 request to Python service
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/detect-cheating-base64`,
        { image },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );
      detectionResult = response.data;

    } else {
      return res.status(400).json({
        success: false,
        message: 'No image provided. Send as multipart/form-data file or base64 in body.'
      });
    }

    // -----------------------------------------------------
    // 🌟 PENALTY & IMAGE RECORDING SYSTEM 
    // -----------------------------------------------------
    let sessionUpdate = {};

    // Only apply penalty if phone is detected AND we have a valid session ID
    if (detectionResult && detectionResult.phoneDetected && sessionId) {
      console.log(`⚠️ Cheating detected for Session ${sessionId}. Applying penalty...`);

      try {
        const session = await InterviewSession.findById(sessionId);
        if (session) {
          // Initialize cheating object if it doesn't exist (backward compatibility)
          if (!session.cheating) {
            session.cheating = {
              isDetected: false,
              incidentCount: 0,
              penaltyPoints: 0,
              incidents: []
            };
          }

          // Save image if we haven't reached the limit of evidence images
          let imageUrl = null;
          const currentIncidentCount = session.cheating.incidentCount;

          if (currentIncidentCount < MAX_EVIDENCE_IMAGES && imageBuffer) {
            const filename = `cheating_${sessionId}_${Date.now()}.jpg`;
            const uploadPath = path.join(__dirname, '../../uploads/cheating', filename);

            // Ensure directory exists
            const dir = path.dirname(uploadPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(uploadPath, imageBuffer);
            imageUrl = `/uploads/cheating/${filename}`;
            console.log(`📸 Evidence image saved: ${imageUrl}`);
          }

          // Update cheating stats
          session.cheating.isDetected = true;
          session.cheating.incidentCount += 1;
          session.cheating.penaltyPoints += PENALTY_PER_INCIDENT;

          // Log incident
          session.cheating.incidents.push({
            timestamp: new Date(),
            confidence: detectionResult.confidence,
            detectedObjects: detectionResult.detectedObjects || ['phone'],
            imageUrl: imageUrl // Store path to image if saved
          });

          // Deduct from total score (ensure it doesn't go below 0)
          if (session.totalScore > 0) {
            session.totalScore = Math.max(0, session.totalScore - PENALTY_PER_INCIDENT);
          }

          await session.save();
          console.log(`✅ Penalty applied. New Score: ${session.totalScore}, Incidents: ${session.cheating.incidentCount}`);

          sessionUpdate = {
            cheatingPenalty: {
              applied: true,
              deduction: PENALTY_PER_INCIDENT,
              totalIncidents: session.cheating.incidentCount,
              currentScore: session.totalScore,
              evidenceSaved: !!imageUrl
            }
          };
        } else {
          console.warn(`⚠️ Session ${sessionId} not found in DB.`);
        }
      } catch (dbError) {
        console.error("❌ Error updating session with cheating penalty:", dbError);
      }
    }

    // Return the response from Python service + Penalty info
    return res.json({
      success: true,
      ...detectionResult,
      ...sessionUpdate,
      phoneDetected: detectionResult.phoneDetected
    });

  } catch (error) {
    // Log full error for debugging
    console.error('❌ Cheating detection error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle axios errors (Python service unavailable)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('⚠️ Python service connection failed:', PYTHON_SERVICE_URL);
      return res.status(503).json({
        success: false,
        message: 'Cheating detection service is currently unavailable. Please ensure the Python service is running on ' + PYTHON_SERVICE_URL,
        phoneDetected: false,
        detectedObjects: [],
        confidence: 0.0
      });
    }

    // Handle Python service errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        message: error.response.data?.detail || error.response.data?.message || 'Error processing image',
        phoneDetected: false,
        detectedObjects: [],
        confidence: 0.0
      });
    }

    // Generic error - return safe response
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during cheating detection',
      phoneDetected: false,
      detectedObjects: [],
      confidence: 0.0
    });
  }
};

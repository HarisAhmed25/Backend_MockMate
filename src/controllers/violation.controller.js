const Violation = require("../models/Violation");
const InterviewSession = require("../models/InterviewSession");
const fs = require("fs");
const path = require("path");

/**
 * Log a proctoring violation and suggest enforcement action.
 * POST /api/interview/log-violation
 */
exports.logViolation = async (req, res) => {
    try {
        console.log(`[VIOLATION_DEBUG] >>> Incoming Request to logViolation <<<`);
        console.log(`[VIOLATION_DEBUG] RAW BODY: ${JSON.stringify(req.body)}`);
        console.log(`[VIOLATION_DEBUG] AUTH USER: ${JSON.stringify(req.user)}`);

        // Determine IDs (Body takes priority, followed by auth token)
        let userId = req.body.userId || (req.user && (req.user.userId || req.user.id));
        let { interviewId, violationType, actionTaken, screenshot, screenshotUrl: providedUrl } = req.body;

        const mongoose = require('mongoose');
        console.log(`[VIOLATION_DEBUG] Validating IDs: userId=${userId}, interviewId=${interviewId}`);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error(`[VIOLATION_DEBUG] FAILED: Invalid userId format: ${userId}`);
            return res.status(400).json({ success: false, message: "Invalid userId format." });
        }
        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            console.error(`[VIOLATION_DEBUG] FAILED: Invalid interviewId format: ${interviewId}`);
            return res.status(400).json({ success: false, message: "Invalid interviewId format." });
        }

        // 🌟 ROBUST NORMALIZATION
        // Handle variations: "CAMERA_OFF", "camera-off", "Session Terminated", etc.
        if (violationType && typeof violationType === 'string') {
            const search = violationType.toLowerCase().trim().replace(/-/g, '_');
            console.log(`[VIOLATION_DEBUG] Normalizing Type Search: "${search}"`);
            if (search.includes('camera_off')) violationType = 'camera_off';
            else if (search.includes('face_mismatch') || search.includes('identity_mismatch') || search.includes('impersonation')) violationType = 'face_mismatch';
            else if (search.includes('multiple_faces')) violationType = 'multiple_faces';
            else if (search.includes('camera_covered')) violationType = 'camera_covered';
        }

        if (actionTaken && typeof actionTaken === 'string') {
            const search = actionTaken.toLowerCase().trim().replace(/-/g, '_');
            console.log(`[VIOLATION_DEBUG] Normalizing Action Search: "${search}"`);
            if (search.includes('terminated')) actionTaken = 'terminated';
            else if (search.includes('final')) actionTaken = 'final_warning';
            else if (search.includes('warning')) actionTaken = 'warning';
        }

        console.log(`[VIOLATION_DEBUG] Final Payload: Type="${violationType}", Action="${actionTaken}"`);

        // 1. Basic Validation
        if (!userId || !interviewId || !violationType || !actionTaken) {
            console.error(`[VIOLATION_DEBUG] FAILED: Missing fields. UI=${!!userId}, II=${!!interviewId}, VT=${!!violationType}, AT=${!!actionTaken}`);
            return res.status(400).json({
                success: false,
                message: "Missing required fields: userId, interviewId, violationType, and actionTaken are required."
            });
        }

        // Validate User Exists
        const User = require("../models/User");
        console.log(`[VIOLATION_DEBUG] Checking if user ${userId} exists...`);
        const userExists = await User.findById(userId);
        if (!userExists) {
            console.error(`[VIOLATION_DEBUG] FAILED: User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: "User not found. Cannot log violation for non-existent user."
            });
        }

        // 2. Handle Screenshot (Base64)
        let finalScreenshotUrl = providedUrl || null;
        if (screenshot && typeof screenshot === 'string' && screenshot.startsWith('data:image')) {
            try {
                const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const filename = `violation_${interviewId}_${Date.now()}.jpg`;
                const uploadPath = path.join(__dirname, '../../uploads/violations', filename);
                const dir = path.dirname(uploadPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(uploadPath, imageBuffer);
                finalScreenshotUrl = `/uploads/violations/${filename}`;
                console.log(`[VIOLATION_DEBUG] Screenshot saved: ${finalScreenshotUrl}`);
            } catch (saveError) {
                console.error("[VIOLATION_DEBUG] Error saving screenshot:", saveError.message);
            }
        }

        // 3. Log Violation in DB
        console.log(`[VIOLATION_DEBUG] Creating Violation document...`);
        const violation = new Violation({
            userId,
            interviewId,
            violationType,
            actionTaken,
            screenshotUrl: finalScreenshotUrl,
            timestamp: new Date()
        });

        await violation.save();
        console.log(`[VIOLATION_DEBUG] Violation saved successfully. ID: ${violation._id}`);

        // 3. Update Interview Session
        let sessionUpdate = {};
        if (violationType === "face_mismatch") {
            console.log(`[VIOLATION_DEBUG] Updating Interview Session ${interviewId} for face_mismatch...`);
            const session = await InterviewSession.findById(interviewId);
            if (session) {
                session.cheating.faceMismatchCount = (session.cheating.faceMismatchCount || 0) + 1;
                if (session.cheating.faceMismatchCount >= 3) session.cheating.isDetected = true;
                await session.save();
                sessionUpdate = {
                    faceMismatchCount: session.cheating.faceMismatchCount,
                    isCritical: session.cheating.faceMismatchCount >= 3
                };
                console.log(`[VIOLATION_DEBUG] Session updated. Mismatch count: ${session.cheating.faceMismatchCount}`);
            } else {
                console.warn(`[VIOLATION_DEBUG] Session ${interviewId} not found to update mismatch count.`);
            }
        }

        // 4. Escalation / Enforcement Logic
        console.log(`[VIOLATION_DEBUG] Calculating recommendations...`);
        const faceMismatchCount = await Violation.countDocuments({ interviewId, violationType: 'face_mismatch' });
        const objectDetectionCount = await Violation.countDocuments({ interviewId, violationType: { $in: ['phone_detected', 'multiple_faces', 'no_face'] } });

        let recommendation = "none";
        if (faceMismatchCount >= 5 || objectDetectionCount >= 4) recommendation = "terminated";
        else if (faceMismatchCount >= 3 || objectDetectionCount >= 2) recommendation = "final_warning";
        else if (faceMismatchCount >= 1 || objectDetectionCount >= 1) recommendation = "warning";

        const totalViolations = faceMismatchCount + objectDetectionCount;

        console.log(`[VIOLATION_DEBUG] DONE. Response sending...`);
        return res.status(201).json({
            success: true,
            message: "Violation logged successfully.",
            violation,
            sessionUpdate,
            enforcement: {
                totalViolations,
                faceMismatchCount,
                objectDetectionCount,
                recommendation,
                requiresImmediateAction: recommendation === "terminated"
            }
        });

    } catch (error) {
        console.error("❌ [VIOLATION_ERROR] FATAL EXCEPTION:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error while logging violation.",
            error: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get violation logs for a specific interview session (Audit Trail)
 * GET /api/interview/violations/:interviewId
 */
exports.getViolationsBySession = async (req, res) => {
    try {
        const { interviewId } = req.params;

        const violations = await Violation.find({ interviewId }).sort({ timestamp: -1 });

        return res.json({
            success: true,
            count: violations.length,
            violations
        });
    } catch (error) {
        console.error("❌ Error fetching violations:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching violations."
        });
    }
};

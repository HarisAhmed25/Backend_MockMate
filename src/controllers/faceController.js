const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const { cosineSimilarity } = require('../utils/faceUtils');

// Simple in-memory cache for face embeddings to speed up repeated verifications
const embeddingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/interview/verify-face
 * Verify that the face in the camera belongs to the registered user.
 */
exports.verifyFace = async (req, res, next) => {
    try {
        const { sessionId, isLookingAway } = req.body;
        // Accept both field names for better compatibility
        const faceEmbedding = req.body.faceEmbedding || req.body.embedding;
        // Fallback to req.user.id if userId is not in body (from authMiddleware)
        const userId = req.body.userId || (req.user && req.user.id);

        // Ultra Strict threshold: 0.94 was matching unauthorized users, so we use 0.96
        const threshold = 0.96;

        console.log(`[FACE_VERIFY] Debug: userId=${userId}, keys=[${Object.keys(req.body).join(', ')}]`);

        if (!userId || !faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userId and faceEmbedding (non-empty array) are required',
                debug: {
                    userId: !!userId,
                    embedding: !!faceEmbedding,
                    isArray: Array.isArray(faceEmbedding),
                    length: faceEmbedding?.length || 0
                }
            });
        }

        // -----------------------------------------------------
        // 🌟 CONDITIONAL VERIFICATION LOGIC
        // "Face verification must only run when the face is stable, centered, and clearly visible."
        // -----------------------------------------------------
        const { isStable = true, isFrontal = true } = req.body;

        // 🌟 CONDITIONAL VERIFICATION LOGIC (DISABLED FOR STRICT MODE)
        // if (isLookingAway || !isFrontal || !isStable) {
        //     console.log(`[FACE_VERIFY] Paused (Ignored for Strict Mode): LookingAway=${isLookingAway}, Frontal=${isFrontal}, Stable=${isStable}`);
        //     // STRICT MODE: We DO NOT return here. We proceed to match the face.
        //     // If the face is looking away, the cosine similarity will naturally drop,
        //     // causing a 'verified: false' --> which leads to a violation if repeated.
        // }

        // 1. Fetch stored embeddings for user (Check cache first)
        const now = Date.now();
        let storedEmbedding = null;
        const cached = embeddingCache.get(userId);

        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            storedEmbedding = cached.embedding;
            console.log(`[FACE_VERIFY] Cache Hit for user: ${userId}`);
        } else {
            console.log(`[FACE_VERIFY] Cache Miss for user: ${userId}. Fetching from DB...`);
            const user = await User.findById(userId).select('+faceEmbedding');
            if (user && user.faceEmbedding && user.faceEmbedding.length > 0) {
                storedEmbedding = user.faceEmbedding;
                embeddingCache.set(userId, {
                    embedding: storedEmbedding,
                    timestamp: now
                });
            } else if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'No face enrollment found.'
                });
            }
        }

        // 2. Compute cosine similarity
        const similarity = cosineSimilarity(storedEmbedding, faceEmbedding);
        const verified = similarity >= threshold;

        // 3. Response Logic with Consecutive Check
        if (verified) {
            // Reset consecutive count on success
            if (sessionId) {
                await InterviewSession.findByIdAndUpdate(sessionId, { 'cheating.consecutiveMismatchCount': 0 });
            }
            return res.status(200).json({
                verified: true,
                similarity,
                message: 'Identity verified.'
            });
        } else {
            console.warn(`[SECURITY] Potential Mismatch. Similarity: ${similarity.toFixed(4)}`);
            let failCount = 0;
            let triggersViolation = false;

            if (sessionId) {
                try {
                    const session = await InterviewSession.findById(sessionId);
                    if (session) {
                        session.cheating.consecutiveMismatchCount = (session.cheating.consecutiveMismatchCount || 0) + 1;
                        failCount = session.cheating.consecutiveMismatchCount;

                        // "Identity mismatch should only be counted when three consecutive mismatches occur"
                        if (failCount >= 3) {
                            session.cheating.faceMismatchCount = (session.cheating.faceMismatchCount || 0) + 1;
                            triggersViolation = true;

                            // Log violation if critical
                            // Only strictly needed if we want to log every single 3rd-hit as a separate violation event
                            // But let's just mark it here and let frontend decide or handling via violation controller
                            if (session.cheating.faceMismatchCount >= 3) {
                                session.cheating.isDetected = true; // Overall cheating flag
                            }
                        }
                        await session.save();
                    }
                } catch (err) {
                    console.error('Error updating session mismatch:', err);
                }
            }

            // Return status
            return res.status(200).json({
                verified: false,
                similarity,
                consecutiveMismatchCount: failCount,
                triggersViolation,
                shouldTerminate: failCount >= 3 && triggersViolation, // Logic handled by Violation Controller usually, but hints here
                message: failCount >= 3
                    ? `Access Denied: Confirmed Identity Mismatch.`
                    : `Warning: Identity Mismatch (${failCount}/3). Please look at the camera.`
            });
        }
    } catch (err) {
        next(err);
    }
};

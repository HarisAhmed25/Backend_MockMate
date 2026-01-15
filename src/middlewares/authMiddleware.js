const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header (Bearer token)
 * Supports both 'id' (legacy) and 'userId' (new format) in token payload
 */
module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    console.log(`[AUTH_DEBUG] Token Decoded:`, JSON.stringify(decoded));

    // Support both 'userId' (new) and 'id' (legacy) for backward compatibility
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      console.error(`[AUTH_DEBUG] No userId in token! Payload keys: ${Object.keys(decoded)}`);
      return res.status(401).json({ message: 'Not authorized, invalid token payload' });
    }

    req.user = {
      id: userId,
      userId: userId,
      email: decoded.email
    };
    console.log(`[AUTH_DEBUG] Auth Success. User: ${userId}`);
    return next();
  } catch (err) {
    console.error(`[AUTH_DEBUG] Token Verification Failed: ${err.message}`);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
    return res.status(401).json({ message: 'Not authorized, token verification failed' });
  }
};

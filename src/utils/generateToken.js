const jwt = require('jsonwebtoken');

function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // JWT payload: { userId, email }
  return jwt.sign(
    { 
      userId: user._id.toString(),
      email: user.email 
    }, 
    secret, 
    {
      expiresIn,
    }
  );
}

module.exports = generateToken;

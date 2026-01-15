const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values (since regular users might not have one initially)
    trim: true
  },

  // store hashed password (optional for Google OAuth users)
  passwordHash: {
    type: String,
    default: null
  },

  // Password reset (do NOT store plain token)
  resetPasswordToken: {
    type: String,
    default: null,
  },

  // Token expiry timestamp (15 minutes from generation)
  resetPasswordExpire: {
    type: Date,
    default: null,
  },

  // OTP-based password reset (preferred)
  resetOtp: {
    type: String,
    default: null,
  },

  resetOtpExpire: {
    type: Date,
    default: null,
  },

  otpVerified: {
    type: Boolean,
    default: false,
  },

  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents without a googleId
  },

  avatar: {
    type: String,
    default: null
  },

  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  // OPTIONAL → does not break existing flow
  dob: {
    type: Date,
    default: null
  },

  citizenship: {
    type: String,
    default: ""
  },

  lastLoginAt: {
    type: Date,
    default: null
  },

  role: {
    type: String,
    enum: ['user', 'admin', 'super-admin'],
    default: 'user'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Face Identity Verification
  faceEmbedding: {
    type: [Number],
    select: false, // Keep it secure, only fetch when needed
    default: undefined
  },
});

// Update updatedAt before saving
userSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('User', userSchema);

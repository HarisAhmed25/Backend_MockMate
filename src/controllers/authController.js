const bcrypt = require('bcrypt');
const crypto = require("crypto");
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendMail } = require("../utils/mailer");

// ----------------------------------
// GOOGLE OAUTH HELPERS
// ----------------------------------
function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function base64UrlEncode(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  if (typeof str !== "string" || !str) return "";
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

function parseGoogleMode(req) {
  const modeRaw = (req?.query?.mode || req?.query?.flow || "").toString().toLowerCase().trim();
  if (modeRaw === "login" || modeRaw === "signin") return "login";
  if (modeRaw === "signup" || modeRaw === "register") return "signup";
  return null;
}

function wantsJson(req) {
  const accept = (req.headers && req.headers.accept) ? String(req.headers.accept) : "";
  // Useful when calling the callback endpoint directly via fetch
  return accept.includes("application/json") || req.query?.format === "json";
}

// ----------------------------------
// VALIDATION HELPERS
// ----------------------------------
function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 6;
}

// ----------------------------------
// REGISTER USER (UPDATED with dob + citizenship)
// ----------------------------------
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, dob, citizenship } = req.body || {};
    const faceEmbedding = req.body.faceEmbedding || req.body.embedding;

    // Required fields
    if (!name || !email || !password || !dob || !citizenship)
      return res.status(400).json({
        message: "name, email, password, dob and citizenship are required"
      });

    if (!validateEmail(email))
      return res.status(400).json({ message: "Invalid email format" });

    if (!validatePassword(password))
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      dob,
      citizenship,
      faceEmbedding // Store the face embedding if provided
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Register Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        citizenship: user.citizenship,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// REGISTER ADMIN API (Secret Key Protected)
// ----------------------------------
exports.registerAdmin = async (req, res, next) => {
  try {
    // Email is NOT required from outside, we auto-generate it if missing
    const { name, username, password, dob, citizenship, adminSecret } = req.body || {};

    // Security Check: Verify admin secret
    // In production, this should be in .env. Default fallback provided for demo.
    const SECURITY_KEY = process.env.ADMIN_SECRET || "admin123";

    if (adminSecret !== SECURITY_KEY) {
      return res.status(403).json({ message: "Invalid Admin Secret Key" });
    }

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Auto-generate email for admin if not provided
    // format: username@admin.local (to satisfy DB unique/required constraint)
    const adminEmail = `${username.toLowerCase().replace(/\s+/g, '')}@admin.local`;

    // Check if user exists (by username or generated email)
    const existing = await User.findOne({
      $or: [{ email: adminEmail }, { username: username.trim() }]
    });

    if (existing) {
      return res.status(409).json({ message: "Admin with this username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name || "Admin User",
      email: adminEmail,
      username: username.trim(),
      passwordHash,
      role: 'admin',      // Force Admin Role
      status: 'active',
      dob: dob || new Date(),
      citizenship: citizenship || "System Admin",
      faceEmbedding: []
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Admin Registered Successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// LOGIN USER (Supports Email OR Username)
// ----------------------------------
exports.loginUser = async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    // Allow login with either email or username (frontend might send 'email' field or 'username' field, or a generic 'identifier')
    const identifier = email || username;

    if (!identifier || !password)
      return res.status(400).json({ message: "Username/Email and password are required" });

    // Find by email OR username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.trim() }
      ]
    });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    
    // Check if user has a password (Google OAuth users might not)
    if (!user.passwordHash) {
      if (user.provider === 'google' || user.googleId) {
        return res.status(400).json({ 
          message: "This account is linked with Google. Please use 'Sign in with Google' to log in." 
        });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.json({
      message: "Login Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        dob: user.dob,
        citizenship: user.citizenship,
        createdAt: user.createdAt,
        role: user.role
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// GET LOGGED-IN USER (Protected)
// ----------------------------------
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user.userId).select("-passwordHash");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        googleId: user.googleId,
        dob: user.dob,
        citizenship: user.citizenship,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// GET USER PROFILE BY ID (Protected)
// ----------------------------------
exports.getProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle "undefined" string or invalid ID formats from frontend
    if (!id || id === "undefined" || id === "null" || id.length < 24) {
      return res.status(400).json({ success: false, message: "Invalid or missing User ID" });
    }

    const user = await User.findById(id).select("-passwordHash -resetPasswordToken -resetPasswordExpire -resetOtp -resetOtpExpire -faceEmbedding");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        dob: user.dob,
        citizenship: user.citizenship,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// UPDATE PROFILE (updated to allow dob + citizenship)
// ----------------------------------
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, dob, citizenship } = req.body || {};

    if (!name && !email && !dob && !citizenship)
      return res.status(400).json({ message: "No fields to update" });

    let updateData = {};

    if (name) updateData.name = name.trim();

    if (dob) updateData.dob = dob;

    if (citizenship) updateData.citizenship = citizenship;

    if (email) {
      if (!validateEmail(email))
        return res.status(400).json({ message: "Invalid email format" });

      const exists = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: userId },
      });

      if (exists)
        return res.status(409).json({ message: "Email already taken" });

      updateData.email = email.toLowerCase().trim();
    }

    const updated = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-passwordHash");

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        dob: updated.dob,
        citizenship: updated.citizenship,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// CHANGE PASSWORD (unchanged)
// ----------------------------------
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords are required" });

    if (!validatePassword(newPassword))
      return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Incorrect old password" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// GOOGLE OAUTH - START (Generate consent URL)
// ----------------------------------
exports.googleAuthStart = async (req, res) => {
  console.log('🔵 Google OAuth start requested');
  try {
    const mode = parseGoogleMode(req); // "login" | "signup" | null
    if (!mode) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Use ?mode=login or ?mode=signup.",
      });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    console.log('🔍 Environment check:');
    console.log('  - GOOGLE_CLIENT_ID:', clientId ? '✅ Set (' + clientId.substring(0, 30) + '...)' : '❌ Missing');
    console.log('  - GOOGLE_CLIENT_SECRET:', clientSecret ? '✅ Set' : '❌ Missing');
    console.log('  - GOOGLE_REDIRECT_URI:', redirectUri || '❌ Missing');
    console.log('  - Expected redirect URI: http://localhost:5000/api/auth/google/callback');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Google OAuth configuration missing');
      // Per frontend contract: treat as a 400-level error for display
      return res.status(400).json({
        success: false,
        message: 'Google OAuth configuration missing. Please check environment variables.',
        mode: mode || "login",
      });
    }

    // Verify redirect URI format
    if (redirectUri !== 'http://localhost:5000/api/auth/google/callback') {
      console.warn('⚠️ WARNING: Redirect URI mismatch!');
      console.warn('  Current:', redirectUri);
      console.warn('  Expected: http://localhost:5000/api/auth/google/callback');
      console.warn('  Make sure Google Cloud Console has the EXACT same URI!');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    console.log('✅ OAuth2Client created with redirect URI:', redirectUri);

    // Generate the authorization URL
    const state = base64UrlEncode(
      JSON.stringify({
        mode, // required; do not default (prevents signup accidentally becoming login)
        ts: Date.now(),
      })
    );
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'consent', // Force consent screen to get refresh token
      state,
    });

    console.log('✅ Google OAuth URL generated');
    console.log('🔄 Redirecting to Google...');

    // Redirect directly to Google (preferred approach)
    return res.redirect(authUrl);
  } catch (err) {
    console.error('❌ Google OAuth start error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      message: 'Failed to initiate Google OAuth',
      error: err.message,
    });
  }
};

// ----------------------------------
// GOOGLE OAUTH - CALLBACK (Handle Google redirect)
// ----------------------------------
exports.googleAuthCallback = async (req, res) => {
  console.log('🔵 Google OAuth callback received');
  console.log('Query params:', req.query);

  try {
    const { code, error, state } = req.query;
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

    // Standardize JSON error/success payloads for frontend display.
    const sendGoogleError = (msg) => {
      if (wantsJson(req)) return res.status(400).json({ success: false, message: msg, mode });
      return res.redirect(`${frontendOrigin}/auth/google/callback?error=${encodeURIComponent(msg)}&mode=${encodeURIComponent(mode)}`);
    };

    // Determine whether this Google OAuth attempt was for login or signup
    let mode = null;
    try {
      if (state) {
        const decoded = base64UrlDecode(String(state));
        const parsed = JSON.parse(decoded);
        mode = (parsed?.mode || "").toString().toLowerCase().trim();
      }
    } catch (_) {
      // ignore malformed state; we'll fall back below
    }
    if (mode !== "login" && mode !== "signup") {
      // Be strict: if we can't determine mode reliably, fail fast.
      mode = parseGoogleMode(req);
      if (mode !== "login" && mode !== "signup") {
        return sendGoogleError("Invalid mode. Please start Google auth with ?mode=login or ?mode=signup.");
      }
    }

    if (error) {
      console.error('❌ Google OAuth error from Google:', error);
      const msg = String(error);
      return sendGoogleError(msg);
    }

    if (!code) {
      console.error('❌ No authorization code provided');
      return sendGoogleError('No authorization code provided');
    }

    console.log('✅ Authorization code received:', code.substring(0, 20) + '...');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    console.log('🔍 Environment check:');
    console.log('  - GOOGLE_CLIENT_ID:', clientId ? '✅ Set (' + clientId.substring(0, 30) + '...)' : '❌ Missing');
    console.log('  - GOOGLE_CLIENT_SECRET:', clientSecret ? '✅ Set' : '❌ Missing');
    console.log('  - GOOGLE_REDIRECT_URI:', redirectUri || '❌ Missing');
    console.log('  - FRONTEND_ORIGIN:', frontendOrigin);
    console.log('  - Expected redirect URI: http://localhost:5000/api/auth/google/callback');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Google OAuth configuration missing');
      return sendGoogleError('Server configuration error');
    }

    // Verify redirect URI format
    if (redirectUri !== 'http://localhost:5000/api/auth/google/callback') {
      console.warn('⚠️ WARNING: Redirect URI mismatch!');
      console.warn('  Current:', redirectUri);
      console.warn('  Expected: http://localhost:5000/api/auth/google/callback');
      console.warn('  Make sure Google Cloud Console has the EXACT same URI!');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    console.log('✅ OAuth2Client created with redirect URI:', redirectUri);

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    let tokens;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
      console.log('✅ Tokens received from Google');
    } catch (tokenError) {
      console.error('❌ Token exchange failed:', tokenError.message);
      return sendGoogleError('Failed to exchange code for tokens: ' + tokenError.message);
    }

    oauth2Client.setCredentials(tokens);

    // Verify and decode the ID token
    console.log('🔄 Verifying ID token...');
    let ticket;
    try {
      ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId, // Must match GOOGLE_CLIENT_ID
      });
      console.log('✅ ID token verified');
    } catch (verifyError) {
      console.error('❌ ID token verification failed:', verifyError.message);
      return sendGoogleError('Token verification failed: ' + verifyError.message);
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;

    console.log('✅ User data extracted:');
    console.log('  - Email:', email);
    console.log('  - Name:', name);
    console.log('  - Google ID:', googleId);

    if (!email) {
      console.error('❌ Email not provided by Google');
      return sendGoogleError('Email not provided by Google');
    }

    const normalizedEmail = normalizeEmail(email);

    // Enforced behavior:
    // - Google LOGIN: email must exist (do NOT create)
    // - Google SIGNUP: email must NOT exist (create exactly once)
    console.log(`🔄 Google OAuth mode: ${mode}`);
    console.log('🔄 Looking up user by email...');
    // Use case-insensitive exact match to prevent duplicates created by casing differences.
    let userByEmail = await User.findOne({
      email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
    });
    console.log('  - User exists for email:', !!userByEmail);

    if (mode === "login") {
      if (!userByEmail) {
        return sendGoogleError("Account does not exist. Please sign up first.");
      }

      // Optional safety: If this googleId is already linked to another account, block.
      if (googleId) {
        const other = await User.findOne({ googleId, _id: { $ne: userByEmail._id } });
        if (other) {
          return sendGoogleError("This Google account is already linked to a different user.");
        }
      }

      console.log('🔄 Updating existing user with Google info (login)...');
      userByEmail.googleId = googleId || userByEmail.googleId;
      userByEmail.avatar = avatar || userByEmail.avatar;
      userByEmail.provider = 'google';
      userByEmail.lastLoginAt = new Date();
      if (name) userByEmail.name = name;
      await userByEmail.save();
      console.log('✅ User logged in via Google');

      const token = generateToken(userByEmail);
      if (wantsJson(req)) {
        return res.status(200).json({
          success: true,
          message: "Login Successfully",
          isNewUser: false,
          mode,
          user: {
            id: userByEmail._id,
            name: userByEmail.name,
            email: userByEmail.email,
            avatar: userByEmail.avatar,
            provider: userByEmail.provider,
            googleId: userByEmail.googleId,
            dob: userByEmail.dob,
            citizenship: userByEmail.citizenship,
            lastLoginAt: userByEmail.lastLoginAt,
            createdAt: userByEmail.createdAt,
          },
          token,
        });
      }

      const redirectUrl = `${frontendOrigin}/auth/google/callback?token=${encodeURIComponent(token)}&isNewUser=false&mode=${encodeURIComponent(mode)}&message=${encodeURIComponent("Login Successfully")}`;
      console.log('✅ Redirecting to frontend:', redirectUrl);
      return res.redirect(redirectUrl);
    }

    // mode === "signup"
    if (userByEmail) {
      return sendGoogleError("Account already exists. Please login.");
    }

    // Optional safety: if googleId already exists, don't create a new email account.
    if (googleId) {
      const existingGoogle = await User.findOne({ googleId });
      if (existingGoogle) {
        return sendGoogleError("This Google account is already linked. Please login.");
      }
    }

    console.log('🔄 Creating new user (signup via Google)...');
    let newUser;
    try {
      newUser = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: googleId || null,
        avatar: avatar || null,
        provider: 'google',
        passwordHash: null,
        lastLoginAt: new Date(),
      });
      console.log('✅ New user created:', newUser._id);
    } catch (createError) {
      // Duplicate protection (race condition): unique index on email/googleId will throw E11000
      const isDup = createError && (createError.code === 11000 || String(createError.message || "").includes("E11000"));
      const msg = isDup
        ? "Account already exists. Please login."
        : "Failed to create user: " + createError.message;
      console.error('❌ User creation failed:', createError.message);
      return sendGoogleError(msg);
    }

    const token = generateToken(newUser);
    if (wantsJson(req)) {
      return res.status(200).json({
        success: true,
        message: "Sign up Successfully",
        isNewUser: true,
        mode,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          provider: newUser.provider,
          googleId: newUser.googleId,
          dob: newUser.dob,
          citizenship: newUser.citizenship,
          lastLoginAt: newUser.lastLoginAt,
          createdAt: newUser.createdAt,
        },
        token,
      });
    }

    const redirectUrl = `${frontendOrigin}/auth/google/callback?token=${encodeURIComponent(token)}&isNewUser=true&mode=${encodeURIComponent(mode)}&message=${encodeURIComponent("Sign up Successfully")}`;
    console.log('✅ Redirecting to frontend:', redirectUrl);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('❌ Google OAuth callback error:', err);
    console.error('Error stack:', err.stack);
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

    // Make sure we don't try to send response if already sent
    if (!res.headersSent) {
      const errorMessage = err.message || 'Authentication failed';
      console.error('Redirecting with error:', errorMessage);
      if (wantsJson(req)) return res.status(400).json({ success: false, message: errorMessage, mode: req?.query?.mode || undefined });
      return res.redirect(`${frontendOrigin}/auth/google/callback?error=${encodeURIComponent(errorMessage)}`);
    } else {
      console.error('Response already sent, cannot redirect');
    }
  }
};

// ----------------------------------
// LOGOUT (Optional - clears session if using cookies)
// ----------------------------------
exports.logout = async (req, res) => {
  try {
    // If using HTTP-only cookies, clear them here
    // For JWT in Authorization header, logout is handled client-side
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Logout failed', error: err.message });
  }
};

// ----------------------------------
// FORGOT PASSWORD (OTP-BASED)
// ----------------------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    // 1) Read & validate email from body
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // 2) Find the app user by email (this does NOT reset Gmail passwords)
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // 3) If no user, return a proper error response
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 4) Generate 6-digit numeric OTP
    // Note: crypto.randomInt avoids predictable Math.random()
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

    // 5) Hash OTP before storing in DB (never store plain OTP)
    // Using HMAC with a server-side secret ("pepper") makes brute-force/rainbow tables harder.
    const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET || "otp-secret";
    const otpHash = crypto.createHmac("sha256", otpSecret).update(otp).digest("hex");

    user.resetOtp = otpHash;
    // 6) OTP expiry: 5 minutes
    user.resetOtpExpire = new Date(Date.now() + 5 * 60 * 1000);
    user.otpVerified = false;
    await user.save();

    try {
      // 7) Send OTP via email (works with Yopmail / any mailbox)
      await sendMail({
        to: user.email,
        subject: "Your password reset OTP",
        text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, ignore this email.`,
        html: `
          <p>You requested a password reset.</p>
          <p>Your OTP is:</p>
          <h2 style="letter-spacing: 2px;">${otp}</h2>
          <p>This OTP is valid for <strong>5 minutes</strong>.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
      });
    } catch (mailErr) {
      // 8) If email fails, log OTP for dev (per requirement) and return an error
      // IMPORTANT: This does NOT reset Gmail passwords; it only affects app users.
      console.warn("⚠️ OTP email failed to send. DEV OTP:", otp);
      console.warn("Mail error message:", mailErr && mailErr.message);
      console.warn("Mail error code:", mailErr && mailErr.code);
      console.warn("Mail error response:", mailErr && mailErr.response);
      console.warn("Mail error command:", mailErr && mailErr.command);
      user.resetOtp = null;
      user.resetOtpExpire = null;
      user.otpVerified = false;
      await user.save();
      // In dev, return a little more detail to speed up debugging (avoid leaking in prod)
      const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
      const payload = { success: false, message: "Email could not be sent" };
      if (!isProd) payload.details = mailErr && (mailErr.response || mailErr.message);
      return res.status(500).json(payload);
    }

    // 9) Success response
    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// VERIFY OTP
// ----------------------------------
exports.verifyOtp = async (req, res, next) => {
  try {
    // 1) Read & validate inputs
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "email and otp are required" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ success: false, message: "otp must be a 6-digit number" });
    }

    // 2) Hash received OTP to match stored hash
    const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET || "otp-secret";
    const otpHash = crypto.createHmac("sha256", otpSecret).update(otp.trim()).digest("hex");

    // 3) Find user with matching OTP and non-expired time
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
      resetOtp: otpHash,
      resetOtpExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // 4) Mark OTP verified
    user.otpVerified = true;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------
// RESET PASSWORD (OTP-BASED)
// ----------------------------------
exports.resetPassword = async (req, res, next) => {
  try {
    // 1) Read & validate inputs
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "email and newPassword are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2) Ensure OTP was verified and is still within expiry window
    if (!user.otpVerified) {
      return res.status(403).json({ success: false, message: "OTP not verified" });
    }
    if (!user.resetOtpExpire || user.resetOtpExpire <= new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    // 3) Hash the new password with bcrypt and save to passwordHash (used by login)
    user.passwordHash = await bcrypt.hash(newPassword, 10);

    // 4) Clear OTP fields so it can't be reused
    user.resetOtp = null;
    user.resetOtpExpire = null;
    user.otpVerified = false;

    // 5) Save updated user
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

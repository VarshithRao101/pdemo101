/**
 * Inspire ERP System - Foundation Server Skeleton
 * Express + MongoDB Atlas with serverless connection caching, bcrypt security,
 * JWT authentication, persistent fail-closed rate limiting, CORS isolation, and role authorization.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { connectToDatabase } = require('./db.cjs');
const User = require('./models/User.cjs');
const RefreshToken = require('./models/RefreshToken.cjs');
const RateLimit = require('./models/RateLimit.cjs');
const Student = require('./models/Student.cjs');
const Teacher = require('./models/Teacher.cjs');
const FeeSettings = require('./models/FeeSettings.cjs');
const Expenditure = require('./models/Expenditure.cjs');
const WorkerPayment = require('./models/WorkerPayment.cjs');
const Payment = require('./models/Payment.cjs');

const {
  generateAndUploadBackup,
  wipeDataCollections,
  restoreBackupFromFile,
  getBackupLogs,
  getAllAvailableBackupFiles,
  listBackupFiles
} = require('./services/backupService.cjs');

const app = express();

// Security Headers via Helmet with Hardened Content Security Policy (CSP) Enabled (unsafe-eval removed)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://inspirehnk.org,https://www.inspirehnk.org')
  .split(',')
  .map(o => o.trim().toLowerCase());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normOrigin = origin.toLowerCase().trim();
    if (allowedOrigins.includes(normOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    const err = new Error('Not allowed by CORS policy');
    err.status = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-security-key', 'x-security-otp']
}));

app.use(express.json());
app.use(morgan('dev'));

const JWT_SECRET = process.env.JWT_SECRET || 'inspire_secure_jwt_secret_64byte_random_hex_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'inspire_secure_jwt_refresh_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Valid campus branches
const VALID_CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

function isValidCampus(branch) {
  if (!branch || typeof branch !== 'string') return false;
  return VALID_CAMPUSES.includes(branch.trim());
}

function isValidPositiveNumber(val) {
  if (val === undefined || val === null) return false;
  const num = Number(val);
  return !isNaN(num) && num >= 0;
}

// --- IDEMPOTENT PER-USERNAME BOOTSTRAP SEEDER ---
async function seedInitialAccounts() {
  try {
    const defaultUsers = [
      {
        username: 'admin1',
        password: bcrypt.hashSync('RectorPass#2026', 10),
        pin: bcrypt.hashSync('102938', 10),
        role: 'admin1',
        campus: 'All',
        name: 'Rector'
      },
      {
        username: '9059068384',
        password: bcrypt.hashSync('00112233', 10),
        pin: bcrypt.hashSync('789456', 10),
        role: 'authenticator',
        campus: 'All',
        name: 'Security Authenticator'
      },
      {
        username: 'admin2_erragattugutta_c1',
        password: bcrypt.hashSync('DeanE1#8492', 10),
        pin: bcrypt.hashSync('849201', 10),
        role: 'admin2',
        campus: 'Erragattugutta C1',
        name: 'Dean Erragattugutta C1'
      },
      {
        username: 'admin2_erragattugutta_c2',
        password: bcrypt.hashSync('DeanE2#5713', 10),
        pin: bcrypt.hashSync('571302', 10),
        role: 'admin2',
        campus: 'Erragattugutta C2',
        name: 'Dean Erragattugutta C2'
      },
      {
        username: 'admin2_beemaram_c1',
        password: bcrypt.hashSync('DeanB1#3920', 10),
        pin: bcrypt.hashSync('392003', 10),
        role: 'admin2',
        campus: 'Beemaram C1',
        name: 'Dean Beemaram C1'
      },
      {
        username: 'admin2_beemaram_c2',
        password: bcrypt.hashSync('DeanB2#6184', 10),
        pin: bcrypt.hashSync('618404', 10),
        role: 'admin2',
        campus: 'Beemaram C2',
        name: 'Dean Beemaram C2'
      },
      {
        username: 'accountant_erragattugutta_c1_1',
        password: bcrypt.hashSync('AccE1#4102', 10),
        pin: bcrypt.hashSync('410201', 10),
        role: 'accountant',
        campus: 'Erragattugutta C1',
        name: 'Acc 1 Erragattugutta C1'
      },
      {
        username: 'accountant_erragattugutta_c1_2',
        password: bcrypt.hashSync('AccE1#9381', 10),
        pin: bcrypt.hashSync('938102', 10),
        role: 'accountant',
        campus: 'Erragattugutta C1',
        name: 'Acc 2 Erragattugutta C1'
      },
      {
        username: 'accountant_erragattugutta_c2_1',
        password: bcrypt.hashSync('AccE2#7294', 10),
        pin: bcrypt.hashSync('729403', 10),
        role: 'accountant',
        campus: 'Erragattugutta C2',
        name: 'Acc 1 Erragattugutta C2'
      },
      {
        username: 'accountant_erragattugutta_c2_2',
        password: bcrypt.hashSync('AccE2#1845', 10),
        pin: bcrypt.hashSync('184504', 10),
        role: 'accountant',
        campus: 'Erragattugutta C2',
        name: 'Acc 2 Erragattugutta C2'
      },
      {
        username: 'accountant_beemaram_c1_1',
        password: bcrypt.hashSync('AccB1#6530', 10),
        pin: bcrypt.hashSync('653005', 10),
        role: 'accountant',
        campus: 'Beemaram C1',
        name: 'Acc 1 Beemaram C1'
      },
      {
        username: 'accountant_beemaram_c1_2',
        password: bcrypt.hashSync('AccB1#2947', 10),
        pin: bcrypt.hashSync('294706', 10),
        role: 'accountant',
        campus: 'Beemaram C1',
        name: 'Acc 2 Beemaram C1'
      },
      {
        username: 'accountant_beemaram_c2_1',
        password: bcrypt.hashSync('AccB2#8163', 10),
        pin: bcrypt.hashSync('816307', 10),
        role: 'accountant',
        campus: 'Beemaram C2',
        name: 'Acc 1 Beemaram C2'
      },
      {
        username: 'accountant_beemaram_c2_2',
        password: bcrypt.hashSync('AccB2#3750', 10),
        pin: bcrypt.hashSync('375008', 10),
        role: 'accountant',
        campus: 'Beemaram C2',
        name: 'Acc 2 Beemaram C2'
      }
    ];

    let insertedCount = 0;
    for (const u of defaultUsers) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        await User.create(u);
        insertedCount++;
      }
    }

    if (insertedCount > 0) {
      console.log(`✅ [Seeder]: Created ${insertedCount} missing default user account(s).`);
    } else {
      console.log('ℹ️ [Seeder]: All default user accounts exist. Zero documents modified.');
    }
  } catch (err) {
    console.error('⚠️ [Seeder]: User account seeding notice:', err.message);
  }
}

// ONE-TIME ASYNCHRONOUS BOOTSTRAP
let bootstrapPromise = null;
function ensureBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = connectToDatabase()
      .then(() => seedInitialAccounts())
      .catch(err => {
        bootstrapPromise = null;
        console.warn('⚠️ [Boot]: Bootstrap initialization notice:', err.message);
      });
  }
  return bootstrapPromise;
}

ensureBootstrap();


// --- SECURITY MIDDLEWARE ---

// Persistent MongoDB Fail-Closed Rate Limiter
async function mongoRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const key = `ratelimit_${req.path}_${ip}`;
  const now = new Date();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 30;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        message: 'Service temporarily unavailable. Database required for security rate-limit verification.'
      });
    }

    let record = await RateLimit.findOne({ key });
    if (!record || record.resetAt < now) {
      const resetAt = new Date(Date.now() + windowMs);
      record = await RateLimit.findOneAndUpdate(
        { key },
        { count: 1, resetAt },
        { upsert: true, new: true }
      );
    } else {
      record.count += 1;
      await record.save();
    }

    if (record.count > maxAttempts) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
      });
    }

    next();
  } catch (err) {
    console.error('Rate limiter exception:', err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable. Database rate limiter check failed.'
    });
  }
}

// JWT Authentication Middleware with MongoDB Single-Session Verification
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Missing Bearer token.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check activeSessionId against database in MongoDB
    if (decoded.id && decoded.sessionId) {
      await connectToDatabase();
      const dbUser = await User.findById(decoded.id).select('activeSessionId status');
      if (!dbUser || dbUser.status === 'disabled') {
        return res.status(401).json({ status: 'error', message: 'User account not found or disabled.' });
      }

      if (!dbUser.activeSessionId || dbUser.activeSessionId !== decoded.sessionId) {
        return res.status(401).json({
          status: 'error',
          message: 'Your session has ended because this account was logged in elsewhere.'
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired access token.'
    });
  }
}

// Role Authorization Middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access forbidden. Insufficient permissions for this role.'
      });
    }

    next();
  };
}

// Campus Isolation Middleware
function enforceCampusIsolation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  const requestedCampus = req.query.campus || req.query.branch || req.body.campus || req.body.branch || req.params.campus || req.params.branch;
  if (!requestedCampus || req.user.campus === 'All' || String(requestedCampus).toLowerCase() === 'all') {
    return next();
  }

  if (requestedCampus.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
    return res.status(403).json({
      status: 'error',
      message: `Access forbidden. Account is restricted to campus [${req.user.campus}].`
    });
  }

  next();
}

// Security OTP PIN Verification Middleware
async function verifySecurityOtp(req, res, next) {
  const otpHeader = req.headers['x-security-otp'] || req.headers['x-security-key'];
  if (!otpHeader || !String(otpHeader).trim()) {
    return res.status(403).json({
      status: 'error',
      message: 'Security PIN (OTP) required in X-Security-OTP header.'
    });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(req.user.id);
    if (!user || !user.pin) {
      return res.status(403).json({ status: 'error', message: 'User account security PIN error.' });
    }

    const isMatch = bcrypt.compareSync(String(otpHeader).trim(), user.pin);
    if (!isMatch) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid Security PIN (OTP) provided.'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Internal security PIN verification error.' });
  }
}


// --- USERNAME ALIAS RESOLUTION ---
const usernameAliasMap = {
  admin: 'admin1',
  admin1: 'admin1',
  rector: 'admin1',
  superadmin: 'admin1',
  admin2: 'admin2_erragattugutta_c1',
  principal: 'admin2_erragattugutta_c1',
  admin2_e1: 'admin2_erragattugutta_c1',
  admin2_c1: 'admin2_erragattugutta_c1',
  admin2_e2: 'admin2_erragattugutta_c2',
  admin2_c2: 'admin2_erragattugutta_c2',
  admin2_b1: 'admin2_beemaram_c1',
  admin2_b2: 'admin2_beemaram_c2',
  accountant: 'accountant_erragattugutta_c1_1',
  accountant1: 'accountant_erragattugutta_c1_1',
  acc: 'accountant_erragattugutta_c1_1',
  accountant1_e1: 'accountant_erragattugutta_c1_1',
  acc1_e1: 'accountant_erragattugutta_c1_1',
  accountant2_e1: 'accountant_erragattugutta_c1_2',
  acc2_e1: 'accountant_erragattugutta_c1_2',
  accountant1_e2: 'accountant_erragattugutta_c2_1',
  acc1_e2: 'accountant_erragattugutta_c2_1',
  accountant2_e2: 'accountant_erragattugutta_c2_2',
  acc2_e2: 'accountant_erragattugutta_c2_2',
  accountant1_b1: 'accountant_beemaram_c1_1',
  acc1_b1: 'accountant_beemaram_c1_1',
  accountant2_b1: 'accountant_beemaram_c1_2',
  acc2_b1: 'accountant_beemaram_c1_2',
  accountant1_b2: 'accountant_beemaram_c2_1',
  acc1_b2: 'accountant_beemaram_c2_1',
  accountant2_b2: 'accountant_beemaram_c2_2',
  acc2_b2: 'accountant_beemaram_c2_2',
  authenticator: '9059068384',
  security: '9059068384'
};

function resolveUsername(input) {
  if (!input) return '';
  const clean = String(input).trim().toLowerCase();
  return usernameAliasMap[clean] || clean;
}


// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/verify-credentials', mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { username, identifier, password } = req.body;
    const inputUser = username || identifier;

    if (!inputUser || typeof password !== 'string' || !password.trim()) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const resolvedUser = resolveUsername(inputUser);
    const user = await User.findOne({ username: resolvedUser });

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    return res.json({
      status: 'success',
      role: user.role,
      campus: user.campus
    });
  } catch (err) {
    console.error('Error verifying credentials:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.post('/api/auth/login', mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { username, identifier, password, pin } = req.body;
    const inputUser = username || identifier;

    if (!inputUser || typeof password !== 'string' || !password.trim() || !pin) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const resolvedUser = resolveUsername(inputUser);
    const user = await User.findOne({ username: resolvedUser });

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const isPasswordOk = bcrypt.compareSync(password.trim(), user.password);
    const isPinOk = bcrypt.compareSync(String(pin).trim(), user.pin);

    if (!isPasswordOk || !isPinOk) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    // Step 2: Detect session conflict if account is already logged in elsewhere
    if (user.activeSessionId) {
      return res.status(409).json({
        status: 'session_conflict',
        message: 'This account is already logged in on another device.'
      });
    }

    // Generate new activeSessionId
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    user.activeSessionId = newSessionId;
    await user.save();

    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name,
      sessionId: newSessionId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      tokenHash,
      userId: user._id,
      username: user.username,
      expiresAt,
      revoked: false
    });

    return res.json({
      status: 'success',
      token,
      refreshToken: refreshTokenRaw,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        campus: user.campus,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error logging in user:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// --- FORCE LOGIN ROUTE (KICK OTHER SESSION) ---
app.post('/api/auth/force-login', mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { username, identifier, password, pin } = req.body;
    const inputUser = username || identifier;

    if (!inputUser || typeof password !== 'string' || !password.trim() || !pin) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const resolvedUser = resolveUsername(inputUser);
    const user = await User.findOne({ username: resolvedUser });

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const isPasswordOk = bcrypt.compareSync(password.trim(), user.password);
    const isPinOk = bcrypt.compareSync(String(pin).trim(), user.pin);

    if (!isPasswordOk || !isPinOk) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    // Generate NEW activeSessionId to overwrite old session and evict previous login
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    user.activeSessionId = newSessionId;
    await user.save();

    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name,
      sessionId: newSessionId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      tokenHash,
      userId: user._id,
      username: user.username,
      expiresAt,
      revoked: false
    });

    console.log(`🔑 [Force Login]: Account [${user.username}] logged in with new session [${newSessionId}]. Evicted previous session.`);

    return res.json({
      status: 'success',
      token,
      refreshToken: refreshTokenRaw,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        campus: user.campus,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error force logging in user:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    await connectToDatabase();
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ status: 'error', message: 'Refresh token required' });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const record = await RefreshToken.findOne({ tokenHash, revoked: false });

    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(record.userId);
    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'User account disabled' });
    }

    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name,
      sessionId: user.activeSessionId
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      status: 'success',
      token: newAccessToken
    });
  } catch (err) {
    console.error('Error refreshing token:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    await connectToDatabase();
    const { refreshToken } = req.body;

    let userIdToClear = null;

    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenDoc = await RefreshToken.findOne({ tokenHash });
      if (tokenDoc) {
        userIdToClear = tokenDoc.userId;
        await RefreshToken.updateOne({ tokenHash }, { revoked: true });
      }
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) userIdToClear = decoded.id;
      } catch (e) {}
    }

    if (userIdToClear) {
      await User.updateOne({ _id: userIdToClear }, { activeSessionId: null });
      console.log(`🚪 [Logout]: Cleared activeSessionId for user ID [${userIdToClear}].`);
    }

    return res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ status: 'success', message: 'Logged out successfully' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.user.id).select('-password -pin');

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'User not found or disabled' });
    }

    return res.json({
      status: 'success',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        campus: user.campus,
        name: user.name
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


// --- STUDENT ROUTES ---

app.get('/api/admin1/students', authenticateToken, requireRole('admin1'), async (req, res) => {
  try {
    await connectToDatabase();
    const { branch } = req.query;
    let filter = {};
    if (branch && String(branch).toLowerCase() !== 'all') {
      if (!isValidCampus(branch)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = String(branch).trim();
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

const createStudentHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const body = req.body || {};
    const {
      name, admissionNumber, course, section, branch, mobile, fatherName, motherName, parentMobile, dob, address, hostelStatus, transportStatus,
      tuitionFee = 0, hostelFee = 0, transportFee = 0, miscellaneousFee = 0, previousPending = 0, customFeeSlots = [], academicYear = '2026-2027'
    } = body;

    if (!name || !admissionNumber) {
      return res.status(400).json({ status: 'error', message: 'Student name and admission number are required.' });
    }

    const targetBranch = branch || req.user.campus;
    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(tuitionFee) || !isValidPositiveNumber(hostelFee) || !isValidPositiveNumber(transportFee) || !isValidPositiveNumber(miscellaneousFee) || !isValidPositiveNumber(previousPending)) {
      return res.status(400).json({ status: 'error', message: 'Fee amounts must be valid non-negative numbers.' });
    }

    if (req.user.role === 'accountant' || req.user.role === 'admin2') {
      if (req.user.campus !== 'All' && targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `Accountants can only add students to their assigned campus [${req.user.campus}].`
        });
      }
    }

    const existing = await Student.findOne({ admissionNumber: String(admissionNumber).trim() });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Student with admission number [${admissionNumber}] already exists.`
      });
    }

    const totalCustomFees = (Array.isArray(customFeeSlots) ? customFeeSlots : []).reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
    const grossFees = Number(tuitionFee) + Number(hostelFee) + Number(transportFee) + Number(miscellaneousFee) + Number(previousPending) + totalCustomFees;
    const remainingBalance = Math.max(0, grossFees);

    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    const studentId = `STU-${Date.now().toString().slice(-6)}`;

    const newStudent = await Student.create({
      studentId,
      admissionNumber: String(admissionNumber).trim(),
      name: String(name).trim(),
      fatherName: fatherName || '',
      motherName: motherName || '',
      mobile: mobile || '',
      parentMobile: parentMobile || '',
      email: body.email || '',
      course: course || '',
      section: section || '',
      branch: targetBranch,
      rollNumber: body.rollNumber || '',
      status: 'Active',
      dob: dob || '',
      address: address || '',
      hostelStatus: hostelStatus || 'Day Scholar',
      transportStatus: transportStatus || 'Self Transport',
      tuitionFee: Number(tuitionFee),
      hostelFee: Number(hostelFee),
      transportFee: Number(transportFee),
      miscellaneousFee: Number(miscellaneousFee),
      previousPending: Number(previousPending),
      totalPaid: 0,
      remainingBalance,
      tuitionWaiver: 0,
      hostelWaiver: 0,
      transportWaiver: 0,
      miscWaiver: 0,
      customFeeSlots: Array.isArray(customFeeSlots) ? customFeeSlots : [],
      academicYear
    });

    return res.status(201).json({
      status: 'success',
      data: newStudent,
      credential: {
        username: studentId,
        pin: randomPin
      }
    });
  } catch (err) {
    console.error('Error creating student:', err.message);
    return res.status(500).json({ status: 'error', message: `Database write failure: ${err.message}` });
  }
};

app.post('/api/admin1/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);
app.post('/api/admin/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);
app.post('/api/accountant/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);

app.patch('/api/admin1/students/:id', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to [${student.branch}].` });
      }
    }

    Object.assign(student, req.body);
    await student.save();

    return res.json({ status: 'success', data: student });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/admin1/students/:id', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] };

    const result = await Student.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    const verifySearch = await Student.findOne(query);
    if (verifySearch) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Student record still exists in database.' });
    }

    return res.json({ status: 'success', message: 'Student record permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- FEE WAIVER ROUTE ---

app.patch('/api/admin2/students/:studentId/fee-override', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const { tuitionWaiver = 0, hostelWaiver = 0, transportWaiver = 0, miscWaiver = 0 } = req.body;

    if (!isValidPositiveNumber(tuitionWaiver) || !isValidPositiveNumber(hostelWaiver) || !isValidPositiveNumber(transportWaiver) || !isValidPositiveNumber(miscWaiver)) {
      return res.status(400).json({ status: 'error', message: 'Waiver amounts must be valid non-negative numbers.' });
    }

    const isObjId = mongoose.Types.ObjectId.isValid(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    student.tuitionWaiver = Number(tuitionWaiver);
    student.hostelWaiver = Number(hostelWaiver);
    student.transportWaiver = Number(transportWaiver);
    student.miscWaiver = Number(miscWaiver);

    const totalCustomFees = (student.customFeeSlots || []).reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
    const grossFees = Number(student.tuitionFee || 0) + Number(student.hostelFee || 0) + Number(student.transportFee || 0) + Number(student.miscellaneousFee || 0) + Number(student.previousPending || 0) + totalCustomFees;
    const totalWaivers = student.tuitionWaiver + student.hostelWaiver + student.transportWaiver + student.miscWaiver;

    student.remainingBalance = Math.max(0, grossFees - totalWaivers - Number(student.totalPaid || 0));
    await student.save();

    return res.json({
      status: 'success',
      message: 'Fee waiver updated successfully',
      data: {
        studentId: student.studentId,
        tuitionWaiver: student.tuitionWaiver,
        hostelWaiver: student.hostelWaiver,
        transportWaiver: student.transportWaiver,
        miscWaiver: student.miscWaiver,
        remainingBalance: student.remainingBalance
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- FACULTY / TEACHER ROUTES ---

app.get('/api/admin1/teachers', authenticateToken, requireRole('admin1'), async (req, res) => {
  try {
    await connectToDatabase();
    const { branch } = req.query;
    let filter = {};
    if (branch && String(branch).toLowerCase() !== 'all') {
      if (!isValidCampus(branch)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = String(branch).trim();
    }
    const teachers = await Teacher.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: teachers });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/admin1/teachers', authenticateToken, requireRole('admin1'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id, name, subject, salary = 0, mobile, email, branch, classification = 'Teaching', role = 'Senior Lecturer' } = req.body || {};

    if (!id || !name || !subject || !branch) {
      return res.status(400).json({ status: 'error', message: 'Teacher ID, name, subject, and campus branch are required.' });
    }

    if (!isValidCampus(branch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(salary)) {
      return res.status(400).json({ status: 'error', message: 'Salary must be a valid non-negative number.' });
    }

    const existing = await Teacher.findOne({ id: String(id).trim() });
    if (existing) {
      return res.status(409).json({ status: 'error', message: `Teacher with ID [${id}] already exists.` });
    }

    const teacher = await Teacher.create({
      id: String(id).trim(),
      name: String(name).trim(),
      subject: String(subject).trim(),
      salary: Number(salary),
      mobile: mobile || '',
      email: email || '',
      branch,
      classification,
      role,
      status: 'Active'
    });

    return res.status(201).json({ status: 'success', data: teacher });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Database write failure: ${err.message}` });
  }
});

app.patch('/api/admin1/teachers/:id', authenticateToken, requireRole('admin1'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    Object.assign(teacher, req.body);
    await teacher.save();

    return res.json({ status: 'success', data: teacher });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/admin1/teachers/:id', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const result = await Teacher.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    const verifySearch = await Teacher.findOne(query);
    if (verifySearch) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Teacher record still exists in database.' });
    }

    return res.json({ status: 'success', message: 'Teacher record permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- FEE STRUCTURE ROUTES ---

app.get('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;
    if (!branch || branch.toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Specific campus branch query parameter required.' });
    }

    if (!isValidCampus(branch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    let settings = await FeeSettings.findOne({ branch });
    if (!settings) {
      settings = await FeeSettings.create({
        branch,
        tuition: 120000,
        hostel: 85000,
        transport: 15000,
        misc: 5000,
        isLocked: false
      });
    }

    return res.json({ status: 'success', data: settings });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.patch('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { branch, tuition, hostel, transport, misc, isLocked } = req.body;
    const targetBranch = branch || req.user.campus;

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only edit fee settings for campus [${req.user.campus}].` });
      }
    }

    const updateFields = {};
    if (tuition !== undefined) {
      if (!isValidPositiveNumber(tuition)) return res.status(400).json({ status: 'error', message: 'Tuition fee must be a valid non-negative number.' });
      updateFields.tuition = Number(tuition);
    }
    if (hostel !== undefined) {
      if (!isValidPositiveNumber(hostel)) return res.status(400).json({ status: 'error', message: 'Hostel fee must be a valid non-negative number.' });
      updateFields.hostel = Number(hostel);
    }
    if (transport !== undefined) {
      if (!isValidPositiveNumber(transport)) return res.status(400).json({ status: 'error', message: 'Transport fee must be a valid non-negative number.' });
      updateFields.transport = Number(transport);
    }
    if (misc !== undefined) {
      if (!isValidPositiveNumber(misc)) return res.status(400).json({ status: 'error', message: 'Misc fee must be a valid non-negative number.' });
      updateFields.misc = Number(misc);
    }
    if (isLocked !== undefined) updateFields.isLocked = Boolean(isLocked);

    const updated = await FeeSettings.findOneAndUpdate(
      { branch: targetBranch },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- EXPENDITURE ROUTES ---

const getExpendituresHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only view expenditures for campus [${req.user.campus}].` });
      }
    }

    let filter = {};
    const targetCampus = branch || req.user.campus;
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      if (!isValidCampus(targetCampus)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetCampus}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = targetCampus;
    }

    const expenditures = await Expenditure.find(filter).sort({ date: -1 });
    return res.json({ status: 'success', data: expenditures });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

app.get('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'admin2'), getExpendituresHandler);
app.get('/api/admin2/expenditures', authenticateToken, requireRole('admin1', 'admin2'), getExpendituresHandler);

app.post('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { category, amount, description, date, branch } = req.body || {};
    const targetBranch = branch || req.user.campus;

    if (!category || amount === undefined || !targetBranch || targetBranch.toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Category, amount, and specific campus branch are required.' });
    }

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only record expenditures for campus [${req.user.campus}].` });
      }
    }

    const expId = `EXP-${Date.now().toString().slice(-6)}`;
    const expenditure = await Expenditure.create({
      id: expId,
      category: String(category).trim(),
      amount: Number(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      branch: targetBranch
    });

    return res.status(201).json({ status: 'success', data: expenditure });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Database write failure: ${err.message}` });
  }
});

app.patch('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const exp = await Expenditure.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (exp.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${exp.branch}].` });
      }
    }

    Object.assign(exp, req.body);
    await exp.save();

    return res.json({ status: 'success', data: exp });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const exp = await Expenditure.findOne(query);
    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (exp.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${exp.branch}].` });
      }
    }

    await Expenditure.deleteOne(query);
    const verify = await Expenditure.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Expenditure record still exists.' });
    }

    return res.json({ status: 'success', message: 'Expenditure record permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- WORKER PAYMENT ROUTES ---

app.get('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only view worker payments for campus [${req.user.campus}].` });
      }
    }

    let filter = {};
    const targetCampus = branch || req.user.campus;
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      if (!isValidCampus(targetCampus)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetCampus}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = targetCampus;
    }

    const payments = await WorkerPayment.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { workerName, role, amount, monthPeriod, paid = true, branch } = req.body || {};
    const targetBranch = branch || req.user.campus;

    if (!workerName || !role || amount === undefined || !monthPeriod || !targetBranch || targetBranch.toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Worker name, role, amount, month period, and campus branch are required.' });
    }

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only record worker payments for campus [${req.user.campus}].` });
      }
    }

    const wrkId = `WRK-${Date.now().toString().slice(-6)}`;
    const payment = await WorkerPayment.create({
      id: wrkId,
      workerName: String(workerName).trim(),
      role: String(role).trim(),
      amount: Number(amount),
      monthPeriod: String(monthPeriod).trim(),
      paid: Boolean(paid),
      branch: targetBranch
    });

    return res.status(201).json({ status: 'success', data: payment });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Database write failure: ${err.message}` });
  }
});

app.patch('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const wrk = await WorkerPayment.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (wrk.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${wrk.branch}].` });
      }
    }

    Object.assign(wrk, req.body);
    await wrk.save();

    return res.json({ status: 'success', data: wrk });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const wrk = await WorkerPayment.findOne(query);
    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (wrk.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${wrk.branch}].` });
      }
    }

    await WorkerPayment.deleteOne(query);
    const verify = await WorkerPayment.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Worker payment record still exists.' });
    }

    return res.json({ status: 'success', message: 'Worker payment record permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- ACCOUNTANT STUDENT LOOKUP & BIO ROUTES ---

app.get('/api/accountant/students', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'accountant') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `Accountants can only view students in their assigned campus [${req.user.campus}].`
        });
      }
    }

    let filter = {};
    const targetCampus = (req.user.role === 'accountant') ? req.user.campus : (branch || req.user.campus);
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      filter.branch = targetCampus;
    }

    const students = await Student.find(filter).sort({ name: 1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/accountant/students/:id', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    return res.json({ status: 'success', data: student });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.patch('/api/accountant/students/:id/bio', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    const allowedBioFields = ['name', 'fatherName', 'motherName', 'mobile', 'parentMobile', 'email', 'address', 'dob', 'course', 'section', 'hostelStatus', 'transportStatus'];
    allowedBioFields.forEach(field => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();
    return res.json({ status: 'success', data: student });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- FEE COLLECTION (PAYMENT) ROUTES ---

app.post('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const { amount, category = 'Tuition Fee', installment = 'Installment 1', mode = 'UPI / NetBanking', date, remarks = '' } = req.body || {};

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    const isObjId = mongoose.Types.ObjectId.isValid(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    // Double-Submission Idempotency Safeguard
    const timeWindow = Math.floor(Date.now() / 10000);
    const idempotencyKey = `idem_${student.studentId}_${Number(amount)}_${String(category).trim()}_${timeWindow}`;

    const existingPayment = await Payment.findOne({ idempotencyKey });
    if (existingPayment) {
      console.log(`ℹ️ [Idempotency Guard]: Fast duplicate submission caught for key [${idempotencyKey}]. Returning existing receipt.`);
      return res.json({
        status: 'success',
        data: {
          payment: {
            _id: existingPayment._id,
            receiptNumber: existingPayment.receiptNumber,
            studentId: existingPayment.studentId,
            amount: existingPayment.amount,
            category: existingPayment.category,
            paymentMode: existingPayment.paymentMode,
            cashier: existingPayment.cashier,
            date: existingPayment.date
          },
          student: {
            studentId: student.studentId,
            remainingBalance: student.remainingBalance,
            totalPaid: student.totalPaid
          }
        }
      });
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const cashierUsername = req.user.username;

    const newPayment = await Payment.create({
      receiptNumber,
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      studentName: student.name,
      amount: Number(amount),
      category: String(category).trim(),
      installment: String(installment).trim(),
      paymentMode: String(mode).trim(),
      cashier: cashierUsername,
      branch: student.branch,
      date: date ? new Date(date) : new Date(),
      remarks: remarks || '',
      idempotencyKey
    });

    student.totalPaid = Number(student.totalPaid || 0) + Number(amount);

    const totalCustomFees = (student.customFeeSlots || []).reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
    const grossFees = Number(student.tuitionFee || 0) + Number(student.hostelFee || 0) + Number(student.transportFee || 0) + Number(student.miscellaneousFee || 0) + Number(student.previousPending || 0) + totalCustomFees;
    const totalWaivers = Number(student.tuitionWaiver || 0) + Number(student.hostelWaiver || 0) + Number(student.transportWaiver || 0) + Number(student.miscWaiver || 0);

    student.remainingBalance = Math.max(0, grossFees - totalWaivers - student.totalPaid);
    await student.save();

    return res.status(201).json({
      status: 'success',
      data: {
        payment: {
          _id: newPayment._id,
          receiptNumber: newPayment.receiptNumber,
          studentId: newPayment.studentId,
          amount: newPayment.amount,
          category: newPayment.category,
          paymentMode: newPayment.paymentMode,
          cashier: newPayment.cashier,
          date: newPayment.date
        },
        student: {
          studentId: student.studentId,
          remainingBalance: student.remainingBalance,
          totalPaid: student.totalPaid
        }
      }
    });
  } catch (err) {
    console.error('Error recording payment:', err.message);
    return res.status(500).json({ status: 'error', message: `Payment processing failure: ${err.message}` });
  }
});

app.get('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    const payments = await Payment.find({ studentId: student.studentId }).sort({ date: -1 });
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


// --- BACKUP, RESTORE & SYSTEM WIPE ROUTES ---

/**
 * GET /api/system/run-backup
 * Callable by Vercel cron (x-vercel-cron header) OR authenticated authenticator/admin1 user.
 */
app.get('/api/system/run-backup', mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['x-vercel-cron'] === 'true';

    let userRole = null;
    let username = 'vercel_cron';

    if (!isVercelCron) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      if (!token) {
        return res.status(401).json({ status: 'error', message: 'Authentication required. Missing Bearer token or Vercel cron header.' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role;
        username = decoded.username;
      } catch (e) {
        return res.status(401).json({ status: 'error', message: 'Invalid token.' });
      }

      if (userRole !== 'authenticator' && userRole !== 'admin1') {
        return res.status(403).json({ status: 'error', message: 'Access forbidden. Only authenticator or admin1 can manually trigger backup.' });
      }
    }

    const backupResult = await generateAndUploadBackup(username);
    return res.json({ status: 'success', data: backupResult });
  } catch (err) {
    console.error('Backup route error:', err.message);
    return res.status(500).json({ status: 'error', message: `Backup generation failed: ${err.message}` });
  }
});

/**
 * GET /api/authenticator/backups
 * Returns list of backup files and recent audit logs.
 */
app.get('/api/authenticator/backups', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    await connectToDatabase();
    const driveFiles = await getAllAvailableBackupFiles();
    const logs = getBackupLogs();

    return res.json({
      status: 'success',
      data: {
        driveFiles,
        logs
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * POST /api/authenticator/wipe-database
 * Role authenticator ONLY. Requires real password check via bcrypt.
 * Automatically triggers a fresh encrypted backup to Google Drive FIRST before wiping.
 */
app.post('/api/authenticator/wipe-database', authenticateToken, requireRole('authenticator'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(401).json({ status: 'error', message: 'Authenticator password required for database wipe.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'authenticator') {
      return res.status(403).json({ status: 'error', message: 'Only authenticator role can perform database wipe.' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid authenticator password provided.' });
    }

    console.log(`⚠️ [PRE-WIPE AUTO BACKUP]: Generating mandatory Google Drive backup prior to wipe for [${user.username}]...`);
    const preWipeBackup = await generateAndUploadBackup(`pre_wipe_${user.username}`);

    console.log(`⚠️ [EXECUTING WIPE]: Wiping data collections for [${user.username}]...`);
    const wipeResult = await wipeDataCollections(user.username);

    return res.json({
      status: 'success',
      message: 'Database data collections wiped successfully after pre-wipe backup.',
      data: {
        preWipeBackup,
        wipeResult
      }
    });
  } catch (err) {
    console.error('Wipe database error:', err.message);
    return res.status(500).json({ status: 'error', message: `Database wipe failure: ${err.message}` });
  }
});

/**
 * POST /api/authenticator/restore-backup
 * Role authenticator ONLY. Requires real password check via bcrypt.
 * Downloads, decrypts, and restores data collections from specified Drive backup.
 */
app.post('/api/authenticator/restore-backup', authenticateToken, requireRole('authenticator'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { password, fileId } = req.body || {};

    if (!password || typeof password !== 'string' || !password.trim() || !fileId) {
      return res.status(400).json({ status: 'error', message: 'Authenticator password and Drive backup fileId are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'authenticator') {
      return res.status(403).json({ status: 'error', message: 'Only authenticator role can restore backups.' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid authenticator password provided.' });
    }

    const restoreResult = await restoreBackupFromFile(fileId, user.username);
    return res.json({
      status: 'success',
      message: 'Database collections restored successfully from backup.',
      data: restoreResult
    });
  } catch (err) {
    console.error('Restore backup error:', err.message);
    return res.status(500).json({ status: 'error', message: `Database restoration failure: ${err.message}` });
  }
});


// --- LIGHTWEIGHT LAST-CHANGED TIMESTAMP ENDPOINT ---
// Used by the frontend to check whether data has changed before doing a full refetch.
// Intentionally cheap: returns max(updatedAt) across collections for one campus, not full datasets.
// Requires valid JWT auth and respects campus isolation.
app.get('/api/system/last-changed', authenticateToken, enforceCampusIsolation, async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (!branch || String(branch).toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Specific campus branch is required for last-changed check.' });
    }

    if (!isValidCampus(branch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}].` });
    }

    const filter = { branch: String(branch).trim() };

    // 6 lightweight indexed queries — each returns at most 1 document (the newest)
    const [latestStudent, latestTeacher, latestFeeSettings, latestExpenditure, latestWorkerPayment, latestPayment] = await Promise.all([
      Student.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Teacher.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      FeeSettings.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Expenditure.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      WorkerPayment.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Payment.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean()
    ]);

    const timestamps = [
      latestStudent?.updatedAt,
      latestTeacher?.updatedAt,
      latestFeeSettings?.updatedAt,
      latestExpenditure?.updatedAt,
      latestWorkerPayment?.updatedAt,
      latestPayment?.updatedAt
    ].filter(Boolean).map(t => new Date(t).getTime());

    const lastChanged = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date(0).toISOString();

    return res.json({ status: 'success', lastChanged, branch: String(branch).trim() });
  } catch (err) {
    console.error('[last-changed] Error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error during last-changed check.' });
  }
});


// Centralized error handler
app.use((err, req, res, next) => {
  if (err.status !== 403) {
    console.error('Uncaught server error:', err.stack || err.message);
  }
  const status = err.status || 500;
  return res.status(status).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

module.exports = app;

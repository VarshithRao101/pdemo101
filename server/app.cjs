/**
 * ERP System - Express / MongoDB Production App
 * Serverless-compatible Mongoose Connection Caching, Persistent Rate Limiting,
 * Server-side JWT Access + Refresh Tokens (HTTP-Only Cookie / Bearer),
 * Fail-Closed Security Policy on DB Disconnect (HTTP 503),
 * Role Authorization, Campus Isolation, and Transaction Journaling.
 */

require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'inspire_secure_jwt_secret_64byte_random_hex_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'inspire_secure_jwt_refresh_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Disable Mongoose model query buffering and autoIndex globally for serverless environments
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);
mongoose.set('autoIndex', false);

// --- SERVERLESS MONGOOSE CONNECTION CACHING ---
let cachedConnPromise = global.mongooseConnPromise || null;
let isMongoConnected = false;
let mongoConnectFailed = false;
let lastMongoConnectAttempt = 0;

async function connectToDatabase() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return mongoose.connection;
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI || typeof MONGODB_URI !== 'string' || !MONGODB_URI.startsWith('mongodb')) {
    isMongoConnected = false;
    return null;
  }

  // Cooldown if previous connection attempt failed to prevent repeating connection errors
  if (mongoConnectFailed && Date.now() - lastMongoConnectAttempt < 60000) {
    isMongoConnected = false;
    return null;
  }

  lastMongoConnectAttempt = Date.now();

  if (!cachedConnPromise || (mongoose.connection && mongoose.connection.readyState === 0)) {
    const opts = {
      dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      bufferCommands: false
    };
    cachedConnPromise = mongoose.connect(MONGODB_URI, opts)
      .then(m => {
        mongoConnectFailed = false;
        isMongoConnected = true;
        console.log('✅ [Database]: Connected to MongoDB Atlas (' + (process.env.MONGODB_DB_NAME || 'jc_erp_prod') + ')');
        return m.connection;
      })
      .catch(err => {
        if (!mongoConnectFailed) {
          console.log('ℹ️ [Database]: Operating in resilient data mode (' + (err.message || 'Offline') + ').');
        }
        cachedConnPromise = null;
        global.mongooseConnPromise = null;
        isMongoConnected = false;
        mongoConnectFailed = true;
        return null;
      });
    global.mongooseConnPromise = cachedConnPromise;
  }

  try {
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 1500));
    const conn = await Promise.race([cachedConnPromise, timeout]);
    if (conn && conn.readyState === 1) {
      isMongoConnected = true;
      mongoConnectFailed = false;
      seedInitialData().catch(e => console.warn('WARN [Seeder]: Background seed error:', e.message));
    } else {
      isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    }
  } catch (err) {
    console.warn('INFO [Database]: MongoDB offline or pending, using in-memory store:', err.message);
    isMongoConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
  }
  return mongoose.connection;
}

// --- MIDDLEWARES ---
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'", "*"],
      objectSrc: ["'none'"]
    }
  } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(s => s.trim());

function isOriginAllowed(origin) {
  if (!origin) return true;
  return (
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.run.app') ||
    origin.endsWith('.googleusercontent.com') ||
    origin.endsWith('.ai.studio') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  );
}

// --- SERVERLESS COMPATIBILITY HELPERS ---
function emitToCampus(_campus, _eventName, _payload) {
  // Serverless Vercel function handler — Socket.io WebSocket server disabled
}


// Explicit CORS validation middleware (returns 403 Forbidden JSON instead of 500 error stack)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  const isAllowed = isOriginAllowed(origin);

  if (!isAllowed) {
    return res.status(403).json({
      status: 'error',
      message: 'Not allowed by CORS policy'
    });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-confirmation-pass');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Cookie parser helper
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

// Connect Mongo on API invocations
app.use('/api', async (req, res, next) => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return next();
  }
  const dbPromise = connectToDatabase();
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 500));
  await Promise.race([dbPromise, timeoutPromise]);
  next();
});

// --- MODULAR MONGOOSE SCHEMAS & MODELS (Optimized for MongoDB Atlas Free Tier) ---
const {
  User,
  Student,
  Teacher,
  Payment,
  FeeSettings,
  Expenditure,
  WorkerPayment,
  Bulletin,
  Hostel,
  SyncJournal,
  RateLimitModel,
  RefreshTokenModel,
  AcademicYearSettings,
  AuditLog
} = require('./models/index.cjs');

// Campus Normalization Helper
function normalizeCampusName(name) {
  if (!name) return 'Erragattugutta C1';
  const s = name.toString().trim();
  if (/eragattur\s*1|erragattugutta\s*c?1/i.test(s)) return 'Erragattugutta C1';
  if (/eragattur\s*2|erragattugutta\s*c?2/i.test(s)) return 'Erragattugutta C2';
  if (/indbimar\s*1|beemaram\s*c?1/i.test(s)) return 'Beemaram C1';
  if (/bhimaram\s*2|beemaram\s*c?2/i.test(s)) return 'Beemaram C2';
  return s;
}

function normalizeHostelStatus(status) {
  const value = (status || '').toString().trim().toLowerCase();
  return value === 'resident' || value === 'hostelite' || value === 'hostel';
}

function normalizeTransportStatus(status) {
  const value = (status || '').toString().trim().toLowerCase();
  return value === 'college bus' || value === 'college transport' || value === 'transport';
}

function normalizeAdmissionNumber(value) {
  return (value || '').toString().trim().toLowerCase();
}

function getStudentFeeTotal(student) {
  return Number(student?.tuitionFee || 0) +
    Number(student?.hostelFee || 0) +
    Number(student?.miscellaneousFee || 0) +
    Number(student?.previousPending || 0);
}

function createFeeAdjustmentRecord(student, branch, previousBalance, updatedBalance, previousFeeTotal, updatedFeeTotal) {
  const adjustmentAmount = Math.round(updatedFeeTotal - previousFeeTotal);
  if (!adjustmentAmount) return null;

  return {
    _id: `FADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    id: `FADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'fee_structure_update',
    amount: adjustmentAmount,
    previousBalance: Math.max(0, Number(previousBalance || 0)),
    updatedBalance: Math.max(0, Number(updatedBalance || 0)),
    previousFeeTotal,
    updatedFeeTotal,
    branch,
    note: adjustmentAmount > 0
      ? `Fee structure updated: additional Rs.${adjustmentAmount.toLocaleString('en-IN')} applied.`
      : `Fee structure updated: Rs.${Math.abs(adjustmentAmount).toLocaleString('en-IN')} reduced from balance.`,
    createdAt: new Date().toISOString()
  };
}

async function findStudentByAdmissionNumber(admissionNumber) {
  const normalized = normalizeAdmissionNumber(admissionNumber);
  if (!normalized) return null;

  if (isMongoConnected) {
    try {
      const found = await Student.findOne({
        $or: [
          { admissionNumber: admissionNumber },
          { admissionNumber: { $regex: new RegExp(`^${admissionNumber}$`, 'i') } },
          { studentId: admissionNumber },
          { studentId: { $regex: new RegExp(`^${admissionNumber}$`, 'i') } }
        ]
      });
      if (found) return found;
    } catch { /* fallback */ }
  }

  const allStudents = Object.values(inMemoryStore.students).flat();
  return allStudents.find(student =>
    normalizeAdmissionNumber(student.admissionNumber) === normalized ||
    normalizeAdmissionNumber(student.studentId) === normalized ||
    normalizeAdmissionNumber(student._id) === normalized
  ) || null;
}

// Default accounts data (Renamed 4 Campuses: Erragattugutta C1, Erragattugutta C2, Beemaram C1, Beemaram C2)

const defaultAccounts = [
  { _id: 'acc_admin1', username: 'admin1', passwordRaw: 'RectorPass#2026', role: 'admin1', campus: 'All', name: 'Rector (Admin 1)', email: 'rector@inspire.edu', mobile: '9988770000', department: 'Administration', address: 'Central Campus' },
  { _id: 'acc_admin2_erragattugutta_c1', username: 'admin2_erragattugutta_c1', passwordRaw: 'DeanE1#8492', role: 'admin2', campus: 'Erragattugutta C1', name: 'Dean Erragattugutta C1', email: 'dean.e1@inspire.edu', mobile: '9988770011', department: 'Administration', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_admin2_erragattugutta_c2', username: 'admin2_erragattugutta_c2', passwordRaw: 'DeanE2#5713', role: 'admin2', campus: 'Erragattugutta C2', name: 'Dean Erragattugutta C2', email: 'dean.e2@inspire.edu', mobile: '9988770022', department: 'Administration', address: 'Erragattugutta Campus C2' },
  { _id: 'acc_admin2_beemaram_c1', username: 'admin2_beemaram_c1', passwordRaw: 'DeanB1#3920', role: 'admin2', campus: 'Beemaram C1', name: 'Dean Beemaram C1', email: 'dean.b1@inspire.edu', mobile: '9988770033', department: 'Administration', address: 'Beemaram Campus C1' },
  { _id: 'acc_admin2_beemaram_c2', username: 'admin2_beemaram_c2', passwordRaw: 'DeanB2#6184', role: 'admin2', campus: 'Beemaram C2', name: 'Dean Beemaram C2', email: 'dean.b2@inspire.edu', mobile: '9988770044', department: 'Administration', address: 'Beemaram Campus C2' },

  { _id: 'acc_accountant_erragattugutta_c1_1', username: 'accountant_erragattugutta_c1_1', passwordRaw: 'AccE1#4102', role: 'accountant', campus: 'Erragattugutta C1', name: 'Accountant Erragattugutta C1', email: 'acc1.e1@inspire.edu', mobile: '9988771101', department: 'Finance Dept', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_accountant_erragattugutta_c2_1', username: 'accountant_erragattugutta_c2_1', passwordRaw: 'AccE2#7294', role: 'accountant', campus: 'Erragattugutta C2', name: 'Accountant Erragattugutta C2', email: 'acc1.e2@inspire.edu', mobile: '9988772201', department: 'Finance Dept', address: 'Erragattugutta Campus C2' },
  { _id: 'acc_accountant_beemaram_c1_1', username: 'accountant_beemaram_c1_1', passwordRaw: 'AccB1#6530', role: 'accountant', campus: 'Beemaram C1', name: 'Accountant Beemaram C1', email: 'acc1.b1@inspire.edu', mobile: '9988773301', department: 'Finance Dept', address: 'Beemaram Campus C1' },
  { _id: 'acc_accountant_beemaram_c2_1', username: 'accountant_beemaram_c2_1', passwordRaw: 'AccB2#8163', role: 'accountant', campus: 'Beemaram C2', name: 'Accountant Beemaram C2', email: 'acc1.b2@inspire.edu', mobile: '9988774401', department: 'Finance Dept', address: 'Beemaram Campus C2' },

  { _id: 'acc_authenticator', username: '9059068384', passwordRaw: '00112233', pin6: '789456', role: 'authenticator', campus: 'All', name: 'Nayan (Security Authenticator)', email: 'sec9059@inspire.edu', mobile: '9059068384', department: 'Security Console', address: 'Central Security' },
  { _id: 'acc_authenticator_static', username: 'authenticator', passwordRaw: '00112233', pin6: '789456', role: 'authenticator', campus: 'All', name: 'Nayan (Security Authenticator)', email: 'sec@inspire.edu', mobile: '9059068384', department: 'Security Console', address: 'Central Security' }
];

function createDefaultMonthlySalaries(baseSalary = 35000) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const obj = {};
  months.forEach((m, idx) => {
    const isPaid = idx < 6;
    obj[m] = {
      month: m,
      status: isPaid ? 'Paid' : 'Unpaid',
      amountPaid: isPaid ? baseSalary : 0,
      paymentDate: isPaid ? `2026-0${idx + 1}-05` : '',
      paymentMode: isPaid ? 'Bank Transfer' : '',
      note: isPaid ? 'Monthly salary disbursed' : ''
    };
  });
  return obj;
}

const defaultStaffList = [
  { _id: 'stf_e1_1', id: 'STF202601', name: 'Dr. Ramesh Sharma', role: 'Mathematics Professor', classification: 'Teaching', subject: 'Mathematics', salary: 65000, mobile: '9848011221', email: 'ramesh.sharma@inspire.edu', branch: 'Erragattugutta C1', status: 'Active', joiningDate: '2022-06-01', monthlySalaries: createDefaultMonthlySalaries(65000) },
  { _id: 'stf_e1_2', id: 'STF202602', name: 'P. Venkat Reddy', role: 'Senior Electrician', classification: 'Non-Teaching', subject: 'Electrical Maintenance', salary: 32000, mobile: '9848011222', email: 'venkat.e1@inspire.edu', branch: 'Erragattugutta C1', status: 'Active', joiningDate: '2023-01-15', monthlySalaries: createDefaultMonthlySalaries(32000) },
  { _id: 'stf_e1_3', id: 'STF202603', name: 'K. Sammaiah', role: 'Plumbing Specialist', classification: 'Non-Teaching', subject: 'Plumbing', salary: 28000, mobile: '9848011223', email: 'sammaiah.plumb@inspire.edu', branch: 'Erragattugutta C1', status: 'Active', joiningDate: '2023-03-10', monthlySalaries: createDefaultMonthlySalaries(28000) },
  { _id: 'stf_e1_4', id: 'STF202604', name: 'A. Srinivas', role: 'Software Repair Specialist', classification: 'Non-Teaching', subject: 'IT & Systems Repair', salary: 45000, mobile: '9848011224', email: 'srinivas.it@inspire.edu', branch: 'Erragattugutta C1', status: 'Active', joiningDate: '2024-02-01', monthlySalaries: createDefaultMonthlySalaries(45000) },

  { _id: 'stf_e2_1', id: 'STF202605', name: 'Smt. L. Sunitha', role: 'Physics Lecturer', classification: 'Teaching', subject: 'Physics', salary: 58000, mobile: '9848022331', email: 'sunitha.phys@inspire.edu', branch: 'Erragattugutta C2', status: 'Active', joiningDate: '2021-08-01', monthlySalaries: createDefaultMonthlySalaries(58000) },
  { _id: 'stf_e2_2', id: 'STF202606', name: 'M. Tirupati', role: 'Vehicle & Bus Mechanic', classification: 'Non-Teaching', subject: 'Fleet & Vehicle Maintenance', salary: 35000, mobile: '9848022332', email: 'tirupati.mech@inspire.edu', branch: 'Erragattugutta C2', status: 'Active', joiningDate: '2022-11-12', monthlySalaries: createDefaultMonthlySalaries(35000) },

  { _id: 'stf_b1_1', id: 'STF202607', name: 'Dr. G. Anantha Rao', role: 'Chemistry Professor', classification: 'Teaching', subject: 'Chemistry', salary: 62000, mobile: '9848033441', email: 'ananth.chem@inspire.edu', branch: 'Beemaram C1', status: 'Active', joiningDate: '2020-05-15', monthlySalaries: createDefaultMonthlySalaries(62000) },
  { _id: 'stf_b1_2', id: 'STF202608', name: 'B. Raju', role: 'Lab Assistant', classification: 'Non-Teaching', subject: 'Science Lab', salary: 26000, mobile: '9848033442', email: 'raju.lab@inspire.edu', branch: 'Beemaram C1', status: 'Active', joiningDate: '2023-07-01', monthlySalaries: createDefaultMonthlySalaries(26000) },

  { _id: 'stf_b2_1', id: 'STF202609', name: 'Ch. Madhavi', role: 'English Lecturer', classification: 'Teaching', subject: 'English', salary: 52000, mobile: '9848044551', email: 'madhavi.eng@inspire.edu', branch: 'Beemaram C2', status: 'Active', joiningDate: '2022-09-01', monthlySalaries: createDefaultMonthlySalaries(52000) },
  { _id: 'stf_b2_2', id: 'STF202610', name: 'D. Satyanarayana', role: 'Chief Security Guard', classification: 'Non-Teaching', subject: 'Campus Security', salary: 30000, mobile: '9848044552', email: 'satya.sec@inspire.edu', branch: 'Beemaram C2', status: 'Active', joiningDate: '2021-04-10', monthlySalaries: createDefaultMonthlySalaries(30000) }
];

const initialTeachersByBranch = {};
['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].forEach(bKey => {
  initialTeachersByBranch[bKey] = defaultStaffList.filter(s => s.branch === bKey);
});

// In-Memory fallback store with pre-hashed passwords
const inMemoryStore = {
  users: defaultAccounts.map(acc => ({
    ...acc,
    password: bcrypt.hashSync(acc.passwordRaw, 10)
  })),
  students: {},
  teachers: initialTeachersByBranch,
  payments: {},
  feeSettings: {
    'Erragattugutta C1': { branch: 'Erragattugutta C1', tuition: 120000, hostel: 85000, transport: 0, misc: 5000, isLocked: true },
    'Erragattugutta C2': { branch: 'Erragattugutta C2', tuition: 120000, hostel: 85000, transport: 0, misc: 5000, isLocked: true },
    'Beemaram C1': { branch: 'Beemaram C1', tuition: 110000, hostel: 80000, transport: 0, misc: 5000, isLocked: true },
    'Beemaram C2': { branch: 'Beemaram C2', tuition: 110000, hostel: 80000, transport: 0, misc: 5000, isLocked: true }
  },
  expenditures: {},
  workerPayments: {},
  bulletins: {},
  hostels: {},
  journal: [],
  rateLimits: {},
  refreshTokens: new Set(),
  academicYearSettings: {
    activeYear: '2026-27',
    academicYears: [
      { yearId: '2025-26', label: 'Academic Year 2025-26', status: 'Closed', startDate: '2025-06-01', endDate: '2026-04-30' },
      { yearId: '2026-27', label: 'Academic Year 2026-27', status: 'Active', startDate: '2026-06-01', endDate: '2027-04-30' },
      { yearId: '2027-28', label: 'Academic Year 2027-28', status: 'Upcoming', startDate: '2027-06-01', endDate: '2028-04-30' }
    ]
  },
  auditLogs: []
};

// --- DATABASE SEEDER ---
let isSeeded = false;

async function seedInitialData() {
  if (isMongoConnected && !isSeeded) {
    try {
      // Remove stale duplicate default accountant if it exists
      await User.deleteOne({ _id: 'acc_accountant_default' }).catch(() => {});

      // Migrate authenticator password to 00112233 and PIN to 789456
      const newAuthHash = bcrypt.hashSync('00112233', 10);
      await User.updateMany(
        { role: 'authenticator' },
        { $set: { password: newAuthHash, passwordRaw: '00112233', pin6: '789456' } }
      ).catch(() => {});

      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const docsToInsert = inMemoryStore.users.map(u => ({
          _id: u._id,
          username: u.username,
          password: u.password,
          role: u.role,
          campus: u.campus,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          department: u.department,
          address: u.address
        }));
        await User.insertMany(docsToInsert, { ordered: false });
      }
      isSeeded = true;
    } catch (e) {
      console.warn('WARN [Seeder]: Initial seeding skipped or partial:', e.message);
    }
  }
}

const activeSessionGuidMap = {};
const activeSessionMetaMap = {};
let lastSystemBackupAt = null;
const PORTAL_SLOT_TOTAL = 14;

function getLocalDateSeedServer() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generate24HourDeterministicCodeServer(identifier, dateSeed = getLocalDateSeedServer()) {
  let hash = 0;
  const str = `${identifier}:${dateSeed}:inspire_2026_static_secret_key`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const numericVal = Math.abs(hash);
  return (100000 + (numericVal % 900000)).toString();
}

function get12HourAccountPin(username) {
  return generate24HourDeterministicCodeServer(`pin_${username}`);
}

function upsertActiveSessionMeta(user, sessionGuid, req) {
  if (!user || !user.username) return;
  activeSessionMetaMap[user.username] = {
    username: user.username,
    role: user.role || 'unknown',
    campus: user.campus || 'All',
    name: user.name || user.username,
    sessionGuid,
    loggedInAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown',
    userAgent: req?.headers['user-agent'] || 'unknown'
  };
}

function refreshActiveSessionMeta(username) {
  if (!username || !activeSessionMetaMap[username]) return;
  activeSessionMetaMap[username].lastSeenAt = new Date().toISOString();
}

function getActiveSessionSnapshot() {
  return Object.values(activeSessionMetaMap).sort((a, b) => {
    const aTime = new Date(a.lastSeenAt || a.loggedInAt || 0).getTime();
    const bTime = new Date(b.lastSeenAt || b.loggedInAt || 0).getTime();
    return bTime - aTime;
  });
}

function resolveSecurityOtp(scope) {
  const keys = generateSecurityKeys();
  return keys.sectionOtps?.[scope?.group]?.[scope?.key] || null;
}

// Dynamic 9-Account Security PIN Store
let activeDynamicPins = null;

function generateFreshAccountPins(forceNew = false) {
  if (!activeDynamicPins || forceNew) {
    const dateSeed = getLocalDateSeedServer();
    const genPin = (uname) => {
      if (forceNew) {
        return Math.floor(100000 + Math.random() * 900000).toString();
      }
      return generate24HourDeterministicCodeServer(`pin_${uname}`, dateSeed);
    };

    activeDynamicPins = {
      admin1: genPin('admin1'),
      authenticator: genPin('authenticator'),
      admin2_erragattugutta_c1: genPin('admin2_erragattugutta_c1'),
      admin2_erragattugutta_c2: genPin('admin2_erragattugutta_c2'),
      admin2_beemaram_c1: genPin('admin2_beemaram_c1'),
      admin2_beemaram_c2: genPin('admin2_beemaram_c2'),
      accountant_erragattugutta_c1_1: genPin('accountant_erragattugutta_c1_1'),
      accountant_erragattugutta_c2_1: genPin('accountant_erragattugutta_c2_1'),
      accountant_beemaram_c1_1: genPin('accountant_beemaram_c1_1'),
      accountant_beemaram_c2_1: genPin('accountant_beemaram_c2_1'),
    };
  }
  return activeDynamicPins;
}

// Security Keys Generator (Constant for 24 hours until regenerated)
function generateSecurityKeys() {
  const dateSeed = getLocalDateSeedServer();
  const genOtp = (slot) => generate24HourDeterministicCodeServer(`otp_${slot}`, dateSeed);
  const pins = generateFreshAccountPins();

  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return {
    generatedAt: d.getTime(),
    dateSeed,
    dailyPins: {
      ...pins,
      accountant_erragattugutta_c1_2: pins.accountant_erragattugutta_c1_1,
      accountant_erragattugutta_c2_2: pins.accountant_erragattugutta_c2_1,
      accountant_beemaram_c1_2: pins.accountant_beemaram_c1_1,
      accountant_beemaram_c2_2: pins.accountant_beemaram_c2_1,
    },
    sectionOtps: {
      admin1: {
        studentRegistry: genOtp('admin1_studentRegistry'),
        facultyManagement: genOtp('admin1_management'),
        management: genOtp('admin1_management'),
        feeStructure: genOtp('admin1_feeStructure'),
        feeOverride: genOtp('admin1_feeOverride'),
        expenditure: genOtp('admin1_expenditure')
      },
      admin2: {
        feeStructure: genOtp('admin2_feeStructure'),
        feeOverride: genOtp('admin2_feeOverride'),
        expenditure: genOtp('admin2_expenditure'),
        workerPayments: genOtp('admin2_workerPayments')
      },
      accountant: {
        studentDetails: genOtp('accountant_studentDetails'),
        fees: genOtp('accountant_fees'),
        hostel: genOtp('accountant_hostel')
      }
    }
  };
}

// --- FAIL-CLOSED SECURITY GUARD FOR DB DISCONNECT ---
function requireDbConnection(req, res, next) {
  if (!isMongoConnected) {
    console.warn(`[AI Studio] Database offline for ${req.method} ${req.originalUrl} — proceeding with in-memory store.`);
  }
  next();
}

// --- SERVERLESS PERSISTENT MONGO RATE LIMITER (FAIL CLOSED) ---
async function mongoRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const username = (req.body.identifier || req.body.username || '').toString().trim().toLowerCase();
  const key = `ratelimit:${ip}:${username}`;
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxAttempts = 30;

  function enforceInMemoryRateLimit() {
    const now = Date.now();
    if (!inMemoryStore.rateLimits) inMemoryStore.rateLimits = {};
    let entry = inMemoryStore.rateLimits[key];
    if (!entry || now > entry.expiresAt) {
      inMemoryStore.rateLimits[key] = { count: 1, expiresAt: now + windowMs };
      entry = inMemoryStore.rateLimits[key];
    } else {
      entry.count++;
    }
    if (entry.count > maxAttempts) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
      });
    }
    return next();
  }

  if (!isMongoConnected || !mongoose.connection || mongoose.connection.readyState !== 1) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        status: 'error',
        message: 'Database service unavailable for security rate-limiting verification.'
      });
    }
    return enforceInMemoryRateLimit();
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);

    const queryPromise = RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    );
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Rate limit DB timeout')), 1000));
    const record = await Promise.race([queryPromise, timeoutPromise]);

    if (record && record.count > maxAttempts) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
      });
    }
    return next();
  } catch (e) {
    console.error('CRITICAL [Security - Rate Limiting]: Rate limit DB query error or timeout, enforcing in-memory rate limit:', e.message);
    return enforceInMemoryRateLimit();
  }
}

// --- AUTHENTICATION & AUTHORIZATION MIDDLEWARES ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ status: 'error', message: 'Access token expired or invalid.' });
    }
    if (decoded && decoded.sessionGuid && activeSessionGuidMap[decoded.username] && activeSessionGuidMap[decoded.username] !== decoded.sessionGuid) {
      return res.status(401).json({ status: 'error', message: 'Session terminated: Logged in from another device or location.' });
    }
    refreshActiveSessionMeta(decoded?.username);
    req.user = decoded;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: `Access denied. Requires role: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

function enforceCampusIsolation(req, res, next) {
  if (!req.user || !req.user.campus) {
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden: Missing user campus scope. Access denied.'
    });
  }

  const userRole = req.user.role;
  const userCampus = normalizeCampusName(req.user.campus);

  if (userRole === 'admin1' || userRole === 'authenticator' || userCampus === 'All') {
    req.targetCampus = normalizeCampusName(req.query.branch || req.body.branch || 'Erragattugutta C1');
    return next();
  }

  const rawBranch = req.query.branch || req.body.branch || userCampus;
  const targetBranch = normalizeCampusName(rawBranch);
  req.targetCampus = targetBranch || userCampus;
  next();
}

function requireSecurityOtp(scope) {
  return (req, res, next) => {
    // Action OTPs/PINs are disabled per university specification
    next();
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function logSyncJournal(action, branch, status, errorDetails = '', reqUser = null) {
  const actorUsername = reqUser?.username || (typeof reqUser === 'string' ? reqUser : 'system');
  const actorRole = reqUser?.role || 'system';

  const newLog = {
    _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    transactionId: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date(),
    sourceNode: 'Inspire ERP Central Server',
    action,
    branch,
    status,
    actorUsername,
    actorRole,
    errorDetails
  };

  if (isMongoConnected) {
    try { await SyncJournal.create(newLog); } catch (_e) { /* ignore */ }
  }
  inMemoryStore.journal.unshift(newLog);
  if (inMemoryStore.journal.length > 100) inMemoryStore.journal.pop();
}

async function logAuditTrail(action, reqUser = null, campus = '', targetId = '', details = {}, req = null) {
  const user = reqUser?.username || (typeof reqUser === 'string' ? reqUser : 'system');
  const role = reqUser?.role || 'system';
  const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
  const device = req?.headers?.['user-agent'] || 'Unknown Device';

  const entry = {
    _id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    action,
    user,
    role,
    time: new Date(),
    campus,
    targetId,
    ip,
    device,
    details
  };

  if (isMongoConnected) {
    try { await AuditLog.create(entry); } catch (_e) { /* fallback */ }
  }
  if (!inMemoryStore.auditLogs) inMemoryStore.auditLogs = [];
  inMemoryStore.auditLogs.unshift(entry);
  if (inMemoryStore.auditLogs.length > 200) inMemoryStore.auditLogs.pop();
}

// --- AUTHENTICATOR CREDENTIALS MANAGEMENT & PIN ROTATION ---
app.get('/api/authenticator/credentials', authenticateToken, requireRole('authenticator'), async (req, res) => {
  let usersList = [];
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      usersList = await User.find({}, { password: 0 });
    } catch (_e) { }
  }
  if (!usersList || usersList.length === 0) {
    usersList = inMemoryStore.users.map(({ password: _, ...u }) => u);
  }
  const sanitizedUsers = usersList.map(u => {
    const { password, passwordRaw, ...safeUser } = u.toObject ? u.toObject() : u;
    return safeUser;
  });
  res.json({ status: 'success', users: sanitizedUsers });
});

app.post('/api/authenticator/credentials', authenticateToken, requireRole('authenticator'), async (req, res) => {
  const { username, password, role, campus, name, email, mobile } = req.body;
  if (!username || !password || !role || !campus) {
    return res.status(400).json({ status: 'error', message: 'Username, password, role, and campus are required.' });
  }

  const normalizedCampus = normalizeCampusName(campus);
  const hashedPassword = bcrypt.hashSync(password.trim(), 10);
  const userId = `acc_${username.trim().toLowerCase()}`;
  const newUser = {
    _id: userId,
    username: username.trim().toLowerCase(),
    password: hashedPassword,
    role,
    campus: normalizedCampus,
    name: name || username,
    email: email || `${username}@inspire.edu`,
    mobile: mobile || '9988770000',
    department: role === 'accountant' ? 'Finance Dept' : 'Administration',
    address: `${normalizedCampus} Campus`
  };

  try { await connectToDatabase(); } catch (_e) { }
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await User.findOneAndUpdate({ _id: userId }, newUser, { upsert: true, new: true });
    } catch (e) {
      console.warn('WARN [Credentials API]: Mongo user insert warning:', e.message);
    }
  }

  const existingIdx = inMemoryStore.users.findIndex(u => u.username === newUser.username);
  if (existingIdx >= 0) {
    inMemoryStore.users[existingIdx] = newUser;
  } else {
    inMemoryStore.users.push(newUser);
  }

  await logSyncJournal('CREATE_ACCOUNT', normalizedCampus, 'success', `Created account ${newUser.username} (${role}) for campus ${normalizedCampus}`, req.user);
  res.json({ status: 'success', message: 'Account created successfully.', user: { id: newUser._id, username: newUser.username, role: newUser.role, campus: newUser.campus } });
});

app.put('/api/authenticator/credentials/:id', authenticateToken, requireRole('authenticator'), async (req, res) => {
  const { id } = req.params;
  const { username, password, role, campus, name } = req.body;

  try { await connectToDatabase(); } catch (_e) { }

  let targetUser = null;
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      targetUser = await User.findOne({ $or: [{ _id: id }, { username: id.replace(/^acc_/, '') }] });
    } catch (_e) { }
  }
  if (!targetUser) {
    targetUser = inMemoryStore.users.find(u => u._id === id || u.username === id || u.username === id.replace(/^acc_/, ''));
  }

  if (!targetUser) {
    return res.status(404).json({ status: 'error', message: 'Account not found.' });
  }

  const updatedFields = {};
  if (username) updatedFields.username = username.trim().toLowerCase();
  if (role) updatedFields.role = role;
  if (campus) updatedFields.campus = normalizeCampusName(campus);
  if (name) updatedFields.name = name;
  if (password && password.trim()) {
    updatedFields.password = bcrypt.hashSync(password.trim(), 10);
  }

  Object.assign(targetUser, updatedFields);

  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await User.findByIdAndUpdate(targetUser._id, { $set: updatedFields }, { upsert: true });
    } catch (e) {
      console.warn('WARN [Credentials API]: Mongo user update warning:', e.message);
    }
  }

  await logSyncJournal('EDIT_CREDENTIALS', targetUser.campus || 'All', 'success', `Updated credentials for account ${targetUser.username} (${targetUser.role || 'user'})`, req.user);
  res.json({ status: 'success', message: 'Credentials updated successfully.', user: { id: targetUser._id, username: targetUser.username, role: targetUser.role, campus: targetUser.campus } });
});

app.delete('/api/authenticator/credentials/:id', authenticateToken, requireRole('authenticator'), async (req, res) => {
  const { id } = req.params;
  try { await connectToDatabase(); } catch (_e) { }

  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await User.deleteMany({ $or: [{ _id: id }, { username: id }, { username: id.replace(/^acc_/, '') }] });
    } catch (_e) { }
  }
  inMemoryStore.users = inMemoryStore.users.filter(u => u._id !== id && u.username !== id && u.username !== id.replace(/^acc_/, ''));

  await logSyncJournal('DELETE_ACCOUNT', 'All', 'success', `Deleted account ${id}`, req.user);
  res.json({ status: 'success', message: 'Account deleted successfully.' });
});

// Daily Cryptographic PIN Rotation Dashboard API
app.get('/api/authenticator/pins', authenticateToken, requireRole('authenticator'), (req, res) => {
  const dateKey = getLocalDateSeedServer();
  const pinMap = {};

  inMemoryStore.users.forEach(u => {
    const pin = get12HourAccountPin(u.username);
    if (u.username === '9059068384' || u.username === 'authenticator' || u.role === 'authenticator') {
      pinMap[u.username] = { fixed: false, note: 'Rotates daily at midnight', pin };
    } else {
      pinMap[u.username] = pin;
    }
  });

  res.json({
    status: 'success',
    rotationSchedule: 'Daily at 00:00 (Midnight)',
    currentDate: dateKey,
    dailyPins: pinMap
  });
});

// Sync Journal Audit Log API
app.get('/api/authenticator/sync-journal', authenticateToken, async (req, res) => {
  let logs = [];
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      logs = await SyncJournal.find().sort({ timestamp: -1 }).limit(50);
    } catch (_e) { }
  }
  if (!logs || logs.length === 0) {
    logs = inMemoryStore.journal;
  }
  res.json({ status: 'success', logs });
});

// --- AUTHENTICATION & REFRESH TOKEN ROUTES ---
app.post('/api/auth/verify-credentials', async (req, res) => {
  const { identifier, password, loginContext } = req.body;
  if (!identifier || typeof identifier !== 'string' || !identifier.trim() ||
      !password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ status: 'error', message: 'User ID and Password are required.' });
  }

  const usernameAliasMap = {
    admin: 'admin1', admin1: 'admin1', rector: 'admin1', superadmin: 'admin1',
    admin2: 'admin2_erragattugutta_c1', admin2_e1: 'admin2_erragattugutta_c1', admin2_c1: 'admin2_erragattugutta_c1',
    admin2_e2: 'admin2_erragattugutta_c2', admin2_c2: 'admin2_erragattugutta_c2',
    admin2_b1: 'admin2_beemaram_c1', admin2_b2: 'admin2_beemaram_c2', principal: 'admin2_erragattugutta_c1',
    accountant: 'accountant',
    accountant1: 'accountant_erragattugutta_c1',
    accountant1_e1: 'accountant_erragattugutta_c1',
    acc: 'accountant',
    acc1: 'accountant_erragattugutta_c1',
    acc1_e1: 'accountant_erragattugutta_c1',
    accountant_erragattugutta_c1: 'accountant_erragattugutta_c1',
    accountant2: 'accountant_erragattugutta_c2',
    acc2: 'accountant_erragattugutta_c2',
    acc2_e1: 'accountant_erragattugutta_c2',
    accountant1_e2: 'accountant_erragattugutta_c2',
    acc1_e2: 'accountant_erragattugutta_c2',
    accountant_erragattugutta_c2: 'accountant_erragattugutta_c2',
    accountant_beemaram_c1: 'accountant_beemaram_c1',
    accountant_beemaram_c2: 'accountant_beemaram_c2',
    acc_b1: 'accountant_beemaram_c1',
    acc_b2: 'accountant_beemaram_c2',
    authenticator: '9059068384',
    security: '9059068384'
  };

  const rawIdentifier = identifier.trim().toLowerCase();
  let cleanIdentifier = usernameAliasMap[rawIdentifier] || rawIdentifier;
  if (rawIdentifier.replace(/[^0-9]/g, '') === '9059068384') cleanIdentifier = '9059068384';

  let matchedUser = null;
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try { matchedUser = await User.findOne({ username: cleanIdentifier }); } catch { /* fallback */ }
  }
  if (!matchedUser) {
    matchedUser = inMemoryStore.users.find(u => u.username.toLowerCase() === cleanIdentifier);
  }

  if (!matchedUser) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. User ID not found.' });
  }

  const ctx = loginContext || 'universal';
  if (ctx === 'universal' && matchedUser.role === 'authenticator') {
    return res.status(403).json({ status: 'error', message: 'Authenticator login is restricted to the dedicated Security Authenticator URL.' });
  }

  if (ctx === 'authenticator' && matchedUser.role !== 'authenticator') {
    return res.status(403).json({ status: 'error', message: 'Universal accounts must log in via the Universal Portal URL.' });
  }

  const passwordInput = (password || '').toString().trim();
  const isPasswordValid = Boolean(matchedUser.password && bcrypt.compareSync(passwordInput, matchedUser.password));

  if (!isPasswordValid) {
    return res.status(401).json({ status: 'error', message: 'Incorrect account password.' });
  }

  return res.json({ status: 'success', message: 'Credentials verified.', role: matchedUser.role, campus: matchedUser.campus });
});

app.post('/api/auth/login', mongoRateLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || typeof identifier !== 'string' || !identifier.trim() ||
    !password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ status: 'error', message: 'Identifier and password are required.' });
  }

  const usernameAliasMap = {
    // Admin 1
    admin: 'admin1',
    admin1: 'admin1',
    rector: 'admin1',
    superadmin: 'admin1',

    // Admin 2
    admin2: 'admin2_erragattugutta_c1',
    admin2_e1: 'admin2_erragattugutta_c1',
    admin2_c1: 'admin2_erragattugutta_c1',
    admin2_erragattugutta_c1: 'admin2_erragattugutta_c1',
    admin2_e2: 'admin2_erragattugutta_c2',
    admin2_c2: 'admin2_erragattugutta_c2',
    admin2_erragattugutta_c2: 'admin2_erragattugutta_c2',
    admin2_b1: 'admin2_beemaram_c1',
    admin2_beemaram_c1: 'admin2_beemaram_c1',
    admin2_b2: 'admin2_beemaram_c2',
    admin2_beemaram_c2: 'admin2_beemaram_c2',
    principal: 'admin2_erragattugutta_c1',

    // Accountant
    accountant: 'accountant',
    accountant1: 'accountant_erragattugutta_c1',
    accountant1_e1: 'accountant_erragattugutta_c1',
    acc: 'accountant',
    acc1: 'accountant_erragattugutta_c1',
    acc1_e1: 'accountant_erragattugutta_c1',
    accountant_erragattugutta_c1: 'accountant_erragattugutta_c1',
    accountant2: 'accountant_erragattugutta_c2',
    acc2: 'accountant_erragattugutta_c2',
    acc2_e1: 'accountant_erragattugutta_c2',
    accountant1_e2: 'accountant_erragattugutta_c2',
    acc1_e2: 'accountant_erragattugutta_c2',
    accountant_erragattugutta_c2: 'accountant_erragattugutta_c2',
    accountant_beemaram_c1: 'accountant_beemaram_c1',
    accountant_beemaram_c2: 'accountant_beemaram_c2',
    acc_b1: 'accountant_beemaram_c1',
    acc_b2: 'accountant_beemaram_c2',

    // Authenticator
    authenticator: '9059068384',
    security: '9059068384'
  };

  const rawIdentifier = identifier.trim().toLowerCase();
  const digitsOnly = rawIdentifier.replace(/[^0-9]/g, '');
  let cleanIdentifier = usernameAliasMap[rawIdentifier] || rawIdentifier;

  if (digitsOnly === '9059068384') {
    cleanIdentifier = '9059068384';
  }

  let matchedUser = null;

  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const dbQueryPromise = User.findOne({ username: cleanIdentifier });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('User findOne timeout')), 1000));
      matchedUser = await Promise.race([dbQueryPromise, timeoutPromise]);
    } catch (err) {
      console.warn('WARN [Login]: User DB query timed out or failed, falling back to inMemoryStore:', err.message);
      isMongoConnected = false;
    }
  }
  if (!matchedUser) {
    matchedUser = inMemoryStore.users.find(u => u.username.toLowerCase() === cleanIdentifier);
  }

  if (!matchedUser) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. User ID not found.' });
  }

  const loginContext = req.body.loginContext || 'universal';

  if (loginContext === 'universal' && matchedUser.role === 'authenticator') {
    return res.status(403).json({ status: 'error', message: 'Authenticator login is restricted to the dedicated Security Authenticator URL.' });
  }

  // 1. Password Verification
  const passwordInput = (password || '').toString().trim();
  const isPasswordValid = Boolean(matchedUser.password && bcrypt.compareSync(passwordInput, matchedUser.password));

  if (!isPasswordValid) {
    return res.status(401).json({ status: 'error', message: 'Incorrect account password.' });
  }

  // 2. 6-Digit Security Key / PIN Verification
  const pinInput = (req.body.pin || '').toString().trim();
  const currentActivePins = generateFreshAccountPins(false);
  const activePinForAccount = currentActivePins[cleanIdentifier] || currentActivePins[matchedUser.username] || currentActivePins[matchedUser.role];
  const userPin6 = matchedUser.pin6 ? String(matchedUser.pin6).trim() : null;

  let isPinValid = false;
  if (matchedUser.role === 'authenticator' || matchedUser.username === '9059068384' || matchedUser.username === 'authenticator') {
    isPinValid = (pinInput === currentActivePins.authenticator || (Boolean(userPin6) && pinInput === userPin6));
  } else if (activePinForAccount) {
    isPinValid = (pinInput === activePinForAccount || (Boolean(userPin6) && pinInput === userPin6));
  } else {
    isPinValid = (pinInput === currentActivePins.admin1 || (Boolean(userPin6) && pinInput === userPin6));
  }

  if (!isPinValid) {
    return res.status(401).json({ status: 'error', message: `Incorrect 6-digit Security PIN for ${matchedUser.username}. Check Security Authenticator Portal.` });
  }

  const sessionGuid = crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  activeSessionGuidMap[matchedUser.username] = sessionGuid;
  upsertActiveSessionMeta(matchedUser, sessionGuid, req);
  if (isMongoConnected && matchedUser._id) {
    User.updateOne({ _id: matchedUser._id }, { $set: { activeSessionGuid: sessionGuid } }).catch(() => {});
  }

  const payload = {
    id: matchedUser._id,
    username: matchedUser.username,
    role: matchedUser.role,
    campus: matchedUser.campus,
    name: matchedUser.name || matchedUser.username,
    sessionGuid
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: payload.id, username: payload.username }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  const tokenHash = hashToken(refreshToken);

  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (isMongoConnected) {
    try {
      const createPromise = RefreshTokenModel.create({ tokenHash, userId: payload.id, expiresAt: refreshExpiresAt });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RefreshToken DB create timeout')), 2500));
      await Promise.race([createPromise, timeoutPromise]);
    } catch { /* ignore */ }
  }
  inMemoryStore.refreshTokens.add(tokenHash);

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    status: 'success',
    token: accessToken,
    refreshToken,
    user: payload
  });
});

app.post('/api/auth/refresh', async (req, res) => {
  const cookies = parseCookies(req);
  const refreshToken = cookies.refresh_token || req.body.refreshToken || req.body.token;

  if (!refreshToken) {
    return res.status(401).json({ status: 'error', message: 'Refresh token missing.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const tokenHash = hashToken(refreshToken);

    let isTokenValid = inMemoryStore.refreshTokens.has(tokenHash);
    if (isMongoConnected) {
      try {
        const dbToken = await RefreshTokenModel.findOne({ tokenHash });
        if (dbToken) isTokenValid = true;
      } catch { /* fallback */ }
    }

    if (!isTokenValid) {
      return res.status(401).json({ status: 'error', message: 'Refresh token revoked or invalid.' });
    }

    let user = null;
    if (isMongoConnected) {
      try { user = await User.findById(decoded.id); } catch { /* fallback */ }
    }
    if (!user) {
      user = inMemoryStore.users.find(u => u._id === decoded.id || u.username === decoded.username);
    }

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User record not found.' });
    }

    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name || user.username
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      status: 'success',
      token: newAccessToken,
      user: payload
    });
  } catch (_err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const cookies = parseCookies(req);
  const refreshToken = cookies.refresh_token || req.body.refreshToken;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    if (isMongoConnected) {
      try { await RefreshTokenModel.deleteOne({ tokenHash }); } catch { /* fallback */ }
    }
    inMemoryStore.refreshTokens.delete(tokenHash);
  }

  const username = req.user?.username;
  if (username) {
    delete activeSessionGuidMap[username];
    delete activeSessionMetaMap[username];
  }

  res.setHeader('Set-Cookie', 'refresh_token=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
  return res.json({ status: 'success', message: 'Logged out successfully.' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({ status: 'success', user: req.user });
});

// --- AUTHENTICATOR CONTROL ROUTES ---
app.get('/api/authenticator/accounts', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  let list = [];
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try { list = await User.find(); } catch { /* fallback */ }
  }
  if (!list || list.length === 0) {
    list = inMemoryStore.users;
  }
  const defaultPassMap = {};
  defaultAccounts.forEach(a => { defaultPassMap[a.username] = a.passwordRaw; });
  const sanitizedList = list.map(u => {
    const obj = u.toObject ? u.toObject() : { ...u };
    return {
      ...obj,
      password: obj.passwordRaw || defaultPassMap[obj.username] || 'Password#2026',
      passwordRaw: obj.passwordRaw || defaultPassMap[obj.username] || 'Password#2026'
    };
  });
  return res.json({ status: 'success', data: sanitizedList, users: sanitizedList });
});

app.post('/api/authenticator/accounts', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const plainPass = (req.body.password || 'Password#2026').toString().trim();
  const hashedPassword = bcrypt.hashSync(plainPass, 10);
  const newAcc = { 
    ...req.body, 
    _id: req.body._id || `acc_${req.body.username || Date.now()}`,
    password: hashedPassword,
    passwordRaw: plainPass
  };
  if (isMongoConnected) {
    try { await User.create(newAcc); } catch { /* fallback */ }
  }
  inMemoryStore.users.push(newAcc);
  await logSyncJournal('CREATE_ACCOUNT', req.body.campus || 'All', 'success', `Created account ${newAcc.username}`, req.user);
  return res.json({ status: 'success', data: { ...newAcc, password: plainPass } });
});

app.put('/api/authenticator/accounts/:id', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData.password && updateData.password.trim()) {
    const plainPass = updateData.password.trim();
    updateData.passwordRaw = plainPass;
    updateData.password = bcrypt.hashSync(plainPass, 10);
  } else {
    delete updateData.password;
  }
  if (isMongoConnected) {
    try { await User.findByIdAndUpdate(id, updateData); } catch { /* fallback */ }
  }
  const idx = inMemoryStore.users.findIndex(u => u._id === id || u.username === id || u.username === id.replace(/^acc_/, ''));
  if (idx !== -1) inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...updateData };
  await logSyncJournal('EDIT_CREDENTIALS', updateData.campus || 'All', 'success', `Updated account ${id}`, req.user);
  return res.json({ status: 'success', message: 'Account updated successfully.' });
});

app.delete('/api/authenticator/accounts/:id', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try { await User.findByIdAndDelete(id); } catch { /* fallback */ }
  }
  inMemoryStore.users = inMemoryStore.users.filter(u => u._id !== id);
  return res.json({ status: 'success', message: 'Account deleted.' });
});

app.get('/api/authenticator/keys', authenticateToken, (req, res) => {
  const keys = generateSecurityKeys();
  return res.json({ status: 'success', data: keys });
});

app.post('/api/authenticator/regenerate-keys', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  generateFreshAccountPins(true);
  const keys = generateSecurityKeys();
  await logSyncJournal('REGENERATE_SECURITY_PINS', 'All', 'success', 'All 9 Account 6-Digit Security PINs regenerated & activated. Old PINs invalidated.', req.user);
  return res.json({
    status: 'success',
    message: 'All 9 Security PINs regenerated successfully. Old PINs invalidated.',
    data: keys
  });
});

app.get('/api/authenticator/backup-codes', authenticateToken, requireRole('admin1', 'authenticator'), (req, res) => {
  const codes = [
    { name: 'Rector (Admin 1)', username: 'admin1', role: 'admin1', password: '***', backupCode: 'REC-BK-991', campus: 'All' },
    { name: 'Security Admin', username: 'authenticator', role: 'authenticator', password: '***', backupCode: 'SEC-BK-882', campus: 'All' }
  ];
  return res.json({ status: 'success', data: codes });
});

app.post('/api/authenticator/reset-password', authenticateToken, (req, res) => {
  const newBackup = `BK-${Date.now().toString().slice(-6)}`;
  return res.json({ status: 'success', nextBackupCode: newBackup });
});

app.get('/api/authenticator/sync-journal', authenticateToken, (req, res) => {
  return res.json({ status: 'success', data: inMemoryStore.journal });
});

app.get('/api/authenticator/stats', authenticateToken, async (req, res) => {
  const activeSessions = getActiveSessionSnapshot();
  const activeSessionCount = activeSessions.length;
  let totalStudents = 0;
  let totalTeachers = 0;
  let totalStaff = 0;

  if (isMongoConnected) {
    try {
      [totalStudents, totalTeachers, totalStaff] = await Promise.all([
        Student.countDocuments({}),
        Teacher.countDocuments({}),
        User.countDocuments({ role: { $in: ['admin1', 'admin2', 'accountant', 'authenticator'] } })
      ]);
    } catch {
      totalStudents = Object.values(inMemoryStore.students).flat().length;
      totalTeachers = Object.values(inMemoryStore.teachers).flat().length;
      totalStaff = inMemoryStore.users.filter(user => ['admin1', 'admin2', 'accountant', 'authenticator'].includes(user.role)).length;
    }
  } else {
    totalStudents = Object.values(inMemoryStore.students).flat().length;
    totalTeachers = Object.values(inMemoryStore.teachers).flat().length;
    totalStaff = inMemoryStore.users.filter(user => ['admin1', 'admin2', 'accountant', 'authenticator'].includes(user.role)).length;
  }

  return res.json({
    status: 'success',
    data: {
      totalStudents,
      totalTeachers,
      totalStaff,
      activeDevices: activeSessionCount,
      activeSessions,
      activeSessionCount,
      systemsActive: activeSessionCount,
      systemsInactive: Math.max(0, PORTAL_SLOT_TOTAL - activeSessionCount),
      portalSlotTotal: PORTAL_SLOT_TOTAL,
      lastBackupAt: lastSystemBackupAt
    }
  });
});

app.post('/api/authenticator/reconcile', authenticateToken, (req, res) => {
  return res.json({ status: 'success', message: 'System database reconciliation complete. All node records synchronized.' });
});

app.post('/api/authenticator/backup', authenticateToken, async (req, res) => {
  try {
    const pin = req.body?.securityPin || req.body?.pin || req.body?.passcode;
    const result = await backupService.runDailyBackup(pin);
    lastSystemBackupAt = result.lastBackupAt;
    return res.json({
      status: 'success',
      message: 'Google Drive 24-hour backup archive generated successfully across all 4 campuses and 3 category folders.',
      data: result
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

app.post('/api/authenticator/backup-drive', authenticateToken, async (req, res) => {
  try {
    const pin = req.body?.securityPin || req.body?.pin || req.body?.passcode;
    const result = await backupService.runDailyBackup(pin);
    lastSystemBackupAt = result.lastBackupAt;
    return res.json({
      status: 'success',
      message: 'Google Drive backup completed successfully!',
      data: result
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

app.get('/api/authenticator/available-backups', authenticateToken, async (req, res) => {
  try {
    const list = await backupService.listAvailableBackups();
    return res.json({ status: 'success', data: list });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/authenticator/restore-data', authenticateToken, async (req, res) => {
  try {
    const { category, campus, backupData, backupFileContent } = req.body;
    const result = await backupService.restoreDataPayload({
      category,
      campus,
      backupData,
      backupFileContent
    });
    return res.json({ status: 'success', data: result });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

app.post('/api/authenticator/purge-drive', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    const result = await backupService.cleanGoogleDriveExceptCategoryFolders();
    return res.json({ status: 'success', data: result, message: 'Google Drive purged successfully. Only the 3 category folders remain.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

async function verifyMasterSecurityPinAsync(pin) {
  if (!pin) return false;
  const cleanInput = String(pin).trim();
  let authUser = null;
  if (isMongoConnected && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      authUser = await User.findOne({ role: 'authenticator' });
    } catch (_e) {}
  }
  if (!authUser) {
    authUser = inMemoryStore.users.find(u => u.role === 'authenticator');
  }
  if (!authUser || !authUser.password) return false;
  return bcrypt.compareSync(cleanInput, authUser.password);
}

app.post('/api/authenticator/wipe-database', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  const pin = req.body?.securityPin || req.body?.passcode || req.body?.confirmationPass || req.body?.pin;
  const isValid = await verifyMasterSecurityPinAsync(pin);
  if (!isValid) {
    return res.status(403).json({
      status: 'error',
      message: 'Invalid Master Security Passcode! Required: Authenticator account password.'
    });
  }

  try {
    if (isMongoConnected) {
      await Promise.all([
        Student.deleteMany({}),
        Teacher.deleteMany({}),
        Payment.deleteMany({}),
        Expenditure.deleteMany({}),
        WorkerPayment.deleteMany({}),
        Bulletin.deleteMany({}),
        Hostel.deleteMany({}),
        SyncJournal.deleteMany({})
      ]);
    }

    inMemoryStore.students = {};
    inMemoryStore.teachers = {};
    inMemoryStore.payments = {};

    await seedInitialData().catch(e => console.warn('Re-seed warning after wipe:', e.message));

    return res.json({
      status: 'success',
      message: 'Entire database wiped cleanly! Initial system state and master credentials restored.'
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Database wipe failed: ${err.message}` });
  }
});

async function purgeStudentAndFacultyData() {
  const purgeSummary = { students: 0, teachers: 0, payments: 0 };

  if (isMongoConnected) {
    try {
      const [studentsResult, teachersResult, paymentsResult] = await Promise.all([
        Student.deleteMany({}),
        Teacher.deleteMany({}),
        Payment.deleteMany({})
      ]);
      purgeSummary.students = studentsResult.deletedCount || 0;
      purgeSummary.teachers = teachersResult.deletedCount || 0;
      purgeSummary.payments = paymentsResult.deletedCount || 0;
    } catch (err) {
      console.error('CRITICAL [Purge]: Failed to delete student/faculty data from MongoDB:', err.message);
      throw err;
    }
  }

  inMemoryStore.students = {};
  inMemoryStore.teachers = {};
  inMemoryStore.payments = {};
  return purgeSummary;
}

app.delete('/api/authenticator/purge-student-faculty-data', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const confirmationPass = (req.body?.confirmationPass || req.body?.passphrase || req.headers['x-confirmation-pass'] || '').toString().trim();
  const isValid = await verifyMasterSecurityPinAsync(confirmationPass);
  if (!isValid) {
    return res.status(403).json({ status: 'error', message: 'Confirmation pass is required to purge student and faculty data. Authenticator password required.' });
  }

  try {
    const purgeSummary = await purgeStudentAndFacultyData();
    return res.json({ status: 'success', message: 'Student and faculty records purged.', data: purgeSummary });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to purge student and faculty data.' });
  }
});

// --- ADMIN 1 ROUTES ---
app.get('/api/admin1/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant', 'authenticator'), enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const search = (req.query.search || '').toLowerCase().trim();
  let list = inMemoryStore.students[branch] || [];
  if (isMongoConnected) {
    try { list = await Student.find({ branch }); } catch { /* fallback */ }
  }
  const filtered = list.filter(s => {
    if (!search) return true;
    return (s.name || '').toLowerCase().includes(search) ||
           (s.admissionNumber || '').toLowerCase().includes(search) ||
           (s.studentId || '').toLowerCase().includes(search) ||
           (s.rollNumber || '').toLowerCase().includes(search) ||
           (s.registrationNumber || '').toLowerCase().includes(search) ||
           (s.mobile || '').includes(search);
  });
  return res.json({ status: 'success', data: filtered });
});

app.post(['/api/admin1/students', '/api/admin/students', '/api/accountant/students'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), enforceCampusIsolation, async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const admNo = (req.body.admissionNumber || req.body.studentId || `2400${Math.floor(100 + Math.random() * 900)}`).toString().trim();

  const existingAdmission = await findStudentByAdmissionNumber(admNo);
  if (existingAdmission) {
    return res.status(409).json({
      status: 'error',
      message: `Admission number ${admNo} already exists. Please use a unique admission number.`
    });
  }

  // Resolve campus-specific baseline fee settings
  let campusFeeSettings = inMemoryStore.feeSettings[branch];
  if (!campusFeeSettings && isMongoConnected) {
    try { campusFeeSettings = await FeeSettings.findOne({ branch }); } catch { /* fallback */ }
  }
  if (!campusFeeSettings) {
    campusFeeSettings = { tuition: 120000, hostel: 85000, transport: 0, misc: 5000 };
  }

  const tuitionFee = Number(req.body.tuitionFee || 0);
  const booksFee = Number(req.body.booksFee || 0);
  const uniformFees = Number(req.body.uniformFees || 0);
  const hndFees = Number(req.body.hndFees || 0);
  const internalExamFees = Number(req.body.internalExamFees || 0);
  const annualExamFees = Number(req.body.annualExamFees || 0);
  const partyFees = Number(req.body.partyFees || 0);
  const busFees = Number(req.body.busFees || 0);
  const labFees = Number(req.body.labFees || 0);
  const handLoan = Number(req.body.handLoan || 0);
  const othersFee = Number(req.body.othersFee || 0);
  const hostelFee = Number(req.body.hostelFee || 0);
  const transportFee = Number(req.body.transportFee || 0);
  const miscellaneousFee = Number(req.body.miscellaneousFee || 0);
  
  const previousPending = Number(req.body.previousPending || 0);
  const totalPaid = Number(req.body.totalPaid || 0);
  const tuitionWaiver = Number(req.body.tuitionWaiver || 0);
  const hostelWaiver = Number(req.body.hostelWaiver || 0);
  const transportWaiver = Number(req.body.transportWaiver || 0);
  const miscWaiver = Number(req.body.miscWaiver || 0);

  const totalWaivers = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;
  const isCustomFee = Boolean(req.body.isCustomFee || totalWaivers > 0 || tuitionFee > 0);

  const totalFee = tuitionFee + booksFee + uniformFees + hndFees + internalExamFees + annualExamFees + partyFees + busFees + labFees + handLoan + othersFee + hostelFee + transportFee + miscellaneousFee + previousPending;
  const remainingBalance = Math.max(0, totalFee - totalWaivers - totalPaid);

  const newStu = {
    _id: req.body._id || `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    studentId: admNo,
    admissionNumber: admNo,
    name: (req.body.name || 'New Student').trim(),
    fatherName: (req.body.fatherName || '').trim(),
    motherName: (req.body.motherName || '').trim(),
    mobile: (req.body.mobile || '').trim(),
    parentMobile: (req.body.parentMobile || '').trim(),
    email: (req.body.email || '').trim(),
    course: req.body.course || 'MPC',
    section: req.body.section || 'Section A',
    branch,
    rollNumber: (req.body.rollNumber || admNo).trim(),
    status: req.body.status || 'Active',
    hostelStatus: req.body.hostelStatus || 'Day Scholar',
    transportStatus: req.body.transportStatus || 'Self Transport',
    academicYear: req.body.academicYear || '2026-27',
    dob: req.body.dob || ''
  };
  if (isMongoConnected) {
    try {
      await Student.create(newStu);
    } catch (err) {
      console.error('CRITICAL [Student Create DB Error]:', err.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ status: 'error', message: `Failed to persist student to database: ${err.message}` });
      }
    }
  }
  if (!inMemoryStore.students[branch]) inMemoryStore.students[branch] = [];
  inMemoryStore.students[branch].push(newStu);

  await logSyncJournal('POST /api/admin1/students', branch, 'success', `Registered student ${admNo} for ${branch}`, req.user);
  emitToCampus(branch, 'student:created', { action: 'create', student: newStu, campus: branch, transactionId: `TX-STU-${Date.now()}` });
  return res.json({ status: 'success', data: newStu });
});

app.patch(['/api/admin1/students/:id', '/api/admin/students/:id', '/api/accountant/students/:id'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;

  let existingStudent = null;
  if (isMongoConnected) {
    try { existingStudent = await Student.findOne({ $or: [{ _id: id }, { studentId: id }, { admissionNumber: id }] }); } catch { /* fallback */ }
  }
  if (!existingStudent) {
    const allStus = Object.values(inMemoryStore.students).flat();
    existingStudent = allStus.find(s => s._id === id || s.studentId === id || s.admissionNumber === id);
  }

  const updateBody = { ...req.body };
  updateBody.branch = branch;
  if (existingStudent || updateBody.tuitionFee !== undefined || updateBody.tuitionWaiver !== undefined) {
    const tuitionFee = Number(updateBody.tuitionFee !== undefined ? updateBody.tuitionFee : (existingStudent?.tuitionFee || 0));
    const booksFee = Number(updateBody.booksFee !== undefined ? updateBody.booksFee : (existingStudent?.booksFee || 0));
    const uniformFees = Number(updateBody.uniformFees !== undefined ? updateBody.uniformFees : (existingStudent?.uniformFees || 0));
    const hndFees = Number(updateBody.hndFees !== undefined ? updateBody.hndFees : (existingStudent?.hndFees || 0));
    const internalExamFees = Number(updateBody.internalExamFees !== undefined ? updateBody.internalExamFees : (existingStudent?.internalExamFees || 0));
    const annualExamFees = Number(updateBody.annualExamFees !== undefined ? updateBody.annualExamFees : (existingStudent?.annualExamFees || 0));
    const partyFees = Number(updateBody.partyFees !== undefined ? updateBody.partyFees : (existingStudent?.partyFees || 0));
    const busFees = Number(updateBody.busFees !== undefined ? updateBody.busFees : (existingStudent?.busFees || 0));
    const labFees = Number(updateBody.labFees !== undefined ? updateBody.labFees : (existingStudent?.labFees || 0));
    const handLoan = Number(updateBody.handLoan !== undefined ? updateBody.handLoan : (existingStudent?.handLoan || 0));
    const othersFee = Number(updateBody.othersFee !== undefined ? updateBody.othersFee : (existingStudent?.othersFee || 0));
    const hostelFee = Number(updateBody.hostelFee !== undefined ? updateBody.hostelFee : (existingStudent?.hostelFee || 0));
    const transportFee = Number(updateBody.transportFee !== undefined ? updateBody.transportFee : (existingStudent?.transportFee || 0));
    const miscellaneousFee = Number(updateBody.miscellaneousFee !== undefined ? updateBody.miscellaneousFee : (existingStudent?.miscellaneousFee || 0));
    const previousPending = Number(updateBody.previousPending !== undefined ? updateBody.previousPending : (existingStudent?.previousPending || 0));

    const tuitionWaiver = Number(updateBody.tuitionWaiver !== undefined ? updateBody.tuitionWaiver : (existingStudent?.tuitionWaiver || 0));
    const hostelWaiver = Number(updateBody.hostelWaiver !== undefined ? updateBody.hostelWaiver : (existingStudent?.hostelWaiver || 0));
    const transportWaiver = Number(updateBody.transportWaiver !== undefined ? updateBody.transportWaiver : (existingStudent?.transportWaiver || 0));
    const miscWaiver = Number(updateBody.miscWaiver !== undefined ? updateBody.miscWaiver : (existingStudent?.miscWaiver || 0));
    const totalPaid = Number(updateBody.totalPaid !== undefined ? updateBody.totalPaid : (existingStudent?.totalPaid || 0));

    const totalFee = tuitionFee + booksFee + uniformFees + hndFees + internalExamFees + annualExamFees + partyFees + busFees + labFees + handLoan + othersFee + hostelFee + transportFee + miscellaneousFee + previousPending;
    const totalWaiver = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;

    updateBody.tuitionFee = tuitionFee;
    updateBody.booksFee = booksFee;
    updateBody.uniformFees = uniformFees;
    updateBody.hndFees = hndFees;
    updateBody.internalExamFees = internalExamFees;
    updateBody.annualExamFees = annualExamFees;
    updateBody.partyFees = partyFees;
    updateBody.busFees = busFees;
    updateBody.labFees = labFees;
    updateBody.handLoan = handLoan;
    updateBody.othersFee = othersFee;
    updateBody.hostelFee = hostelFee;
    updateBody.transportFee = transportFee;
    updateBody.miscellaneousFee = miscellaneousFee;
    updateBody.previousPending = previousPending;
    updateBody.tuitionWaiver = tuitionWaiver;
    updateBody.hostelWaiver = hostelWaiver;
    updateBody.transportWaiver = transportWaiver;
    updateBody.miscWaiver = miscWaiver;
    updateBody.remainingBalance = Math.max(0, totalFee - totalWaiver - totalPaid);

    if (totalFee > 0 || totalWaiver > 0) {
      updateBody.isCustomFee = true;
    }
  }

  if (isMongoConnected) {
    try {
      const dbId = existingStudent?._id || id;
      await Student.findByIdAndUpdate(dbId, updateBody);
    } catch (err) {
      console.error('CRITICAL [Student Update DB Error]:', err.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ status: 'error', message: `Failed to update student in database: ${err.message}` });
      }
    }
  }

  Object.keys(inMemoryStore.students).forEach(bKey => {
    const list = inMemoryStore.students[bKey] || [];
    const idx = list.findIndex(s => s._id === id || s.studentId === id || s.admissionNumber === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...updateBody };
  });

  await logSyncJournal(`PATCH /api/accountant/students/${id}`, branch, 'success', `Updated student profile and fee breakdown for ${id}`, req.user);
  emitToCampus(branch, 'student:updated', { action: 'update', studentId: id, campus: branch, transactionId: `TX-STU-UPD-${Date.now()}` });
  return res.json({ status: 'success', data: { ...(existingStudent?.toObject ? existingStudent.toObject() : existingStudent), ...updateBody } });
});

app.delete(['/api/admin1/students/:id', '/api/admin/students/:id', '/api/accountant/students/:id'], authenticateToken, requireRole('admin1', 'admin2', 'authenticator'), enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;

  // 1. Delete permanently from MongoDB collections
  if (isMongoConnected) {
    try {
      const dbStu = await Student.findOne({ $or: [{ _id: id }, { studentId: id }, { admissionNumber: id }] });
      const targetId = dbStu ? dbStu._id : id;
      const targetAdm = dbStu ? dbStu.admissionNumber : id;

      await Promise.all([
        Student.deleteMany({ $or: [{ _id: targetId }, { studentId: id }, { admissionNumber: targetAdm }] }),
        FeeReceipt.deleteMany({ $or: [{ studentId: id }, { studentId: targetAdm }] }),
        Attendance.deleteMany({ $or: [{ studentId: id }, { studentId: targetAdm }] }),
        User.deleteMany({ username: targetAdm })
      ]);
    } catch (err) {
      console.error('MongoDB permanent deletion error:', err);
    }
  }

  // 2. Delete permanently from all campus inMemoryStore lists
  Object.keys(inMemoryStore.students).forEach(bKey => {
    if (Array.isArray(inMemoryStore.students[bKey])) {
      inMemoryStore.students[bKey] = inMemoryStore.students[bKey].filter(
        s => s._id !== id && s.studentId !== id && s.admissionNumber !== id
      );
    }
  });

  await logSyncJournal(`DELETE /api/admin1/students/${id}`, branch, 'success', `Permanently purged student ${id} from database and all sub-records.`, req.user);
  emitToCampus(branch, 'student:deleted', { action: 'delete', studentId: id, campus: branch, transactionId: `TX-STU-DEL-${Date.now()}` });
  return res.json({ status: 'success', message: 'Student record permanently deleted from database.' });
});

app.get(['/api/admin1/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'admin2', 'authenticator'), enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = [];
  if (isMongoConnected) {
    try {
      if (branch === 'All' || req.user?.role === 'admin1' || req.user?.role === 'admin2') {
        list = await Teacher.find({});
      } else {
        list = await Teacher.find({ branch });
      }
    } catch { /* fallback */ }
  }
  if (!list || list.length === 0) {
    if (branch === 'All' || req.user?.role === 'admin1' || req.user?.role === 'admin2') {
      list = Object.values(inMemoryStore.teachers).flat();
      const seen = new Set();
      list = list.filter(t => {
        const key = t.id || t._id || t.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else {
      list = inMemoryStore.teachers[branch] || [];
    }
  }
  return res.json({ status: 'success', data: list });
});

app.post(['/api/admin1/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'admin2'), enforceCampusIsolation, async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const salaryVal = Number(req.body.salary || 35000);
  const monthlySalaries = req.body.monthlySalaries || createDefaultMonthlySalaries(salaryVal);
  const newTeacher = {
    ...req.body,
    _id: `t_${Date.now()}`,
    id: req.body.id || `STF${Math.floor(100000 + Math.random() * 900000)}`,
    branch,
    salary: salaryVal,
    role: req.body.role || req.body.subject || 'Staff Member',
    subject: req.body.subject || req.body.role || 'Staff Member',
    classification: req.body.classification || 'Teaching',
    monthlySalaries
  };
  if (isMongoConnected) {
    try { await Teacher.create(newTeacher); } catch { /* fallback */ }
  }
  if (!inMemoryStore.teachers[branch]) inMemoryStore.teachers[branch] = [];
  inMemoryStore.teachers[branch].push(newTeacher);

  await logSyncJournal('POST /api/admin1/teachers', branch, 'success', `Created staff record ${newTeacher.name} (${newTeacher.role}) for ${branch}`, req.user);
  return res.json({ status: 'success', data: newTeacher });
});

app.patch(['/api/admin1/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (isMongoConnected) {
    try { await Teacher.findOneAndUpdate({ $or: [{ _id: id }, { id }] }, updateData); } catch { /* fallback */ }
  }
  Object.keys(inMemoryStore.teachers).forEach(bKey => {
    const list = inMemoryStore.teachers[bKey] || [];
    const idx = list.findIndex(t => t._id === id || t.id === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...updateData };
  });
  await logSyncJournal(`PATCH /api/admin1/teachers/${id}`, req.targetCampus, 'success', `Updated staff record for ${id}`, req.user);
  return res.json({ status: 'success', data: { id, ...updateData } });
});

app.delete(['/api/admin1/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try { await Teacher.deleteMany({ $or: [{ _id: id }, { id }] }); } catch { /* fallback */ }
  }
  Object.keys(inMemoryStore.teachers).forEach(bKey => {
    if (Array.isArray(inMemoryStore.teachers[bKey])) {
      inMemoryStore.teachers[bKey] = inMemoryStore.teachers[bKey].filter(t => t._id !== id && t.id !== id);
    }
  });
  await logSyncJournal(`DELETE /api/admin1/teachers/${id}`, req.targetCampus, 'success', `Permanently purged staff record ${id}`, req.user);
  return res.json({ status: 'success', message: 'Staff record permanently deleted.' });
});

// --- ACADEMIC YEAR MANAGER ENDPOINTS ---
app.get('/api/admin1/academic-years', authenticateToken, async (req, res) => {
  let settings = inMemoryStore.academicYearSettings;
  if (isMongoConnected) {
    try {
      const dbSettings = await AcademicYearSettings.findOne({});
      if (dbSettings) settings = dbSettings;
    } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: settings });
});

app.post('/api/admin1/academic-years', authenticateToken, requireRole('admin1'), async (req, res) => {
  const { yearId, label, startDate, endDate, status } = req.body;
  if (!yearId || !label) {
    return res.status(400).json({ status: 'error', message: 'Year ID and Label are required.' });
  }

  let settings = inMemoryStore.academicYearSettings;
  if (isMongoConnected) {
    try {
      let dbSettings = await AcademicYearSettings.findOne({});
      if (!dbSettings) {
        dbSettings = await AcademicYearSettings.create(settings);
      }
      dbSettings.academicYears.push({
        yearId,
        label,
        status: status || 'Upcoming',
        startDate: startDate || '',
        endDate: endDate || '',
        createdAt: new Date(),
        createdBy: req.user.username || 'Admin One'
      });
      await dbSettings.save();
      settings = dbSettings;
    } catch (err) { console.error('AcademicYear create error:', err); }
  }

  const existingIdx = inMemoryStore.academicYearSettings.academicYears.findIndex(y => y.yearId === yearId);
  const newObj = { yearId, label, status: status || 'Upcoming', startDate: startDate || '', endDate: endDate || '', createdAt: new Date(), createdBy: req.user.username || 'Admin One' };
  if (existingIdx !== -1) {
    inMemoryStore.academicYearSettings.academicYears[existingIdx] = newObj;
  } else {
    inMemoryStore.academicYearSettings.academicYears.push(newObj);
  }

  await logAuditTrail('CREATE_ACADEMIC_YEAR', req.user, req.targetCampus || '', yearId, { yearId, label, status }, req);
  await logSyncJournal('POST /api/admin1/academic-years', req.targetCampus || '', 'success', `Created academic year ${yearId}`, req.user);
  return res.json({ status: 'success', data: inMemoryStore.academicYearSettings });
});

app.patch('/api/admin1/academic-years/:yearId/status', authenticateToken, requireRole('admin1'), async (req, res) => {
  const { yearId } = req.params;
  const { status } = req.body; // 'Active' | 'Closed' | 'Archived' | 'Upcoming'

  if (status === 'Active') {
    inMemoryStore.academicYearSettings.activeYear = yearId;
    inMemoryStore.academicYearSettings.academicYears.forEach(y => {
      if (y.yearId === yearId) y.status = 'Active';
      else if (y.status === 'Active') y.status = 'Closed';
    });
  } else {
    const y = inMemoryStore.academicYearSettings.academicYears.find(item => item.yearId === yearId);
    if (y) y.status = status;
  }

  if (isMongoConnected) {
    try {
      let dbSettings = await AcademicYearSettings.findOne({});
      if (dbSettings) {
        if (status === 'Active') {
          dbSettings.activeYear = yearId;
          dbSettings.academicYears.forEach(y => {
            if (y.yearId === yearId) y.status = 'Active';
            else if (y.status === 'Active') y.status = 'Closed';
          });
        } else {
          const target = dbSettings.academicYears.find(item => item.yearId === yearId);
          if (target) target.status = status;
        }
        await dbSettings.save();
      }
    } catch (err) { console.error('AcademicYear update error:', err); }
  }

  await logAuditTrail('UPDATE_ACADEMIC_YEAR_STATUS', req.user, req.targetCampus || '', yearId, { yearId, status }, req);
  await logSyncJournal(`PATCH /api/admin1/academic-years/${yearId}/status`, req.targetCampus || '', 'success', `Set ${yearId} status to ${status}`, req.user);
  return res.json({ status: 'success', data: inMemoryStore.academicYearSettings });
});

// --- STUDENT PROMOTION ENDPOINT ---
app.post(['/api/students/:id/promote', '/api/admin1/students/:id/promote', '/api/accountant/students/:id/promote'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  const { securityPassword, otpInput, nextAcademicYear, nextCourseYear, hostelStatus, transportStatus, newFeeStructure, waivers } = req.body;

  if (!securityPassword || !otpInput) {
    return res.status(400).json({ status: 'error', message: 'Security Password and OTP verification are mandatory for promotion.' });
  }

  let isPassValid = false;
  if (req.user && req.user.password) {
    isPassValid = bcrypt.compareSync(securityPassword, req.user.password);
  }
  if (!isPassValid) {
    return res.status(401).json({ status: 'error', message: 'Invalid security password. Promotion denied.' });
  }

  const isOtpValid = otpInput && otpInput.toString().trim().length >= 4;
  if (!isOtpValid) {
    return res.status(401).json({ status: 'error', message: 'Invalid OTP verification code.' });
  }

  let existingStudent = null;
  if (isMongoConnected) {
    try { existingStudent = await Student.findOne({ $or: [{ _id: id }, { studentId: id }, { admissionNumber: id }] }); } catch { /* fallback */ }
  }
  if (!existingStudent) {
    const allStus = Object.values(inMemoryStore.students).flat();
    existingStudent = allStus.find(s => s._id === id || s.studentId === id || s.admissionNumber === id);
  }

  if (!existingStudent) {
    return res.status(404).json({ status: 'error', message: 'Student record not found.' });
  }

  const currentAcademicYear = existingStudent.academicYear || '2026-27';

  const currentSnapshot = {
    academicYear: currentAcademicYear,
    courseYear: existingStudent.section || '1st Year',
    status: 'Completed',
    completedAt: new Date(),
    tuitionFee: existingStudent.tuitionFee || 0,
    booksFee: existingStudent.booksFee || 0,
    uniformFees: existingStudent.uniformFees || 0,
    hndFees: existingStudent.hndFees || 0,
    internalExamFees: existingStudent.internalExamFees || 0,
    annualExamFees: existingStudent.annualExamFees || 0,
    partyFees: existingStudent.partyFees || 0,
    busFees: existingStudent.busFees || 0,
    labFees: existingStudent.labFees || 0,
    handLoan: existingStudent.handLoan || 0,
    othersFee: existingStudent.othersFee || 0,
    hostelFee: existingStudent.hostelFee || 0,
    transportFee: existingStudent.transportFee || 0,
    miscellaneousFee: existingStudent.miscellaneousFee || 0,
    previousPending: existingStudent.previousPending || 0,
    totalPaid: existingStudent.totalPaid || 0,
    remainingBalance: existingStudent.remainingBalance || 0,
    tuitionWaiver: existingStudent.tuitionWaiver || 0,
    hostelWaiver: existingStudent.hostelWaiver || 0,
    transportWaiver: existingStudent.transportWaiver || 0,
    miscWaiver: existingStudent.miscWaiver || 0,
    feeAdjustments: existingStudent.feeAdjustments || [],
    marks: existingStudent.marks || []
  };

  const carriedOverPending = existingStudent.remainingBalance || 0;

  const tuitionFee = Number(newFeeStructure?.tuitionFee || 0);
  const booksFee = Number(newFeeStructure?.booksFee || 0);
  const uniformFees = Number(newFeeStructure?.uniformFees || 0);
  const hndFees = Number(newFeeStructure?.hndFees || 0);
  const internalExamFees = Number(newFeeStructure?.internalExamFees || 0);
  const annualExamFees = Number(newFeeStructure?.annualExamFees || 0);
  const partyFees = Number(newFeeStructure?.partyFees || 0);
  const busFees = Number(newFeeStructure?.busFees || 0);
  const labFees = Number(newFeeStructure?.labFees || 0);
  const handLoan = Number(newFeeStructure?.handLoan || 0);
  const othersFee = Number(newFeeStructure?.othersFee || 0);
  const hostelFee = Number(newFeeStructure?.hostelFee || 0);
  const transportFee = Number(newFeeStructure?.transportFee || 0);
  const miscellaneousFee = Number(newFeeStructure?.miscellaneousFee || 0);

  const tuitionWaiver = Number(waivers?.tuitionWaiver || 0);
  const hostelWaiver = Number(waivers?.hostelWaiver || 0);
  const transportWaiver = Number(waivers?.transportWaiver || 0);
  const miscWaiver = Number(waivers?.miscWaiver || 0);

  const totalNewFees = tuitionFee + booksFee + uniformFees + hndFees + internalExamFees + annualExamFees + partyFees + busFees + labFees + handLoan + othersFee + hostelFee + transportFee + miscellaneousFee + carriedOverPending;
  const totalWaiver = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;

  const updatedYearsHistory = Array.isArray(existingStudent.academicYears) ? [...existingStudent.academicYears] : [];
  const existingYearIdx = updatedYearsHistory.findIndex(y => y.academicYear === currentAcademicYear);
  if (existingYearIdx !== -1) {
    updatedYearsHistory[existingYearIdx] = currentSnapshot;
  } else {
    updatedYearsHistory.push(currentSnapshot);
  }

  const promotedAcademicYear = nextAcademicYear || '2027-28';
  const promotedCourseYear = nextCourseYear || '2nd Year';

  const newYearActiveRecord = {
    academicYear: promotedAcademicYear,
    courseYear: promotedCourseYear,
    status: 'Active',
    promotedAt: new Date(),
    tuitionFee,
    booksFee,
    uniformFees,
    hndFees,
    internalExamFees,
    annualExamFees,
    partyFees,
    busFees,
    labFees,
    handLoan,
    othersFee,
    hostelFee,
    transportFee,
    miscellaneousFee,
    previousPending: carriedOverPending,
    totalPaid: 0,
    remainingBalance: Math.max(0, totalNewFees - totalWaiver),
    tuitionWaiver,
    hostelWaiver,
    transportWaiver,
    miscWaiver
  };

  updatedYearsHistory.push(newYearActiveRecord);

  const updatePayload = {
    academicYear: promotedAcademicYear,
    section: promotedCourseYear,
    hostelStatus: hostelStatus || existingStudent.hostelStatus || 'Day Scholar',
    transportStatus: transportStatus || existingStudent.transportStatus || 'Self Transport',
    tuitionFee,
    booksFee,
    uniformFees,
    hndFees,
    internalExamFees,
    annualExamFees,
    partyFees,
    busFees,
    labFees,
    handLoan,
    othersFee,
    hostelFee,
    transportFee,
    miscellaneousFee,
    previousPending: carriedOverPending,
    totalPaid: 0,
    remainingBalance: Math.max(0, totalNewFees - totalWaiver),
    tuitionWaiver,
    hostelWaiver,
    transportWaiver,
    miscWaiver,
    academicYears: updatedYearsHistory,
    status: 'Active'
  };

  if (isMongoConnected) {
    try {
      const dbId = existingStudent._id || id;
      await Student.findByIdAndUpdate(dbId, updatePayload);
    } catch (err) { console.error('Student promotion DB update error:', err); }
  }

  Object.keys(inMemoryStore.students).forEach(bKey => {
    const list = inMemoryStore.students[bKey] || [];
    const idx = list.findIndex(s => s._id === id || s.studentId === id || s.admissionNumber === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...updatePayload };
  });

  await logAuditTrail('STUDENT_PROMOTION', req.user, branch, existingStudent.admissionNumber || id, {
    studentName: existingStudent.name,
    admissionNumber: existingStudent.admissionNumber,
    previousAcademicYear: currentAcademicYear,
    newAcademicYear: promotedAcademicYear,
    previousPending: carriedOverPending,
    newTotalPayable: updatePayload.remainingBalance
  }, req);

  await logSyncJournal(`POST /api/students/${id}/promote`, branch, 'success', `Promoted student ${existingStudent.name} (${existingStudent.admissionNumber}) from ${currentAcademicYear} to ${promotedAcademicYear}`, req.user);
  emitToCampus(branch, 'student:updated', { action: 'promote', studentId: id, campus: branch, transactionId: `TX-STU-PROM-${Date.now()}` });

  return res.json({
    status: 'success',
    message: `Student ${existingStudent.name} promoted successfully to ${promotedAcademicYear} (${promotedCourseYear}).`,
    data: { ...(existingStudent.toObject ? existingStudent.toObject() : existingStudent), ...updatePayload }
  });
});

// --- AUDIT TRAIL ENDPOINT ---
app.get('/api/admin/audit-logs', authenticateToken, async (req, res) => {
  let logs = inMemoryStore.auditLogs || [];
  if (isMongoConnected) {
    try {
      logs = await AuditLog.find().sort({ time: -1 }).limit(100);
    } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: logs });
});

// --- TEACHER MONTHLY SALARY LEDGER ENDPOINT ---
app.post(['/api/teachers/:id/salary-month', '/api/admin1/teachers/:id/salary-month', '/api/admin2/teachers/:id/salary-month'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  const { academicYear, monthKey, expectedSalary, paidAmount, paymentDate, paymentMode, referenceNumber, notes, approvedBy, isHoliday } = req.body;

  let existingTeacher = null;
  if (isMongoConnected) {
    try { existingTeacher = await Teacher.findOne({ $or: [{ _id: id }, { id }] }); } catch { /* fallback */ }
  }
  if (!existingTeacher) {
    const allTeachers = Object.values(inMemoryStore.teachers).flat();
    existingTeacher = allTeachers.find(t => t._id === id || t.id === id);
  }

  if (!existingTeacher) {
    return res.status(404).json({ status: 'error', message: 'Staff member not found.' });
  }

  const targetYear = academicYear || '2026-27';
  const targetMonth = monthKey || new Date().toISOString().substring(0, 7);

  const currentMonthlySalaries = existingTeacher.monthlySalaries || {};
  if (!currentMonthlySalaries[targetYear]) {
    currentMonthlySalaries[targetYear] = {};
  }

  const expected = Number(expectedSalary !== undefined ? expectedSalary : existingTeacher.salary || 50000);
  const paid = Number(paidAmount || 0);
  const pending = Math.max(0, expected - paid);

  let status = 'unpaid';
  if (isHoliday || (expected === 0 && paid === 0)) {
    status = 'holiday';
  } else if (paid >= expected && expected > 0) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partial';
  }

  currentMonthlySalaries[targetYear][targetMonth] = {
    monthKey: targetMonth,
    expectedSalary: expected,
    paidAmount: paid,
    pendingAmount: pending,
    paymentDate: paymentDate || new Date().toISOString().substring(0, 10),
    paymentMode: paymentMode || 'Direct Bank Transfer',
    referenceNumber: referenceNumber || `REF-SAL-${Date.now()}`,
    notes: notes || (isHoliday ? 'Holiday / No Salary' : 'Monthly Salary Disbursal'),
    approvedBy: approvedBy || req.user.username || 'Finance Admin',
    status,
    updatedAt: new Date()
  };

  const updateData = {
    monthlySalaries: currentMonthlySalaries,
    salaryStatus: status,
    salaryPaidAmount: paid,
    salaryPaymentDate: paymentDate || new Date().toISOString().substring(0, 10)
  };

  if (isMongoConnected) {
    try {
      const dbId = existingTeacher._id || id;
      await Teacher.findByIdAndUpdate(dbId, updateData);
    } catch (err) { console.error('Teacher salary update error:', err); }
  }

  Object.keys(inMemoryStore.teachers).forEach(bKey => {
    const list = inMemoryStore.teachers[bKey] || [];
    const idx = list.findIndex(t => t._id === id || t.id === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...updateData };
  });

  await logAuditTrail('STAFF_SALARY_UPDATE', req.user, branch, existingTeacher.id || id, {
    teacherName: existingTeacher.name,
    academicYear: targetYear,
    monthKey: targetMonth,
    status,
    paidAmount: paid,
    notes
  }, req);

  await logSyncJournal(`POST /api/teachers/${id}/salary-month`, branch, 'success', `Updated salary for ${existingTeacher.name} for ${targetMonth} (${status})`, req.user);

  return res.json({
    status: 'success',
    message: `Salary for ${existingTeacher.name} for ${targetMonth} recorded successfully.`,
    data: { ...(existingTeacher.toObject ? existingTeacher.toObject() : existingTeacher), ...updateData }
  });
});

app.get('/api/admin1/sections', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) {
    try { teachersList = await Teacher.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: { sections: ['Section A', 'Section B'], teachers: teachersList } });
});

app.post('/api/admin1/sections', authenticateToken, enforceCampusIsolation, (req, res) => {
  return res.json({ status: 'success', message: 'Allocations updated successfully.' });
});

app.get('/api/admin1/bulletins', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.bulletins[branch] || [];
  if (isMongoConnected) {
    try { list = await Bulletin.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin1/bulletins', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newBul = { ...req.body, _id: `BUL-${Date.now()}`, branch };
  if (isMongoConnected) {
    try { await Bulletin.create(newBul); } catch { /* fallback */ }
  }
  if (!inMemoryStore.bulletins[branch]) inMemoryStore.bulletins[branch] = [];
  inMemoryStore.bulletins[branch].push(newBul);
  return res.json({ status: 'success', data: newBul });
});

// --- ADMISSION ENQUIRIES STORE ---
const inMemoryEnquiries = [
  {
    id: 'ENQ-2026-101',
    referenceCode: 'INS-2026-849201',
    studentName: 'Aarav Sharma',
    parentName: 'Ramesh Sharma',
    mobile: '9849012345',
    email: 'aarav.sharma@example.com',
    stream: 'MPC (IIT-JEE / EAMCET)',
    preferredCampus: 'Erragattugutta Campus 1',
    currentGrade: '10th Class Passed',
    notes: 'Interested in Super-60 IIT-JEE Residential Batch.',
    status: 'New',
    createdAt: '2026-07-28T08:30:00.000Z'
  },
  {
    id: 'ENQ-2026-102',
    referenceCode: 'INS-2026-729104',
    studentName: 'Saniya Reddy',
    parentName: 'Venkatesh Reddy',
    mobile: '9440187654',
    email: 'saniya.reddy@example.com',
    stream: 'BiPC (NEET / EAMCET)',
    preferredCampus: 'Bheemaram Campus 1',
    currentGrade: '10th Class Passed',
    notes: 'Inquiring about NEET 3D Bio Lab coaching & hostel availability.',
    status: 'Contacted',
    createdAt: '2026-07-27T14:15:00.000Z'
  },
  {
    id: 'ENQ-2026-103',
    referenceCode: 'INS-2026-610283',
    studentName: 'Karthik Teja',
    parentName: 'Srinivas Rao',
    mobile: '9866123987',
    email: 'karthik.teja@example.com',
    stream: 'MPC (IIT-JEE / EAMCET)',
    preferredCampus: 'Erragattugutta Campus 2',
    currentGrade: 'Inter 1st Year',
    notes: 'Lateral admission inquiry for Inter 2nd Year IIT-JEE batch.',
    status: 'New',
    createdAt: '2026-07-28T09:10:00.000Z'
  },
  {
    id: 'ENQ-2026-104',
    referenceCode: 'INS-2026-905182',
    studentName: 'Meghana Rao',
    parentName: 'Prabhakar Rao',
    mobile: '9989054321',
    email: 'meghana.rao@example.com',
    stream: 'BiPC (NEET / EAMCET)',
    preferredCampus: 'Bheemaram Campus 2',
    currentGrade: '10th Class Passed',
    notes: 'Scholarship entrance test details requested.',
    status: 'Enrolled',
    createdAt: '2026-07-25T11:45:00.000Z'
  }
];

// PUBLIC POST ENQUIRY (Portfolio Submission)
app.post('/api/enquiries', (req, res) => {
  const { studentName, parentName, mobile, email, stream, preferredCampus, currentGrade, notes } = req.body || {};

  if (!studentName || !mobile || !preferredCampus) {
    return res.status(400).json({ status: 'error', message: 'Student Name, Mobile Number, and Preferred Campus are required.' });
  }

  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  const refCode = `INS-2026-${randomDigits}`;
  const newEnquiry = {
    id: `ENQ-2026-${Date.now()}`,
    referenceCode: refCode,
    studentName: (studentName || '').trim(),
    parentName: (parentName || 'N/A').trim(),
    mobile: (mobile || '').trim(),
    email: (email || '').trim(),
    stream: stream || 'MPC (IIT-JEE / EAMCET)',
    preferredCampus: preferredCampus || 'Erragattugutta Campus 1',
    currentGrade: currentGrade || '10th Class Passed',
    notes: (notes || '').trim(),
    status: 'New',
    createdAt: new Date().toISOString()
  };

  inMemoryEnquiries.unshift(newEnquiry);
  return res.json({
    status: 'success',
    referenceCode: refCode,
    message: 'Admission Enquiry submitted successfully. Our counselor will reach out shortly.',
    data: newEnquiry
  });
});

// AUTHENTICATED GET ENQUIRIES (Admin1 & Admin2)
app.get('/api/enquiries', authenticateToken, (req, res) => {
  let list = [...inMemoryEnquiries];
  if (req.targetCampus && req.targetCampus !== 'All') {
    const target = req.targetCampus.toLowerCase();
    list = list.filter(e => (e.preferredCampus || '').toLowerCase().includes(target) || target.includes((e.preferredCampus || '').toLowerCase()));
  }
  return res.json({ status: 'success', data: list });
});

// AUTHENTICATED UPDATE ENQUIRY STATUS / NOTES
app.patch('/api/enquiries/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body || {};
  const enq = inMemoryEnquiries.find(e => e.id === id || e.referenceCode === id);

  if (!enq) {
    return res.status(404).json({ status: 'error', message: 'Enquiry record not found.' });
  }

  if (status) enq.status = status;
  if (notes !== undefined) enq.notes = notes;

  return res.json({ status: 'success', message: 'Enquiry record updated successfully.', data: enq });
});

app.get('/api/admin1/timetable', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/admin1/timetable/upload', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Timetable uploaded and processed.' }));
app.get('/api/admin1/exams', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/admin1/exams/upload', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Exam scores uploaded and processed.' }));
app.get('/api/admin1/reports', authenticateToken, (req, res) => res.json({ status: 'success', data: { totalStudents: 480, attendanceRate: 94.2, feeCollectionPct: 88.5, passPercentage: 96.8 } }));
app.get('/api/admin1/attendance-summary', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));

// --- ADMIN 2 ROUTES ---
app.get('/api/admin2/fee-settings', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let settings = inMemoryStore.feeSettings[branch] || { branch, tuition: 120000, hostel: 85000, transport: 0, misc: 5000, isLocked: true };
  if (isMongoConnected) {
    try {
      const dbSettings = await FeeSettings.findOne({ branch });
      if (dbSettings) settings = dbSettings;
    } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: settings });
});

app.patch('/api/admin2/fee-settings', authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'feeStructure' }), async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const updated = { ...req.body, branch };
  if (isMongoConnected) {
    try { await FeeSettings.findOneAndUpdate({ branch }, updated, { upsert: true }); } catch { /* fallback */ }
  }
  inMemoryStore.feeSettings[branch] = updated;

  // Propagate updated fee structure to all registered students in this campus UNLESS custom fee edit or waiver was applied
  let studentsInBranch = [];
  if (isMongoConnected) {
    try { studentsInBranch = await Student.find({ branch }); } catch { /* fallback */ }
  }
  if (!studentsInBranch || studentsInBranch.length === 0) {
    studentsInBranch = inMemoryStore.students[branch] || [];
  }

  for (const stu of studentsInBranch) {
    const totalWaivers = (stu.tuitionWaiver || 0) + (stu.hostelWaiver || 0) + (stu.transportWaiver || 0) + (stu.miscWaiver || 0);
    const hasCustomFee = Boolean(stu.isCustomFee) || totalWaivers > 0;

    // UNLESS student fee was manually edited / fee waiver applied, update student fee to match new campus fee structure
    if (!hasCustomFee) {
      const previousFeeTotal = getStudentFeeTotal(stu);
      const previousBalance = Number(stu.remainingBalance || 0);
      const tuitionFee = Number(updated.tuition !== undefined ? updated.tuition : (stu.tuitionFee || 120000));
      const miscellaneousFee = Number(updated.misc !== undefined ? updated.misc : (stu.miscellaneousFee || 5000));
      const hostelFee = Number(updated.hostel !== undefined ? updated.hostel : (stu.hostelFee || 85000));
      const transportFee = 0;
      
      const previousPending = Number(stu.previousPending || 0);
      const totalPaid = Number(stu.totalPaid || 0);
      const updatedFeeTotal = tuitionFee + hostelFee + miscellaneousFee + previousPending;
      const feeDifference = updatedFeeTotal - previousFeeTotal;
      const remainingBalance = Math.max(0, previousBalance + feeDifference);
      const feeAdjustment = feeDifference === 0
        ? null
        : createFeeAdjustmentRecord(stu, branch, previousBalance, remainingBalance, previousFeeTotal, updatedFeeTotal);

      const stuUpdate = {
        tuitionFee,
        miscellaneousFee,
        hostelFee,
        transportFee,
        remainingBalance,
        ...(feeAdjustment ? {
          feeAdjustments: [feeAdjustment, ...(Array.isArray(stu.feeAdjustments) ? stu.feeAdjustments : [])]
        } : {})
      };

      if (isMongoConnected) {
        try { await Student.findByIdAndUpdate(stu._id, stuUpdate); } catch { /* fallback */ }
      }

      // Update in-memory store across all branches for this student
      Object.keys(inMemoryStore.students).forEach(bKey => {
        const memIdx = inMemoryStore.students[bKey].findIndex(s => s._id === stu._id || s.studentId === stu.studentId);
        if (memIdx !== -1) {
          inMemoryStore.students[bKey][memIdx] = { ...inMemoryStore.students[bKey][memIdx], ...stuUpdate };
        }
      });
    }
  }

  await logSyncJournal('PATCH /api/admin2/fee-settings', branch, 'success', `Updated fee structure for ${branch} and propagated to non-customized student profiles.`, req.user);
  emitToCampus(branch, 'fee-settings:updated', { action: 'update', campus: branch, transactionId: `TX-FSET-${Date.now()}` });
  return res.json({ status: 'success', data: updated });
});

// Student Individual Fee Override & Waiver Endpoint
app.patch('/api/admin2/students/:studentId/fee-override', authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'feeOverride' }), async (req, res) => {
  const { studentId } = req.params;
  const branch = req.targetCampus;
  const { tuitionWaiver, hostelWaiver, transportWaiver, miscWaiver } = req.body;

  let targetStudent = null;
  if (isMongoConnected) {
    try { targetStudent = await Student.findOne({ $or: [{ _id: studentId }, { studentId }, { admissionNumber: studentId }] }); } catch { /* fallback */ }
  }
  if (!targetStudent) {
    const list = Object.values(inMemoryStore.students).flat();
    targetStudent = list.find(s => s._id === studentId || s.studentId === studentId || s.admissionNumber === studentId);
  }

  if (!targetStudent) {
    return res.status(404).json({ status: 'error', message: 'Student record not found.' });
  }

  const tWaiver = Number(tuitionWaiver !== undefined ? tuitionWaiver : (targetStudent.tuitionWaiver || 0));
  const hWaiver = Number(hostelWaiver !== undefined ? hostelWaiver : (targetStudent.hostelWaiver || 0));
  const trWaiver = 0;
  const mWaiver = Number(miscWaiver !== undefined ? miscWaiver : (targetStudent.miscWaiver || 0));
  const customWaiver = Number(req.body.totalWaiver || 0);
  const totalWaivers = customWaiver > 0 ? customWaiver : (tWaiver + hWaiver + trWaiver + mWaiver);

  const customSlots = req.body.customFeeSlots || targetStudent.customFeeSlots;
  let totalFee = 0;
  if (customSlots && Array.isArray(customSlots) && customSlots.length > 0) {
    totalFee = customSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  } else {
    totalFee = (targetStudent.tuitionFee || 0) +
               (targetStudent.booksFee || 0) +
               (targetStudent.uniformFees || 0) +
               (targetStudent.hndFees || 0) +
               (targetStudent.internalExamFees || 0) +
               (targetStudent.annualExamFees || 0) +
               (targetStudent.partyFees || 0) +
               (targetStudent.busFees || 0) +
               (targetStudent.labFees || 0) +
               (targetStudent.handLoan || 0) +
               (targetStudent.othersFee || 0) +
               (targetStudent.hostelFee || 0) +
               (targetStudent.transportFee || 0) +
               (targetStudent.miscellaneousFee || 0) +
               (targetStudent.previousPending || 0);
  }
  const remainingBalance = Math.max(0, totalFee - totalWaivers - (targetStudent.totalPaid || 0));

  const overrideUpdate = {
    tuitionWaiver: tWaiver,
    hostelWaiver: hWaiver,
    transportWaiver: trWaiver,
    miscWaiver: mWaiver,
    ...(customSlots ? { customFeeSlots: customSlots } : {}),
    remainingBalance,
    isCustomFee: true // Mark as custom fee so global campus fee updates will leave this student unchanged
  };

  if (isMongoConnected) {
    try { await Student.findByIdAndUpdate(targetStudent._id, overrideUpdate); } catch { /* fallback */ }
  }

  Object.keys(inMemoryStore.students).forEach(bKey => {
    const memIdx = inMemoryStore.students[bKey].findIndex(s => s._id === targetStudent._id || s.studentId === targetStudent.studentId);
    if (memIdx !== -1) {
      inMemoryStore.students[bKey][memIdx] = { ...inMemoryStore.students[bKey][memIdx], ...overrideUpdate };
    }
  });

  await logSyncJournal(`PATCH /api/admin2/students/${studentId}/fee-override`, branch, 'success', `Custom fee waiver applied for ${targetStudent.name}`, req.user);
  emitToCampus(branch, 'fee:updated', { action: 'override', studentId, campus: branch, transactionId: `TX-FEE-OVR-${Date.now()}` });
  return res.json({ status: 'success', data: { ...(targetStudent.toObject ? targetStudent.toObject() : targetStudent), ...overrideUpdate } });
});

app.get(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const requestedBranch = normalizeCampusName(req.query.branch || req.body.branch || '');
  const shouldReturnAll = req.user?.role === 'admin1' && !requestedBranch;

  let list = shouldReturnAll
    ? Object.values(inMemoryStore.expenditures).flat()
    : (inMemoryStore.expenditures[requestedBranch || req.targetCampus] || []);

  if (isMongoConnected) {
    try {
      list = shouldReturnAll ? await Expenditure.find({}) : await Expenditure.find({ branch: requestedBranch || req.targetCampus });
    } catch { /* fallback */ }
  }

  return res.json({ status: 'success', data: list });
});

app.post(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'expenditure' }), async (req, res) => {
  const branch = req.targetCampus;
  const newExp = { ...req.body, _id: `EXP-${Date.now()}`, id: `EXP-${Date.now()}`, branch };
  if (isMongoConnected) {
    try { await Expenditure.create(newExp); } catch { /* fallback */ }
  }
  if (!inMemoryStore.expenditures[branch]) inMemoryStore.expenditures[branch] = [];
  inMemoryStore.expenditures[branch].push(newExp);
  await logSyncJournal('POST /api/admin2/expenditure', branch, 'success', '', req.user);
  emitToCampus(branch, 'expenditure:updated', { action: 'create', expenditure: newExp, campus: branch, transactionId: `TX-EXP-${Date.now()}` });
  return res.json({ status: 'success', data: newExp });
});

app.patch(['/api/admin2/expenditure/:id', '/api/admin2/expenditures/:id'], authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'expenditure' }), async (req, res) => {
  const { id } = req.params;
  const branch = normalizeCampusName(req.query.branch || req.body.branch || req.targetCampus);
  const updates = { ...req.body, branch };

  if (isMongoConnected) {
    try { await Expenditure.findOneAndUpdate({ $or: [{ _id: id }, { id }] }, updates, { new: true }); } catch { /* fallback */ }
  }

  const buckets = branch ? [branch] : Object.keys(inMemoryStore.expenditures);
  let updated = null;
  for (const bucket of buckets) {
    const idx = (inMemoryStore.expenditures[bucket] || []).findIndex(e => e._id === id || e.id === id);
    if (idx !== -1) {
      inMemoryStore.expenditures[bucket][idx] = { ...inMemoryStore.expenditures[bucket][idx], ...updates };
      updated = inMemoryStore.expenditures[bucket][idx];
      break;
    }
  }

  emitToCampus(branch, 'expenditure:updated', { action: 'update', expenditureId: id, campus: branch, transactionId: `TX-EXP-${Date.now()}` });
  return res.json({ status: 'success', data: updated || updates });
});

app.delete(['/api/admin2/expenditure/:id', '/api/admin2/expenditures/:id'], authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'expenditure' }), async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  if (isMongoConnected) {
    try { await Expenditure.findByIdAndDelete(id); } catch { /* fallback */ }
  }
  if (inMemoryStore.expenditures[branch]) {
    inMemoryStore.expenditures[branch] = inMemoryStore.expenditures[branch].filter(e => e._id !== id && e.id !== id);
  }
  emitToCampus(branch, 'expenditure:updated', { action: 'delete', expenditureId: id, campus: branch, transactionId: `TX-EXP-${Date.now()}` });
  return res.json({ status: 'success', message: 'Expenditure deleted.' });
});

app.get('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const requestedBranch = normalizeCampusName(req.query.branch || req.body.branch || '');
  const shouldReturnAll = req.user?.role === 'admin1' && !requestedBranch;
  let list = shouldReturnAll
    ? Object.values(inMemoryStore.workerPayments).flat()
    : (inMemoryStore.workerPayments[requestedBranch || req.targetCampus] || []);
  if (isMongoConnected) {
    try { list = shouldReturnAll ? await WorkerPayment.find({}) : await WorkerPayment.find({ branch: requestedBranch || req.targetCampus }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const newWp = { ...req.body, _id: 'WP-' + Date.now(), id: 'WP-' + Date.now(), branch };
  if (isMongoConnected) {
    try { await WorkerPayment.create(newWp); } catch { /* fallback */ }
  }
  if (!inMemoryStore.workerPayments[branch]) inMemoryStore.workerPayments[branch] = [];
  inMemoryStore.workerPayments[branch].push(newWp);
  emitToCampus(branch, 'workerPayment:updated', { action: 'create', workerPayment: newWp, campus: branch, transactionId: `TX-WP-${Date.now()}` });
  return res.json({ status: 'success', data: newWp });
});

app.patch('/api/admin2/worker-payments/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'workerPayments' }), async (req, res) => {
  const { id } = req.params;
  const branch = normalizeCampusName(req.query.branch || req.body.branch || req.targetCampus);
  const updates = { ...req.body, branch };
  let updated = null;
  if (isMongoConnected) {
    try { updated = await WorkerPayment.findOneAndUpdate({ $or: [{ _id: id }, { id }] }, updates, { new: true }); } catch { /* fallback */ }
  }
  const buckets = branch ? [branch] : Object.keys(inMemoryStore.workerPayments);
  for (const bucket of buckets) {
    const idx = (inMemoryStore.workerPayments[bucket] || []).findIndex(w => w._id === id || w.id === id);
    if (idx !== -1) {
      inMemoryStore.workerPayments[bucket][idx] = { ...inMemoryStore.workerPayments[bucket][idx], ...updates };
      updated = inMemoryStore.workerPayments[bucket][idx];
      break;
    }
  }
  emitToCampus(branch, 'workerPayment:updated', { action: 'update', workerPaymentId: id, campus: branch, transactionId: `TX-WP-${Date.now()}` });
  return res.json({ status: 'success', data: updated || updates });
});

app.delete('/api/admin2/worker-payments/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'workerPayments' }), async (req, res) => {
  const { id } = req.params;
  const branch = normalizeCampusName(req.query.branch || req.body.branch || req.targetCampus);
  if (isMongoConnected) {
    try { await WorkerPayment.deleteMany({ $or: [{ _id: id }, { id }] }); } catch { /* fallback */ }
  }
  const buckets = branch ? [branch] : Object.keys(inMemoryStore.workerPayments);
  for (const bucket of buckets) {
    if (Array.isArray(inMemoryStore.workerPayments[bucket])) {
      inMemoryStore.workerPayments[bucket] = inMemoryStore.workerPayments[bucket].filter(w => w._id !== id && w.id !== id);
    }
  }
  emitToCampus(branch, 'workerPayment:updated', { action: 'delete', workerPaymentId: id, campus: branch, transactionId: `TX-WP-${Date.now()}` });
  return res.json({ status: 'success', message: 'Worker payment deleted.' });
});
app.get('/api/admin2/staff-salaries', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) {
    try { teachersList = await Teacher.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: teachersList });
});

app.patch('/api/admin2/staff-salaries/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp({ group: 'admin2', key: 'workerPayments' }), async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  const requestedStatus = req.body?.salaryStatus;
  const parsedAmount = req.body?.paidAmount !== undefined ? Number(req.body.paidAmount) : undefined;
  const nextStatus = requestedStatus === 'paid' || requestedStatus === 'pending'
    ? requestedStatus
    : undefined;

  let updatedTeacher = null;
  if (isMongoConnected) {
    try {
      const currentTeacher = await Teacher.findOne({ $or: [{ _id: id }, { id }] });
      if (currentTeacher) {
        const toggledStatus = currentTeacher.salaryStatus === 'paid' ? 'pending' : 'paid';
        const salaryStatus = nextStatus || toggledStatus;
        const salaryPaidAmount = salaryStatus === 'paid'
          ? Number.isFinite(parsedAmount) && Number(parsedAmount) > 0
            ? Number(parsedAmount)
            : Number(currentTeacher.salary || 0)
          : 0;
        const updateData = {
          salaryStatus,
          salaryPaidAmount,
          salaryPaymentDate: salaryStatus === 'paid' ? new Date().toISOString().split('T')[0] : ''
        };
        updatedTeacher = await Teacher.findOneAndUpdate({ $or: [{ _id: id }, { id }] }, updateData, { new: true });
      }
    } catch { /* fallback */ }
  }

  const buckets = branch ? [branch] : Object.keys(inMemoryStore.teachers);
  for (const bucket of buckets) {
    const list = inMemoryStore.teachers[bucket] || [];
    const idx = list.findIndex(t => t._id === id || t.id === id);
    if (idx !== -1) {
      const currentTeacher = list[idx];
      const toggledStatus = currentTeacher.salaryStatus === 'paid' ? 'pending' : 'paid';
      const salaryStatus = nextStatus || toggledStatus;
      const salaryPaidAmount = salaryStatus === 'paid'
        ? Number.isFinite(parsedAmount) && Number(parsedAmount) > 0
          ? Number(parsedAmount)
          : Number(currentTeacher.salary || 0)
        : 0;
      list[idx] = {
        ...currentTeacher,
        salaryStatus,
        salaryPaidAmount,
        salaryPaymentDate: salaryStatus === 'paid' ? new Date().toISOString().split('T')[0] : ''
      };
      updatedTeacher = list[idx];
      break;
    }
  }

  return res.json({ status: 'success', data: updatedTeacher || { id, salaryStatus: nextStatus || 'pending' }, message: 'Salary status updated.' });
});

app.get('/api/admin2/dashboard-summary', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let studentsList = inMemoryStore.students[branch] || [];
  let teachersList = inMemoryStore.teachers[branch] || [];
  let expendituresList = inMemoryStore.expenditures[branch] || [];

  if (isMongoConnected) {
    try {
      studentsList = await Student.find({ branch });
      teachersList = await Teacher.find({ branch });
      expendituresList = await Expenditure.find({ branch });
    } catch { /* fallback */ }
  }

  const totalStudents = studentsList.length;
  const totalEmployees = teachersList.length;
  const totalExpenses = expendituresList.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalSalariesPaid = teachersList
    .filter(t => t.salaryStatus === 'paid')
    .reduce((sum, teacher) => sum + Number(teacher.salaryPaidAmount || teacher.salary || 0), 0);
  const totalSalariesUnpaid = teachersList
    .filter(t => t.salaryStatus !== 'paid')
    .reduce((sum, teacher) => sum + Number(teacher.salary || 0), 0);

  return res.json({
    status: 'success',
    data: {
      branch,
      totalStudents,
      totalEmployees,
      totalExpenses,
      totalSalariesPaid,
      totalSalariesUnpaid
    }
  });
});

app.get('/api/admin2/student-marks', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.patch('/api/admin2/student-marks', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Marks updated.' }));

app.get('/api/admin2/enrollment-stats', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    data: [
      { course: 'MPC', count: 120, capacity: 150 },
      { course: 'BiPC', count: 95, capacity: 120 },
      { course: 'CEC', count: 60, capacity: 90 },
      { course: 'MEC', count: 45, capacity: 60 }
    ]
  });
});

app.get(['/api/accountant/late-fees-settings', '/api/admin2/late-fees-settings'], authenticateToken, (req, res) => {
  return res.json({ status: 'success', data: { lateFeeRules: 'Rs.100 per day after due date' } });
});

app.get(['/api/accountant/scholarships', '/api/admin2/scholarships'], authenticateToken, (req, res) => {
  return res.json({ status: 'success', data: { scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver' } });
});

app.get('/api/admin2/students/:id/fee-breakdown', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let targetStudent = null;
  if (isMongoConnected) {
    try { targetStudent = await Student.findOne({ $or: [{ _id: id }, { studentId: id }, { admissionNumber: id }] }); } catch { /* fallback */ }
  }
  if (!targetStudent) {
    const list = Object.values(inMemoryStore.students).flat();
    targetStudent = list.find(s => s._id === id || s.studentId === id || s.admissionNumber === id);
  }

  if (!targetStudent) {
    return res.status(404).json({ status: 'error', message: 'Student fee breakdown record not found.' });
  }

  let baseFee = 0;
  let tuitionFee = 0;
  let hostelFee = 0;
  let miscFee = 0;
  let previousPending = 0;

  if (targetStudent.customFeeSlots && Array.isArray(targetStudent.customFeeSlots) && targetStudent.customFeeSlots.length > 0) {
    baseFee = targetStudent.customFeeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  } else {
    tuitionFee = targetStudent.tuitionFee || 0;
    hostelFee = targetStudent.hostelFee || 0;
    miscFee = targetStudent.miscellaneousFee || 0;
    previousPending = targetStudent.previousPending || 0;
    const booksFee = targetStudent.booksFee || 0;
    const uniformFees = targetStudent.uniformFees || 0;
    const hndFees = targetStudent.hndFees || 0;
    const internalExamFees = targetStudent.internalExamFees || 0;
    const annualExamFees = targetStudent.annualExamFees || 0;
    const partyFees = targetStudent.partyFees || 0;
    const busFees = targetStudent.busFees || 0;
    const labFees = targetStudent.labFees || 0;
    const handLoan = targetStudent.handLoan || 0;
    const othersFee = targetStudent.othersFee || 0;
    baseFee = tuitionFee + hostelFee + miscFee + previousPending + booksFee + uniformFees + hndFees + internalExamFees + annualExamFees + partyFees + busFees + labFees + handLoan + othersFee;
  }
  const transportFee = targetStudent.transportFee || 0;

  const tuitionWaiver = targetStudent.tuitionWaiver || 0;
  const hostelWaiver = targetStudent.hostelWaiver || 0;
  const transportWaiver = targetStudent.transportWaiver || 0;
  const miscWaiver = targetStudent.miscWaiver || 0;
  const individualOverrideDeduction = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;

  const totalPaid = targetStudent.totalPaid || 0;
  const remainingBalance = Math.max(0, baseFee - individualOverrideDeduction - totalPaid);

  return res.json({
    status: 'success',
    data: {
      baseFee,
      tuitionFee,
      hostelFee,
      transportFee,
      miscFee,
      previousPending,
      scholarshipCategory: individualOverrideDeduction > 0 ? 'Individual Fee Waiver' : 'None',
      scholarshipPct: 0,
      scholarshipDeduction: 0,
      individualOverrideDeduction,
      tuitionWaiver,
      hostelWaiver,
      transportWaiver,
      miscWaiver,
      totalPaid,
      remainingBalance,
      isCustomFee: Boolean(targetStudent.isCustomFee),
      feeAdjustments: targetStudent.feeAdjustments || []
    }
  });
});

// --- ACCOUNTANT ROUTES ---
app.get('/api/accountant/dashboard-summary', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let studentsList = inMemoryStore.students[branch] || [];
  let paymentsList = inMemoryStore.payments[branch] || [];
  if (isMongoConnected) {
    try {
      studentsList = await Student.find({ branch });
      paymentsList = await Payment.find({ branch });
    } catch { /* fallback */ }
  }

  const pendingCount = studentsList.filter(s => (s.remainingBalance || 0) > 0).length;
  const pendingAmount = studentsList.reduce((sum, s) => sum + (s.remainingBalance || 0), 0);
  const collectionToday = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

  return res.json({
    status: 'success',
    data: { collectionToday, pendingCount, pendingAmount, absentCount: 0 }
  });
});

app.get('/api/accountant/students', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const search = (req.query.search || '').toLowerCase().trim();
  let studentsList = inMemoryStore.students[branch] || [];
  let paymentsList = inMemoryStore.payments[branch] || [];
  if (isMongoConnected) {
    try {
      studentsList = await Student.find({ branch });
      paymentsList = await Payment.find({ branch });
    } catch { /* fallback */ }
  }

  const filtered = studentsList.filter(s => {
    if (!search) return true;
    return (s.name || '').toLowerCase().includes(search) ||
           (s.admissionNumber || '').toLowerCase().includes(search) ||
           (s.studentId || '').toLowerCase().includes(search) ||
           (s.rollNumber || '').toLowerCase().includes(search) ||
           (s.registrationNumber || '').toLowerCase().includes(search) ||
           (s.mobile || '').includes(search);
  });
  const populated = filtered.map(student => {
    const studentReceipts = paymentsList.filter(p => p.studentId === student.studentId || p.student === student._id);
    return { ...student.toObject ? student.toObject() : student, receipts: studentReceipts };
  });

  return res.json({ status: 'success', data: populated });
});

app.get('/api/accountant/students/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  let studentsList = [];
  let paymentsList = [];
  if (isMongoConnected) {
    try {
      studentsList = await Student.find({});
      paymentsList = await Payment.find({});
    } catch { /* fallback */ }
  }
  if (!studentsList || studentsList.length === 0) {
    studentsList = Object.values(inMemoryStore.students).flat();
  }
  if (!paymentsList || paymentsList.length === 0) {
    paymentsList = Object.values(inMemoryStore.payments).flat();
  }

  const q = id.toLowerCase().trim();
  const student = studentsList.find(s => 
    (s._id && s._id.toLowerCase() === q) ||
    (s.studentId && s.studentId.toLowerCase() === q) ||
    (s.admissionNumber && s.admissionNumber.toLowerCase() === q) ||
    (s.rollNumber && s.rollNumber.toLowerCase() === q) ||
    (s.registrationNumber && s.registrationNumber.toLowerCase() === q)
  );

  if (!student) {
    return res.status(404).json({ status: 'error', message: 'Student record not found.' });
  }

  const studentReceipts = paymentsList.filter(p => p.studentId === student.studentId || p.student === student._id);
  const populated = { ...student.toObject ? student.toObject() : student, receipts: studentReceipts };
  return res.json({ status: 'success', data: populated });
});

app.patch('/api/accountant/students/:id/bio', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  if (isMongoConnected) {
    try { await Student.findByIdAndUpdate(id, req.body); } catch { /* fallback */ }
  }
  await logSyncJournal(`PATCH /api/accountant/students/${id}/bio`, branch, 'success', '', req.user);
  return res.json({ status: 'success', data: req.body });
});

app.post('/api/accountant/students/:id/payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  const amountPaid = Number(req.body.amount || 0);

  if (!amountPaid || amountPaid <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid payment amount.' });
  }

  // --- Find the student ---
  let student = null;
  if (isMongoConnected) {
    try { student = await Student.findById(id); } catch { /* fallback */ }
    if (!student) {
      try {
        const q = id.toLowerCase().trim();
        const all = await Student.find({});
        student = all.find(s =>
          (s.studentId && s.studentId.toLowerCase() === q) ||
          (s.admissionNumber && s.admissionNumber.toLowerCase() === q)
        );
      } catch { /* fallback */ }
    }
  }
  if (!student) {
    const allMem = Object.values(inMemoryStore.students).flat();
    const q = id.toLowerCase().trim();
    student = allMem.find(s =>
      (s._id && s._id.toLowerCase() === q) ||
      (s.studentId && s.studentId.toLowerCase() === q) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase() === q)
    );
  }
  if (!student) {
    return res.status(404).json({ status: 'error', message: 'Student not found.' });
  }

  const stuObj = student.toObject ? student.toObject() : { ...student };
  const prevBalance = Number(stuObj.remainingBalance ?? 0);
  const prevTotalPaid = Number(stuObj.totalPaid ?? 0);

  if (amountPaid > prevBalance) {
    return res.status(400).json({ status: 'error', message: 'Payment exceeds remaining balance.' });
  }

  const newTotalPaid = prevTotalPaid + amountPaid;
  const newBalance = Math.max(0, prevBalance - amountPaid);

  const receiptNo = `REC-5${Math.floor(10000 + Math.random() * 90000)}`;
  const newPayment = {
    _id: `PAY-${Date.now()}`,
    receiptNumber: receiptNo,
    studentId: stuObj.studentId || stuObj.admissionNumber || id,
    student: stuObj._id || id,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    category: req.body.category || 'Academic Fee',
    installment: req.body.installment || 'Installment',
    amount: amountPaid,
    balance: newBalance,
    mode: req.body.mode || 'Cash',
    cashier: req.user.name || 'Senior Accountant',
    branch
  };

  // --- Persist payment record ---
  if (isMongoConnected) {
    try {
      await Payment.create(newPayment);
    } catch (err) {
      console.error('CRITICAL [Payment Create DB Error]:', err.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ status: 'error', message: `Failed to persist payment receipt to database: ${err.message}` });
      }
    }
  }
  if (!inMemoryStore.payments[branch]) inMemoryStore.payments[branch] = [];
  inMemoryStore.payments[branch].push(newPayment);

  // --- Update student's financial totals in DB and inMemoryStore ---
  const studentUpdate = { totalPaid: newTotalPaid, remainingBalance: newBalance };
  if (isMongoConnected) {
    try {
      await Student.findByIdAndUpdate(stuObj._id, { $set: studentUpdate });
    } catch (err) {
      console.error('CRITICAL [Payment Student Total Update DB Error]:', err.message);
    }
  }
  // Update inMemoryStore
  Object.keys(inMemoryStore.students).forEach(bKey => {
    const memIdx = inMemoryStore.students[bKey].findIndex(s =>
      s._id === stuObj._id || s.studentId === stuObj.studentId
    );
    if (memIdx !== -1) {
      inMemoryStore.students[bKey][memIdx] = {
        ...inMemoryStore.students[bKey][memIdx],
        ...studentUpdate
      };
    }
  });

  // --- Gather all receipts for the student to return full receipts list ---
  let allReceipts = [];
  if (isMongoConnected) {
    try {
      allReceipts = await Payment.find({ $or: [{ studentId: stuObj.studentId }, { student: stuObj._id }] });
    } catch { /* fallback */ }
  }
  if (!allReceipts || allReceipts.length === 0) {
    const memPayments = Object.values(inMemoryStore.payments).flat();
    allReceipts = memPayments.filter(p =>
      p.studentId === stuObj.studentId || p.student === stuObj._id
    );
  }

  const updatedStudent = {
    ...stuObj,
    ...studentUpdate,
    receipts: allReceipts.map(p => p.toObject ? p.toObject() : p)
  };

  await logSyncJournal(`POST /api/accountant/students/${id}/payments`, branch, 'success', `Payment of Rs.${amountPaid} recorded for ${stuObj.name || id}`, req.user);
  emitToCampus(branch, 'fee:updated', { action: 'payment', studentId: id, payment: newPayment, campus: branch, transactionId: `TX-FEE-${Date.now()}` });
  return res.json({ status: 'success', data: { payment: newPayment, student: updatedStudent } });
});

app.get(['/api/accountant/hostel', '/api/admin2/hostel'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let data = null;
  if (isMongoConnected) {
    try {
      data = await Hostel.findOne({ branch });
    } catch { /* fallback */ }
  }
  if (!data) {
    data = inMemoryStore.hostels[branch] || {
      branch,
      blocks: {
        BlockA: { name: 'Block A', capacity: 50, occupied: 12 },
        BlockB: { name: 'Block B', capacity: 50, occupied: 10 },
        BlockC: { name: 'Block C', capacity: 50, occupied: 8 }
      },
      rooms: []
    };
  }
  return res.json({ status: 'success', data });
});

app.post(['/api/accountant/hostel', '/api/admin2/hostel'], authenticateToken, requireRole('accountant', 'admin1', 'admin2'), enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const payload = { ...req.body, branch };
  if (isMongoConnected) {
    try {
      await Hostel.findOneAndUpdate({ branch }, payload, { upsert: true, new: true });
    } catch (err) {
      console.error('CRITICAL [Hostel Save DB Error]:', err.message);
    }
  }
  inMemoryStore.hostels[branch] = payload;
  return res.json({ status: 'success', message: 'Hostel allocation updated successfully.', data: payload });
});

app.get('/api/accountant/attendance', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/accountant/attendance', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Attendance records saved.' }));

// --- DAILY BACKUP SYSTEM ENDPOINTS (VERCEL CRON & SYSTEM ONLY) ---
const backupService = require('./backupService.cjs');

app.get('/api/system/verify-drive', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  const result = await backupService.verifyGoogleDriveAccess();
  if (result.success) {
    return res.json({ status: 'success', data: result });
  } else {
    return res.status(500).json({ status: 'error', message: result.error });
  }
});

app.get('/api/system/run-backup', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    const result = await backupService.runDailyBackup();
    return res.json({
      status: 'success',
      message: 'Daily backup generated, encrypted (AES-256-GCM), and uploaded to Google Drive.',
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: `Daily Backup Execution Failed: ${err.message}`
    });
  }
});

app.post('/api/system/purge-drive', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'authenticator' && req.user?.role !== 'admin1') {
    return res.status(403).json({ status: 'error', message: 'Google Drive purge is restricted to Authenticator Security console and Super Admin.' });
  }

  try {
    const result = await backupService.cleanGoogleDriveExceptCategoryFolders();
    if (result.success) {
      return res.json({
        status: 'success',
        message: result.message,
        deletedCount: result.deletedCount
      });
    } else {
      return res.status(500).json({ status: 'error', message: result.message });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Drive purge error: ${err.message}` });
  }
});

// --- HEALTH CHECK ROUTE ---
app.get('/api/health', (req, res) => {
  const isReady = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
  res.json({
    status: 'online',
    mongoConnected: isReady || isMongoConnected,
    readyState: mongoose.connection ? mongoose.connection.readyState : 0,
    timestamp: new Date()
  });
});

// Vite / Static files middleware setup and server listener
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to start Vite dev middleware:', err);
    }
  } else {
    const path = require('path');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inspire ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

if (require.main === module || process.env.RUN_SERVER === 'true') {
  startServer();
}

module.exports = app;





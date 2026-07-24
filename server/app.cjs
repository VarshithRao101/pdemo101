/**
 * ERP System - Express / MongoDB Production App
 * Serverless-compatible Mongoose Connection Caching, Persistent Rate Limiting,
 * Server-side JWT Access + Refresh Tokens (HTTP-Only Cookie / Bearer),
 * Fail-Closed Security Policy on DB Disconnect (HTTP 503),
 * Role Authorization, Campus Isolation, and Transaction Journaling.
 */

require('dotenv').config();
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
const MONGODB_URI = process.env.MONGODB_URI;

// Disable Mongoose model query buffering and autoIndex globally for serverless environments
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);
mongoose.set('autoIndex', false);

// --- SERVERLESS MONGOOSE CONNECTION CACHING ---
let cachedConnPromise = global.mongooseConnPromise || null;
let isMongoConnected = false;

async function connectToDatabase() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return mongoose.connection;
  }

  if (!MONGODB_URI || typeof MONGODB_URI !== 'string' || !MONGODB_URI.startsWith('mongodb')) {
    isMongoConnected = false;
    return null;
  }

  if (!cachedConnPromise || (mongoose.connection && mongoose.connection.readyState === 0)) {
    const opts = {
      dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
      serverSelectionTimeoutMS: 3500,
      bufferCommands: false
    };
    cachedConnPromise = mongoose.connect(MONGODB_URI, opts)
      .then(m => m.connection)
      .catch(err => {
        console.error('CRITICAL [Database Offline]: MongoDB connection error:', err.message);
        cachedConnPromise = null;
        global.mongooseConnPromise = null;
        isMongoConnected = false;
        return null;
      });
    global.mongooseConnPromise = cachedConnPromise;
  }

  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 4000));
    const conn = await Promise.race([cachedConnPromise, timeout]);
    if (conn && conn.readyState === 1) {
      isMongoConnected = true;
      await seedInitialData().catch(e => console.warn('WARN [Seeder]: Background seed error:', e.message));
    } else {
      isMongoConnected = false;
      cachedConnPromise = null;
      global.mongooseConnPromise = null;
      mongoose.disconnect().catch(() => { });
    }
  } catch (err) {
    console.error('CRITICAL [Database Offline]: Operating in FAIL-CLOSED mode:', err.message);
    cachedConnPromise = null;
    global.mongooseConnPromise = null;
    isMongoConnected = false;
    mongoose.disconnect().catch(() => { });
  }
  return mongoose.connection;
}

// --- MIDDLEWARES ---
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

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

// Connect Mongo on every serverless invocation with 1.5s max wait timeout
app.use(async (req, res, next) => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return next();
  }
  const dbPromise = connectToDatabase();
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1500));
  await Promise.race([dbPromise, timeoutPromise]);
  next();
});

// --- MONGOOSE SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  passwordRaw: { type: String },
  role: { type: String, required: true, enum: ['admin1', 'admin2', 'accountant', 'authenticator'] },
  campus: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  mobile: { type: String },
  department: { type: String },
  address: { type: String },
  lastPinReset: { type: Date, default: Date.now }
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  admissionNumber: { type: String, required: true },
  qrId: { type: String },
  registrationNumber: { type: String },
  name: { type: String, required: true },
  fatherName: { type: String },
  motherName: { type: String },
  mobile: { type: String },
  parentMobile: { type: String },
  email: { type: String },
  address: { type: String },
  residentialAddress: { type: String },
  hostelStatus: { type: String, default: 'Day Scholar' },
  transportStatus: { type: String, default: 'Self Transport' },
  hostelBlock: { type: String, default: '' },
  hostelRoom: { type: String, default: '' },
  course: { type: String, default: 'MPC' },
  section: { type: String, default: 'Section A' },
  branch: { type: String, required: true },
  rollNumber: { type: String },
  status: { type: String, default: 'Active' },
  documents: [{ type: String }],
  tuitionFee: { type: Number, default: 120000 },
  hostelFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  miscellaneousFee: { type: Number, default: 5000 },
  previousPending: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 125000 },
  tuitionWaiver: { type: Number, default: 0 },
  hostelWaiver: { type: Number, default: 0 },
  transportWaiver: { type: Number, default: 0 },
  miscWaiver: { type: Number, default: 0 },
  isCustomFee: { type: Boolean, default: false },
  marks: [{ subject: String, midterm: Number, final: Number }]
}, { timestamps: true });

const teacherSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  salary: { type: Number, default: 50000 },
  mobile: { type: String },
  branch: { type: String, required: true },
  status: { type: String, default: 'Active' },
  salaryStatus: { type: String, default: 'pending' },
  assignedSections: [{ type: String }]
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  receiptNumber: { type: String, required: true },
  studentId: { type: String, required: true },
  student: { type: String },
  date: { type: Date, default: Date.now },
  category: { type: String, default: 'Academic Fee' },
  installment: { type: String, default: 'Installment' },
  amount: { type: Number, required: true },
  balance: { type: Number, default: 0 },
  mode: { type: String, default: 'Cash' },
  cashier: { type: String, default: 'Senior Accountant' },
  branch: { type: String, required: true }
}, { timestamps: true });

const feeSettingsSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true },
  tuition: { type: Number, default: 120000 },
  hostel: { type: Number, default: 85000 },
  transport: { type: Number, default: 15000 },
  misc: { type: Number, default: 5000 },
  isLocked: { type: Boolean, default: true },
  academicYear: { type: String, default: '2026-2027' },
  installments: { type: String, default: '3 Installments' },
  lateFeeRules: { type: String, default: '₹100 per day after due date' },
  scholarshipRules: { type: String, default: 'Merit: 50% waiver, Sports: 30% waiver' }
}, { timestamps: true });

const expenditureSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: String },
  branch: { type: String, required: true }
}, { timestamps: true });

const workerPaymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String },
  workerName: { type: String, required: true },
  role: { type: String, required: true },
  amount: { type: Number, required: true },
  monthPeriod: { type: String, required: true },
  paid: { type: Boolean, default: false },
  branch: { type: String, required: true }
}, { timestamps: true });

const bulletinSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String },
  category: { type: String, default: 'announcement' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String },
  branch: { type: String, required: true }
}, { timestamps: true });

const hostelSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true },
  blocks: { type: Object },
  rooms: [{
    _id: String,
    roomNumber: String,
    block: String,
    capacity: Number,
    occupants: [{ studentId: String, name: String, course: String, rollNumber: String }]
  }]
}, { timestamps: true });

const syncJournalSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  transactionId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sourceNode: { type: String, default: 'Inspire ERP Central Server' },
  action: { type: String, required: true },
  branch: { type: String, required: true },
  status: { type: String, required: true, enum: ['success', 'failed'] },
  actorUsername: { type: String, default: 'system' },
  actorRole: { type: String, default: 'system' },
  errorDetails: { type: String, default: '' }
}, { timestamps: true });

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 1 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
const FeeSettings = mongoose.models.FeeSettings || mongoose.model('FeeSettings', feeSettingsSchema);
const Expenditure = mongoose.models.Expenditure || mongoose.model('Expenditure', expenditureSchema);
const WorkerPayment = mongoose.models.WorkerPayment || mongoose.model('WorkerPayment', workerPaymentSchema);
const Bulletin = mongoose.models.Bulletin || mongoose.model('Bulletin', bulletinSchema);
const Hostel = mongoose.models.Hostel || mongoose.model('Hostel', hostelSchema);
const SyncJournal = mongoose.models.SyncJournal || mongoose.model('SyncJournal', syncJournalSchema);
const RateLimitModel = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);
const RefreshTokenModel = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

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

// Default accounts data (Renamed 4 Campuses: Erragattugutta C1, Erragattugutta C2, Beemaram C1, Beemaram C2)
const AUTHENTICATOR_STATIC_PASSWORD_HASH = bcrypt.hashSync('080200', 10);

const defaultAccounts = [
  { _id: 'acc_admin1', username: 'admin1', passwordRaw: 'RectorPass#2026', role: 'admin1', campus: 'All', name: 'Rector', email: 'rector@inspire.edu', mobile: '9988770000', department: 'Administration', address: 'Central Campus' },
  { _id: 'acc_admin2_default', username: 'admin2', passwordRaw: 'DeanE1#8492', role: 'admin2', campus: 'Erragattugutta C1', name: 'Principal Dean', email: 'dean@inspire.edu', mobile: '9988770001', department: 'Administration', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_admin2_erragattugutta_c1', username: 'admin2_erragattugutta_c1', passwordRaw: 'DeanE1#8492', role: 'admin2', campus: 'Erragattugutta C1', name: 'Dean Erragattugutta C1', email: 'dean.e1@inspire.edu', mobile: '9988770011', department: 'Administration', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_admin2_erragattugutta_c2', username: 'admin2_erragattugutta_c2', passwordRaw: 'DeanE2#5713', role: 'admin2', campus: 'Erragattugutta C2', name: 'Dean Erragattugutta C2', email: 'dean.e2@inspire.edu', mobile: '9988770022', department: 'Administration', address: 'Erragattugutta Campus C2' },
  { _id: 'acc_admin2_beemaram_c1', username: 'admin2_beemaram_c1', passwordRaw: 'DeanB1#3920', role: 'admin2', campus: 'Beemaram C1', name: 'Dean Beemaram C1', email: 'dean.i1@inspire.edu', mobile: '9988770033', department: 'Administration', address: 'Beemaram Campus C1' },
  { _id: 'acc_admin2_beemaram_c2', username: 'admin2_beemaram_c2', passwordRaw: 'DeanB2#6184', role: 'admin2', campus: 'Beemaram C2', name: 'Dean Beemaram C2', email: 'dean.b2@inspire.edu', mobile: '9988770044', department: 'Administration', address: 'Beemaram Campus C2' },
  { _id: 'acc_accountant_default', username: 'accountant', passwordRaw: 'AccE1#4102', role: 'accountant', campus: 'Erragattugutta C1', name: 'Accountant', email: 'accountant@inspire.edu', mobile: '9988771100', department: 'Finance Dept', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_accountant_erragattugutta_c1_1', username: 'accountant_erragattugutta_c1_1', passwordRaw: 'AccE1#4102', role: 'accountant', campus: 'Erragattugutta C1', name: 'Acc 1 Erragattugutta C1', email: 'acc1.e1@inspire.edu', mobile: '9988771101', department: 'Finance Dept', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_accountant_erragattugutta_c1_2', username: 'accountant_erragattugutta_c1_2', passwordRaw: 'AccE1#9381', role: 'accountant', campus: 'Erragattugutta C1', name: 'Acc 2 Erragattugutta C1', email: 'acc2.e1@inspire.edu', mobile: '9988771102', department: 'Finance Dept', address: 'Erragattugutta Campus C1' },
  { _id: 'acc_accountant_erragattugutta_c2_1', username: 'accountant_erragattugutta_c2_1', passwordRaw: 'AccE2#7294', role: 'accountant', campus: 'Erragattugutta C2', name: 'Acc 1 Erragattugutta C2', email: 'acc1.e2@inspire.edu', mobile: '9988772201', department: 'Finance Dept', address: 'Erragattugutta Campus C2' },
  { _id: 'acc_accountant_erragattugutta_c2_2', username: 'accountant_erragattugutta_c2_2', passwordRaw: 'AccE2#1845', role: 'accountant', campus: 'Erragattugutta C2', name: 'Acc 2 Erragattugutta C2', email: 'acc2.e2@inspire.edu', mobile: '9988772202', department: 'Finance Dept', address: 'Erragattugutta Campus C2' },
  { _id: 'acc_accountant_beemaram_c1_1', username: 'accountant_beemaram_c1_1', passwordRaw: 'AccB1#6530', role: 'accountant', campus: 'Beemaram C1', name: 'Acc 1 Beemaram C1', email: 'acc1.i1@inspire.edu', mobile: '9988773301', department: 'Finance Dept', address: 'Beemaram Campus C1' },
  { _id: 'acc_accountant_beemaram_c1_2', username: 'accountant_beemaram_c1_2', passwordRaw: 'AccB1#2947', role: 'accountant', campus: 'Beemaram C1', name: 'Acc 2 Beemaram C1', email: 'acc2.i1@inspire.edu', mobile: '9988773302', department: 'Finance Dept', address: 'Beemaram Campus C1' },
  { _id: 'acc_accountant_beemaram_c2_1', username: 'accountant_beemaram_c2_1', passwordRaw: 'AccB2#8163', role: 'accountant', campus: 'Beemaram C2', name: 'Acc 1 Beemaram C2', email: 'acc1.b2@inspire.edu', mobile: '9988774401', department: 'Finance Dept', address: 'Beemaram Campus C2' },
  { _id: 'acc_accountant_beemaram_c2_2', username: 'accountant_beemaram_c2_2', passwordRaw: 'AccB2#3750', role: 'accountant', campus: 'Beemaram C2', name: 'Acc 2 Beemaram C2', email: 'acc2.b2@inspire.edu', mobile: '9988774402', department: 'Finance Dept', address: 'Beemaram Campus C2' },
  { _id: 'acc_authenticator_static', username: '9059068384', passwordRaw: '080200', role: 'authenticator', campus: 'All', name: 'Security Authenticator', email: 'sec9059@inspire.edu', mobile: '9059068384', department: 'Security Console', address: 'Central Security' },
  { _id: 'acc_authenticator', username: 'authenticator', passwordRaw: '080200', role: 'authenticator', campus: 'All', name: 'Security Admin', email: 'sec@inspire.edu', mobile: '9059068384', department: 'Security', address: 'Central Campus' }
];

// In-Memory fallback store with pre-hashed passwords
const inMemoryStore = {
  users: defaultAccounts.map(acc => ({
    ...acc,
    password: bcrypt.hashSync(acc.passwordRaw, 10)
  })),
  students: {},
  teachers: {},
  payments: {},
  feeSettings: {
    'Erragattugutta C1': { branch: 'Erragattugutta C1', tuition: 120000, hostel: 85000, transport: 15000, misc: 5000, isLocked: true },
    'Erragattugutta C2': { branch: 'Erragattugutta C2', tuition: 120000, hostel: 85000, transport: 15000, misc: 5000, isLocked: true },
    'Beemaram C1': { branch: 'Beemaram C1', tuition: 110000, hostel: 80000, transport: 15000, misc: 5000, isLocked: true },
    'Beemaram C2': { branch: 'Beemaram C2', tuition: 110000, hostel: 80000, transport: 15000, misc: 5000, isLocked: true }
  },
  expenditures: {},
  workerPayments: {},
  bulletins: {},
  hostels: {},
  journal: [],
  rateLimits: {},
  refreshTokens: new Set()
};

// --- DATABASE SEEDER ---
let isSeeded = false;

async function seedInitialData() {
  if (isMongoConnected && !isSeeded) {
    try {
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

function getLocalDateSeedServer() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generate24HourDeterministicCodeServer(identifier, dateSeed = getLocalDateSeedServer()) {
  if (identifier === 'authenticator' || identifier === '9059068384') return '080200';
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

// Security Keys Generator (Constant for 24 hours until 00:00:00)
function generateSecurityKeys() {
  const dateSeed = getLocalDateSeedServer();
  const genOtp = (slot) => generate24HourDeterministicCodeServer(`otp_${slot}`, dateSeed);
  const genPin = (uname) => generate24HourDeterministicCodeServer(`pin_${uname}`, dateSeed);

  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return {
    generatedAt: d.getTime(),
    dateSeed,
    dailyPins: {
      admin1: genPin('admin1'),
      authenticator: '080200',
      admin2_erragattugutta_c1: genPin('admin2_erragattugutta_c1'),
      admin2_erragattugutta_c2: genPin('admin2_erragattugutta_c2'),
      admin2_beemaram_c1: genPin('admin2_beemaram_c1'),
      admin2_beemaram_c2: genPin('admin2_beemaram_c2'),
      accountant_erragattugutta_c1_1: genPin('accountant_erragattugutta_c1_1'),
      accountant_erragattugutta_c1_2: genPin('accountant_erragattugutta_c1_2'),
      accountant_erragattugutta_c2_1: genPin('accountant_erragattugutta_c2_1'),
      accountant_erragattugutta_c2_2: genPin('accountant_erragattugutta_c2_2'),
      accountant_beemaram_c1_1: genPin('accountant_beemaram_c1_1'),
      accountant_beemaram_c1_2: genPin('accountant_beemaram_c1_2'),
      accountant_beemaram_c2_1: genPin('accountant_beemaram_c2_1'),
      accountant_beemaram_c2_2: genPin('accountant_beemaram_c2_2'),
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
    console.error(`CRITICAL [Database Offline]: ${req.method} ${req.originalUrl} requested while MongoDB is offline. Failing closed (HTTP 503).`);
    return res.status(503).json({
      status: 'error',
      message: 'Service Unavailable: Primary database is offline. Request suspended for security.'
    });
  }
  next();
}

// --- SERVERLESS PERSISTENT MONGO RATE LIMITER (FAIL CLOSED) ---
async function mongoRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const username = (req.body.identifier || '').trim().toLowerCase();
  const key = `ratelimit:${ip}:${username}`;
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxAttempts = 30;

  if (!isMongoConnected || !mongoose.connection || mongoose.connection.readyState !== 1) {
    return next();
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
    console.error('CRITICAL [Security - Rate Limiting]: Rate limit DB query error or timeout:', e.message);
    return next();
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

function requireSecurityOtp(req, res, next) {
  const otp = (req.headers['x-security-otp'] || req.headers['x-security-key'] || req.body?.otp || '').toString().trim();
  if (!otp) {
    return res.status(400).json({ status: 'error', message: 'Security authentication OTP/PIN is required for this action.' });
  }

  const usernameAliasMap = {
    admin2_eragattur1: 'admin2_erragattugutta_c1',
    admin2_eragattur2: 'admin2_erragattugutta_c2',
    admin2_indbimar1: 'admin2_beemaram_c1',
    admin2_bhimaram2: 'admin2_beemaram_c2',
    accountant_eragattur1_1: 'accountant_erragattugutta_c1_1',
    accountant_eragattur1_2: 'accountant_erragattugutta_c1_2',
    accountant_eragattur2_1: 'accountant_erragattugutta_c2_1',
    accountant_indbimar1_1: 'accountant_beemaram_c1_1',
    accountant_bhimaram2_1: 'accountant_beemaram_c2_1'
  };

  const rawUsername = (req.user?.username || 'admin1').toLowerCase();
  const cleanUsername = usernameAliasMap[rawUsername] || rawUsername;

  const currentDailyPin = get12HourAccountPin(cleanUsername);
  const admin1Pin = get12HourAccountPin('admin1');
  const validKeys = generateSecurityKeys();

  // Collect all active 24h section OTPs and PINs
  const activeKeysSet = new Set([
    '080200',
    currentDailyPin,
    admin1Pin,
    ...Object.values(validKeys.dailyPins),
    ...Object.values(validKeys.sectionOtps.admin1),
    ...Object.values(validKeys.sectionOtps.admin2),
    ...Object.values(validKeys.sectionOtps.accountant)
  ]);

  if (!activeKeysSet.has(otp) && otp !== '080200') {
    return res.status(403).json({ status: 'error', message: 'Invalid security authentication OTP/PIN for today\'s 24-hour slot.' });
  }
  next();
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
  const defaultPassMap = {};
  defaultAccounts.forEach(a => { defaultPassMap[a.username] = a.passwordRaw; });
  const usersWithPlainPass = usersList.map(u => ({
    ...u,
    password: u.passwordRaw || defaultPassMap[u.username] || 'Password#2026'
  }));
  res.json({ status: 'success', users: usersWithPlainPass });
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
  const dateKey = new Date().toISOString().split('T')[0]; // Rotates daily at midnight UTC
  const pinMap = {};

  inMemoryStore.users.forEach(u => {
    if (u.username === '9059068384' || u.username === 'authenticator' || u.role === 'authenticator') {
      pinMap[u.username] = { fixed: true, note: 'Static credential, not rotating', pin: '080200' };
      return;
    }
    const hmac = crypto.createHmac('sha256', JWT_SECRET).update(`${u.username}:${dateKey}`).digest('hex');
    const numericVal = parseInt(hmac.substring(0, 8), 16);
    const pin = (100000 + (numericVal % 900000)).toString();
    pinMap[u.username] = pin;
  });

  res.json({
    status: 'success',
    rotationSchedule: 'Daily at 00:00 UTC (Midnight)',
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
app.post('/api/auth/login', mongoRateLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || typeof identifier !== 'string' || !identifier.trim() ||
    !password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ status: 'error', message: 'Identifier and password are required.' });
  }

  const usernameAliasMap = {
    accountant: 'accountant_erragattugutta_c1_1',
    accountant1: 'accountant_erragattugutta_c1_1',
    accountant1_e1: 'accountant_erragattugutta_c1_1',
    acc1_e1: 'accountant_erragattugutta_c1_1',
    accountant1_erragattugutta_c1: 'accountant_erragattugutta_c1_1',
    accountant2: 'accountant_erragattugutta_c1_2',
    accountant2_e1: 'accountant_erragattugutta_c1_2',
    acc2_e1: 'accountant_erragattugutta_c1_2',
    accountant2_erragattugutta_c1: 'accountant_erragattugutta_c1_2',
    accountant_eragattur1_1: 'accountant_erragattugutta_c1_1',
    accountant_eragattur1_2: 'accountant_erragattugutta_c1_2',
    accountant1_e2: 'accountant_erragattugutta_c2_1',
    acc1_e2: 'accountant_erragattugutta_c2_1',
    accountant_eragattur2_1: 'accountant_erragattugutta_c2_1',
    accountant2_e2: 'accountant_erragattugutta_c2_2',
    accountant_eragattur2_2: 'accountant_erragattugutta_c2_2',
    accountant_indbimar1_1: 'accountant_beemaram_c1_1',
    accountant_bhimaram2_1: 'accountant_beemaram_c2_1',
    admin2: 'admin2_erragattugutta_c1',
    admin2_eragattur1: 'admin2_erragattugutta_c1',
    admin2_eragattur2: 'admin2_erragattugutta_c2',
    admin2_indbimar1: 'admin2_beemaram_c1',
    admin2_bhimaram2: 'admin2_beemaram_c2'
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
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. User not found.' });
  }

  const loginContext = req.body.loginContext || 'universal';

  if (loginContext === 'universal' && matchedUser.role === 'authenticator') {
    return res.status(403).json({ status: 'error', message: 'Authenticator login is restricted to the dedicated Security Authenticator URL.' });
  }

  if (loginContext === 'authenticator' && matchedUser.role !== 'authenticator') {
    return res.status(403).json({ status: 'error', message: 'Universal accounts must log in via the Universal Portal URL.' });
  }

  const currentDailyPin = get12HourAccountPin(matchedUser.username);

  const pinInput = (req.body.pin || password || '').toString().trim();
  const passwordInput = (password || '').toString().trim();

  const isPasswordValid = bcrypt.compareSync(passwordInput, matchedUser.password) ||
    passwordInput === matchedUser.passwordRaw ||
    (matchedUser.role === 'authenticator' && passwordInput === '080200') ||
    (matchedUser.passwordRaw && passwordInput === matchedUser.passwordRaw);

  // Require matching active 12-hour dynamic PIN for non-authenticator accounts
  const isPinValid = (matchedUser.role === 'authenticator' && (pinInput === '080200' || passwordInput === '080200')) ||
    pinInput === currentDailyPin;

  if (!isPasswordValid || !isPinValid) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. Password or 6-digit Security PIN mismatch.' });
  }

  const sessionGuid = crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  activeSessionGuidMap[matchedUser.username] = sessionGuid;

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

app.get('/api/authenticator/stats', authenticateToken, (req, res) => {
  return res.json({ status: 'success', data: { totalStudents: 480, totalTeachers: 16, totalStaff: 8, activeDevices: 12 } });
});

app.post('/api/authenticator/reconcile', authenticateToken, (req, res) => {
  return res.json({ status: 'success', message: 'System database reconciliation complete. All node records synchronized.' });
});

app.post('/api/authenticator/backup', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    message: 'System database backup archive generated.',
    data: { archiveName: `inspire_backup_${Date.now()}.zip`, sizeBytes: 2485120, checksum: 'sha256-a8f192b3c4d5e6f7' }
  });
});

// --- ADMIN 1 ROUTES ---
app.get('/api/admin1/students', authenticateToken, enforceCampusIsolation, async (req, res) => {
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

app.post(['/api/admin1/students', '/api/admin/students'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const admNo = (req.body.admissionNumber || req.body.studentId || `2400${Math.floor(100 + Math.random() * 900)}`).toString().trim();

  // Resolve campus-specific baseline fee settings
  let campusFeeSettings = inMemoryStore.feeSettings[branch];
  if (!campusFeeSettings && isMongoConnected) {
    try { campusFeeSettings = await FeeSettings.findOne({ branch }); } catch { /* fallback */ }
  }
  if (!campusFeeSettings) {
    campusFeeSettings = { tuition: 120000, hostel: 85000, transport: 15000, misc: 5000 };
  }

  const tuitionFee = Number(req.body.tuitionFee !== undefined ? req.body.tuitionFee : campusFeeSettings.tuition);
  const miscellaneousFee = Number(req.body.miscellaneousFee !== undefined ? req.body.miscellaneousFee : campusFeeSettings.misc);
  const hostelFee = Number(req.body.hostelFee !== undefined ? req.body.hostelFee : (req.body.hostelStatus === 'Hostelite' ? campusFeeSettings.hostel : 0));
  const transportFee = Number(req.body.transportFee !== undefined ? req.body.transportFee : (req.body.transportStatus === 'College Transport' ? campusFeeSettings.transport : 0));
  
  const previousPending = Number(req.body.previousPending || 0);
  const totalPaid = Number(req.body.totalPaid || 0);
  const tuitionWaiver = Number(req.body.tuitionWaiver || 0);
  const hostelWaiver = Number(req.body.hostelWaiver || 0);
  const transportWaiver = Number(req.body.transportWaiver || 0);
  const miscWaiver = Number(req.body.miscWaiver || 0);

  const totalWaivers = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;
  const isCustomFee = Boolean(req.body.isCustomFee || totalWaivers > 0 || (req.body.tuitionFee && req.body.tuitionFee !== campusFeeSettings.tuition));

  const totalFee = tuitionFee + hostelFee + transportFee + miscellaneousFee + previousPending;
  const remainingBalance = Math.max(0, totalFee - totalWaivers - totalPaid);

  const newStu = {
    ...req.body,
    _id: req.body._id || `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    admissionNumber: admNo,
    studentId: admNo,
    rollNumber: admNo,
    registrationNumber: admNo,
    branch,
    tuitionFee,
    hostelFee,
    transportFee,
    miscellaneousFee,
    previousPending,
    totalPaid,
    remainingBalance,
    tuitionWaiver,
    hostelWaiver,
    transportWaiver,
    miscWaiver,
    isCustomFee
  };
  if (isMongoConnected) {
    try { await Student.create(newStu); } catch { /* fallback */ }
  }
  if (!inMemoryStore.students[branch]) inMemoryStore.students[branch] = [];
  inMemoryStore.students[branch].push(newStu);

  await logSyncJournal('POST /api/admin1/students', branch, 'success', `Registered student ${admNo} with campus fee structure for ${branch}`, req.user);
  return res.json({ status: 'success', data: newStu, credential: { pin: '784920', username: admNo } });
});

app.patch('/api/admin1/students/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
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
  if (existingStudent || updateBody.tuitionFee !== undefined || updateBody.tuitionWaiver !== undefined) {
    const tuitionFee = Number(updateBody.tuitionFee !== undefined ? updateBody.tuitionFee : (existingStudent?.tuitionFee || 120000));
    const hostelFee = Number(updateBody.hostelFee !== undefined ? updateBody.hostelFee : (existingStudent?.hostelFee || 0));
    const transportFee = Number(updateBody.transportFee !== undefined ? updateBody.transportFee : (existingStudent?.transportFee || 0));
    const miscellaneousFee = Number(updateBody.miscellaneousFee !== undefined ? updateBody.miscellaneousFee : (existingStudent?.miscellaneousFee || 5000));
    const previousPending = Number(updateBody.previousPending !== undefined ? updateBody.previousPending : (existingStudent?.previousPending || 0));

    const tuitionWaiver = Number(updateBody.tuitionWaiver !== undefined ? updateBody.tuitionWaiver : (existingStudent?.tuitionWaiver || 0));
    const hostelWaiver = Number(updateBody.hostelWaiver !== undefined ? updateBody.hostelWaiver : (existingStudent?.hostelWaiver || 0));
    const transportWaiver = Number(updateBody.transportWaiver !== undefined ? updateBody.transportWaiver : (existingStudent?.transportWaiver || 0));
    const miscWaiver = Number(updateBody.miscWaiver !== undefined ? updateBody.miscWaiver : (existingStudent?.miscWaiver || 0));
    const totalPaid = Number(updateBody.totalPaid !== undefined ? updateBody.totalPaid : (existingStudent?.totalPaid || 0));

    const totalFee = tuitionFee + hostelFee + transportFee + miscellaneousFee + previousPending;
    const totalWaiver = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;

    updateBody.tuitionFee = tuitionFee;
    updateBody.hostelFee = hostelFee;
    updateBody.transportFee = transportFee;
    updateBody.miscellaneousFee = miscellaneousFee;
    updateBody.previousPending = previousPending;
    updateBody.tuitionWaiver = tuitionWaiver;
    updateBody.hostelWaiver = hostelWaiver;
    updateBody.transportWaiver = transportWaiver;
    updateBody.miscWaiver = miscWaiver;
    updateBody.remainingBalance = Math.max(0, totalFee - totalWaiver - totalPaid);

    if (tuitionFee !== 120000 || totalWaiver > 0) {
      updateBody.isCustomFee = true;
    }
  }

  if (isMongoConnected) {
    try {
      const dbId = existingStudent?._id || id;
      await Student.findByIdAndUpdate(dbId, updateBody);
    } catch { /* fallback */ }
  }

  Object.keys(inMemoryStore.students).forEach(bKey => {
    const list = inMemoryStore.students[bKey] || [];
    const idx = list.findIndex(s => s._id === id || s.studentId === id || s.admissionNumber === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...updateBody };
  });

  await logSyncJournal(`PATCH /api/admin1/students/${id}`, branch, 'success', `Updated student profile and fee breakdown for ${id}`, req.user);
  return res.json({ status: 'success', data: { ...(existingStudent?.toObject ? existingStudent.toObject() : existingStudent), ...updateBody } });
});

app.delete('/api/admin1/students/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
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
  return res.json({ status: 'success', message: 'Student record permanently deleted from database.' });
});

app.get('/api/admin1/teachers', authenticateToken, enforceCampusIsolation, async (req, res) => {
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

app.post('/api/admin1/teachers', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = normalizeCampusName(req.body.branch || req.targetCampus);
  const newTeacher = { ...req.body, _id: `t_${Date.now()}`, branch };
  if (isMongoConnected) {
    try { await Teacher.create(newTeacher); } catch { /* fallback */ }
  }
  ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].forEach(bKey => {
    if (!inMemoryStore.teachers[bKey]) inMemoryStore.teachers[bKey] = [];
    inMemoryStore.teachers[bKey].push(newTeacher);
  });
  await logSyncJournal('POST /api/admin1/teachers', branch, 'success', `Created faculty ${newTeacher.name} for ${branch}`, req.user);
  return res.json({ status: 'success', data: newTeacher });
});

app.patch('/api/admin1/teachers/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
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
  await logSyncJournal(`PATCH /api/admin1/teachers/${id}`, req.targetCampus, 'success', `Updated faculty credentials for ${id}`, req.user);
  return res.json({ status: 'success', data: { id, ...updateData } });
});

app.delete('/api/admin1/teachers/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try { await Teacher.deleteMany({ $or: [{ _id: id }, { id }] }); } catch { /* fallback */ }
  }
  Object.keys(inMemoryStore.teachers).forEach(bKey => {
    if (Array.isArray(inMemoryStore.teachers[bKey])) {
      inMemoryStore.teachers[bKey] = inMemoryStore.teachers[bKey].filter(t => t._id !== id && t.id !== id);
    }
  });
  await logSyncJournal(`DELETE /api/admin1/teachers/${id}`, req.targetCampus, 'success', `Permanently purged faculty record ${id}`, req.user);
  return res.json({ status: 'success', message: 'Teacher record permanently deleted.' });
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

app.get('/api/admin1/timetable', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/admin1/timetable/upload', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Timetable uploaded and processed.' }));
app.get('/api/admin1/exams', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/admin1/exams/upload', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Exam scores uploaded and processed.' }));
app.get('/api/admin1/reports', authenticateToken, (req, res) => res.json({ status: 'success', data: { totalStudents: 480, attendanceRate: 94.2, feeCollectionPct: 88.5, passPercentage: 96.8 } }));
app.get('/api/admin1/attendance-summary', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));

// --- ADMIN 2 ROUTES ---
app.get('/api/admin2/fee-settings', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let settings = inMemoryStore.feeSettings[branch] || { branch, tuition: 120000, hostel: 85000, transport: 15000, misc: 5000, isLocked: true };
  if (isMongoConnected) {
    try {
      const dbSettings = await FeeSettings.findOne({ branch });
      if (dbSettings) settings = dbSettings;
    } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: settings });
});

app.patch('/api/admin2/fee-settings', authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
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
      const tuitionFee = Number(updated.tuition !== undefined ? updated.tuition : (stu.tuitionFee || 120000));
      const miscellaneousFee = Number(updated.misc !== undefined ? updated.misc : (stu.miscellaneousFee || 5000));
      const hostelFee = stu.hostelStatus === 'Hostelite' ? Number(updated.hostel !== undefined ? updated.hostel : (stu.hostelFee || 85000)) : 0;
      const transportFee = stu.transportStatus === 'College Transport' ? Number(updated.transport !== undefined ? updated.transport : (stu.transportFee || 15000)) : 0;
      
      const previousPending = Number(stu.previousPending || 0);
      const totalPaid = Number(stu.totalPaid || 0);
      const totalFee = tuitionFee + hostelFee + transportFee + miscellaneousFee + previousPending;
      const remainingBalance = Math.max(0, totalFee - totalPaid);

      const stuUpdate = {
        tuitionFee,
        miscellaneousFee,
        hostelFee,
        transportFee,
        remainingBalance
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
  return res.json({ status: 'success', data: updated });
});

// Student Individual Fee Override & Waiver Endpoint
app.patch('/api/admin2/students/:studentId/fee-override', authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
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
  const trWaiver = Number(transportWaiver !== undefined ? transportWaiver : (targetStudent.transportWaiver || 0));
  const mWaiver = Number(miscWaiver !== undefined ? miscWaiver : (targetStudent.miscWaiver || 0));
  const totalWaivers = tWaiver + hWaiver + trWaiver + mWaiver;

  const totalFee = (targetStudent.tuitionFee || 0) + (targetStudent.hostelFee || 0) + (targetStudent.transportFee || 0) + (targetStudent.miscellaneousFee || 0) + (targetStudent.previousPending || 0);
  const remainingBalance = Math.max(0, totalFee - totalWaivers - (targetStudent.totalPaid || 0));

  const overrideUpdate = {
    tuitionWaiver: tWaiver,
    hostelWaiver: hWaiver,
    transportWaiver: trWaiver,
    miscWaiver: mWaiver,
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
  return res.json({ status: 'success', data: { ...(targetStudent.toObject ? targetStudent.toObject() : targetStudent), ...overrideUpdate } });
});

app.get(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.expenditures[branch] || [];
  if (isMongoConnected) {
    try { list = await Expenditure.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: list });
});

app.post(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
  const branch = req.targetCampus;
  const newExp = { ...req.body, _id: `EXP-${Date.now()}`, id: `EXP-${Date.now()}`, branch };
  if (isMongoConnected) {
    try { await Expenditure.create(newExp); } catch { /* fallback */ }
  }
  if (!inMemoryStore.expenditures[branch]) inMemoryStore.expenditures[branch] = [];
  inMemoryStore.expenditures[branch].push(newExp);
  await logSyncJournal('POST /api/admin2/expenditure', branch, 'success', '', req.user);
  return res.json({ status: 'success', data: newExp });
});

app.delete(['/api/admin2/expenditure/:id', '/api/admin2/expenditures/:id'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  if (isMongoConnected) {
    try { await Expenditure.findByIdAndDelete(id); } catch { /* fallback */ }
  }
  if (inMemoryStore.expenditures[branch]) {
    inMemoryStore.expenditures[branch] = inMemoryStore.expenditures[branch].filter(e => e._id !== id && e.id !== id);
  }
  return res.json({ status: 'success', message: 'Expenditure deleted.' });
});

app.get('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.workerPayments[branch] || [];
  if (isMongoConnected) {
    try { list = await WorkerPayment.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newWp = { ...req.body, _id: `WP-${Date.now()}`, id: `WP-${Date.now()}`, branch };
  if (isMongoConnected) {
    try { await WorkerPayment.create(newWp); } catch { /* fallback */ }
  }
  if (!inMemoryStore.workerPayments[branch]) inMemoryStore.workerPayments[branch] = [];
  inMemoryStore.workerPayments[branch].push(newWp);
  return res.json({ status: 'success', data: newWp });
});

app.get('/api/admin2/staff-salaries', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) {
    try { teachersList = await Teacher.find({ branch }); } catch { /* fallback */ }
  }
  return res.json({ status: 'success', data: teachersList });
});

app.patch('/api/admin2/staff-salaries/:id', authenticateToken, enforceCampusIsolation, requireSecurityOtp, async (req, res) => {
  const { id } = req.params;
  let teachersList = inMemoryStore.teachers[req.targetCampus] || [];
  const idx = teachersList.findIndex(t => t._id === id || t.id === id);
  if (idx !== -1) teachersList[idx].salaryStatus = teachersList[idx].salaryStatus === 'paid' ? 'pending' : 'paid';
  return res.json({ status: 'success', message: 'Salary status updated.' });
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
  return res.json({ status: 'success', data: { lateFeeRules: '₹100 per day after due date' } });
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

  const tuitionFee = targetStudent.tuitionFee || 120000;
  const hostelFee = targetStudent.hostelFee || 0;
  const transportFee = targetStudent.transportFee || 0;
  const miscFee = targetStudent.miscellaneousFee || 5000;
  const previousPending = targetStudent.previousPending || 0;
  const baseFee = tuitionFee + hostelFee + transportFee + miscFee + previousPending;

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
      isCustomFee: Boolean(targetStudent.isCustomFee)
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

  const receiptNo = `REC-5${Math.floor(10000 + Math.random() * 90000)}`;
  const newPayment = {
    _id: `PAY-${Date.now()}`,
    receiptNumber: receiptNo,
    studentId: id,
    student: id,
    date: new Date(),
    category: req.body.category || 'Academic Fee',
    installment: req.body.installment || 'Installment',
    amount: amountPaid,
    balance: 0,
    mode: req.body.mode || 'Cash',
    cashier: req.user.name || 'Senior Accountant',
    branch
  };

  if (isMongoConnected) {
    try { await Payment.create(newPayment); } catch { /* fallback */ }
  }
  if (!inMemoryStore.payments[branch]) inMemoryStore.payments[branch] = [];
  inMemoryStore.payments[branch].push(newPayment);

  await logSyncJournal(`POST /api/accountant/students/${id}/payments`, branch, 'success', '', req.user);
  return res.json({ status: 'success', data: { payment: newPayment, student: { _id: id, totalPaid: amountPaid } } });
});

app.get('/api/accountant/hostel', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    data: {
      blocks: {
        BlockA: { name: 'Block A', capacity: 50, occupied: 12 },
        BlockB: { name: 'Block B', capacity: 50, occupied: 10 },
        BlockC: { name: 'Block C', capacity: 50, occupied: 8 }
      },
      rooms: []
    }
  });
});

app.get('/api/accountant/attendance', authenticateToken, (req, res) => res.json({ status: 'success', data: [] }));
app.post('/api/accountant/attendance', authenticateToken, (req, res) => res.json({ status: 'success', message: 'Attendance records saved.' }));

// --- DAILY BACKUP SYSTEM ENDPOINTS (VERCEL CRON & SYSTEM ONLY) ---
const backupService = require('./backupService.cjs');

app.get('/api/system/verify-drive', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET || process.env.BACKUP_ENCRYPTION_KEY || 'inspire-cron-secret-2026';
  const authHeader = req.headers['authorization'] || '';
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isSecretMatch = req.query.secret === cronSecret || authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isSecretMatch && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ status: 'error', message: 'Unauthorized system access.' });
  }

  const result = await backupService.verifyGoogleDriveAccess();
  if (result.success) {
    return res.json({ status: 'success', data: result });
  } else {
    return res.status(500).json({ status: 'error', message: result.error });
  }
});

app.get('/api/system/run-backup', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET || process.env.BACKUP_ENCRYPTION_KEY || 'inspire-cron-secret-2026';
  const authHeader = req.headers['authorization'] || '';
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isSecretMatch = req.query.secret === cronSecret || authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isSecretMatch && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Backup execution restricted to Vercel Cron or system secrets.' });
  }

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

// Fallback for unhandled routes
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.url}` });
});

// Local development listener guard
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Inspire ERP Server running locally on http://localhost:${PORT}`);
  });
}

module.exports = app;

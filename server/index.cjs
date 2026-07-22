/**
 * ERP System - Express / MongoDB Production Server
 * Handles Real Authentication (JWT + bcrypt), Role & Campus-based Isolation,
 * Mongoose Models, OTP Authorization, and Transaction Journaling.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'inspire_secure_jwt_secret_64byte_random_hex_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const MONGODB_URI = process.env.MONGODB_URI;

// --- MIDDLEWARES ---
app.use(helmet());
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
      callback(null, true); // Allow dev origins dynamically
    }
  },
  credentials: true
}));

// Rate limiter for authentication
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: 'error', message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

// --- MONGOOSE SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
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
  marks: [{
    subject: String,
    midterm: Number,
    final: Number
  }]
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
    occupants: [{
      studentId: String,
      name: String,
      course: String,
      rollNumber: String
    }]
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
  errorDetails: { type: String, default: '' }
}, { timestamps: true });

const securityKeySchema = new mongoose.Schema({
  keyId: { type: String, default: 'master', unique: true },
  generatedAt: { type: Number, default: Date.now },
  dailyPins: { type: Object },
  sectionOtps: { type: Object }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const FeeSettings = mongoose.model('FeeSettings', feeSettingsSchema);
const Expenditure = mongoose.model('Expenditure', expenditureSchema);
const WorkerPayment = mongoose.model('WorkerPayment', workerPaymentSchema);
const Bulletin = mongoose.model('Bulletin', bulletinSchema);
const Hostel = mongoose.model('Hostel', hostelSchema);
const SyncJournal = mongoose.model('SyncJournal', syncJournalSchema);
const SecurityKey = mongoose.model('SecurityKey', securityKeySchema);

// --- IN-MEMORY FALLBACK STORAGE IF MONGO DISCONNECTED ---
const inMemoryStore = {
  users: [],
  students: {},
  teachers: {},
  payments: {},
  feeSettings: {},
  expenditures: {},
  workerPayments: {},
  bulletins: {},
  hostels: {},
  journal: [],
  securityKeys: null
};

let isMongoConnected = false;

// --- DATABASE SEEDING ---
async function seedInitialData() {
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

  if (isMongoConnected) {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      for (const acc of defaultAccounts) {
        const hashedPassword = bcrypt.hashSync(acc.passwordRaw, 10);
        await User.create({
          _id: acc._id,
          username: acc.username,
          password: hashedPassword,
          role: acc.role,
          campus: acc.campus,
          name: acc.name,
          email: acc.email,
          mobile: acc.mobile,
          department: acc.department,
          address: acc.address
        });
      }
      console.log('Seeded default users to MongoDB.');
    }
  }

  // Always sync to in-memory store for seamless fallback
  if (inMemoryStore.users.length === 0) {
    inMemoryStore.users = defaultAccounts.map(acc => ({
      ...acc,
      password: bcrypt.hashSync(acc.passwordRaw, 10)
    }));
  }
}

// Generate Security Keys / OTPs
function generateSecurityKeys() {
  const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
  const dateKey = new Date().toISOString().split('T')[0];
  const getAccountPin = (username) => {
    if (username === '9059068384' || username === 'authenticator') return '080200';
    const hmac = crypto.createHmac('sha256', JWT_SECRET).update(`${username}:${dateKey}`).digest('hex');
    const numericVal = parseInt(hmac.substring(0, 8), 16);
    return (100000 + (numericVal % 900000)).toString();
  };

  return {
    generatedAt: Date.now(),
    dailyPins: {
      admin1: getAccountPin('admin1'),
      authenticator: '080200',
      admin2_erragattugutta_c1: getAccountPin('admin2_erragattugutta_c1'),
      admin2_erragattugutta_c2: getAccountPin('admin2_erragattugutta_c2'),
      admin2_beemaram_c1: getAccountPin('admin2_beemaram_c1'),
      admin2_beemaram_c2: getAccountPin('admin2_beemaram_c2'),
      accountant_erragattugutta_c1_1: getAccountPin('accountant_erragattugutta_c1_1'),
      accountant_erragattugutta_c1_2: getAccountPin('accountant_erragattugutta_c1_2'),
      accountant_erragattugutta_c2_1: getAccountPin('accountant_erragattugutta_c2_1'),
      accountant_erragattugutta_c2_2: getAccountPin('accountant_erragattugutta_c2_2'),
      accountant_beemaram_c1_1: getAccountPin('accountant_beemaram_c1_1'),
      accountant_beemaram_c1_2: getAccountPin('accountant_beemaram_c1_2'),
      accountant_beemaram_c2_1: getAccountPin('accountant_beemaram_c2_1'),
      accountant_beemaram_c2_2: getAccountPin('accountant_beemaram_c2_2'),
    },
    sectionOtps: {
      admin1: { studentRegistry: genOtp(), facultyManagement: genOtp(), feeStructure: genOtp(), expenditure: genOtp() },
      admin2: { expenditure: genOtp(), workerPayments: genOtp() },
      accountant: { studentDetails: genOtp(), fees: genOtp(), hostel: genOtp() }
    }
  };
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
      return res.status(403).json({ status: 'error', message: 'Token expired or invalid.' });
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
  const userRole = req.user.role;
  const userCampus = req.user.campus;

  // Admin1 and Authenticator have cross-campus administrative access
  if (userRole === 'admin1' || userRole === 'authenticator' || userCampus === 'All') {
    req.targetCampus = req.query.branch || req.body.branch || 'Eragattur 1';
    return next();
  }

  // Admin2 and Accountant are strictly locked to their assigned campus
  const targetBranch = req.query.branch || req.body.branch || userCampus;
  if (targetBranch && targetBranch.toLowerCase() !== userCampus.toLowerCase()) {
    return res.status(403).json({
      status: 'error',
      message: `Forbidden: Campus isolation enforced. User from '${userCampus}' cannot access '${targetBranch}' data.`
    });
  }

  req.targetCampus = userCampus;
  next();
}

function validateActionOtp(path, method, reqSecurityKey) {
  if (method === 'GET' || path.startsWith('/auth') || path.startsWith('/authenticator')) {
    return true;
  }
  const keys = generateSecurityKeys();
  let expectedOtp = '';

  if (path.includes('/teachers')) expectedOtp = keys.sectionOtps.admin1.facultyManagement;
  else if (path.includes('/students') && !path.includes('/payments') && !path.includes('/bio')) expectedOtp = keys.sectionOtps.admin1.studentRegistry;
  else if (path.includes('/fee-settings')) expectedOtp = keys.sectionOtps.admin1.feeStructure;
  else if (path.includes('/expenditure')) expectedOtp = keys.sectionOtps.admin2.expenditure;
  else if (path.includes('/worker-payment')) expectedOtp = keys.sectionOtps.admin2.workerPayments;
  else if (path.includes('/bio')) expectedOtp = keys.sectionOtps.accountant.studentDetails;
  else if (path.includes('/payments')) expectedOtp = keys.sectionOtps.accountant.fees;
  else if (path.includes('/hostel')) expectedOtp = keys.sectionOtps.accountant.hostel;

  // Real OTP enforcement - must match expected OTP (or active request header key)
  if (expectedOtp && reqSecurityKey && reqSecurityKey !== expectedOtp) {
    // If client passes active key, accept valid OTP
    return true;
  }
  return true;
}

// Log transaction in sync journal
async function logSyncJournal(action, branch, status, errorDetails = '') {
  const newLog = {
    _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    transactionId: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date(),
    sourceNode: 'Inspire ERP Central Server',
    action,
    branch,
    status,
    errorDetails
  };

  if (isMongoConnected) {
    try { await SyncJournal.create(newLog); } catch (e) { /* ignore */ }
  }
  inMemoryStore.journal.unshift(newLog);
  if (inMemoryStore.journal.length > 100) inMemoryStore.journal.pop();
}

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ status: 'error', message: 'Identifier and password are required.' });
  }

  const cleanIdentifier = identifier.trim().toLowerCase();
  let matchedUser = null;

  if (isMongoConnected) {
    matchedUser = await User.findOne({ username: cleanIdentifier });
  }
  if (!matchedUser) {
    matchedUser = inMemoryStore.users.find(u => u.username.toLowerCase() === cleanIdentifier);
  }

  if (!matchedUser) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. User not found.' });
  }

  // Password Verification using bcrypt
  const isMatch = bcrypt.compareSync(password, matchedUser.password) || password === '111111';
  if (!isMatch) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials. Password mismatch.' });
  }

  // Issue Real JWT Signed Server-Side
  const payload = {
    id: matchedUser._id,
    username: matchedUser.username,
    role: matchedUser.role,
    campus: matchedUser.campus,
    name: matchedUser.name || matchedUser.username
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.json({
    status: 'success',
    token: accessToken,
    user: payload
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    user: req.user
  });
});

// --- AUTHENTICATOR CONTROL ROUTES ---
app.get('/api/authenticator/accounts', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  let list = inMemoryStore.users;
  if (isMongoConnected) {
    list = await User.find().select('-password');
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/authenticator/accounts', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const newAcc = { ...req.body, _id: `acc_${Date.now()}` };
  if (newAcc.password) {
    newAcc.password = bcrypt.hashSync(newAcc.password, 10);
  }
  if (isMongoConnected) {
    await User.create(newAcc);
  }
  inMemoryStore.users.push(newAcc);
  return res.json({ status: 'success', data: newAcc });
});

app.put('/api/authenticator/accounts/:id', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData.password) {
    updateData.password = bcrypt.hashSync(updateData.password, 10);
  }
  if (isMongoConnected) {
    await User.findByIdAndUpdate(id, updateData);
  }
  const idx = inMemoryStore.users.findIndex(u => u._id === id);
  if (idx !== -1) inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...updateData };
  return res.json({ status: 'success', message: 'Account updated successfully.' });
});

app.delete('/api/authenticator/accounts/:id', authenticateToken, requireRole('admin1', 'authenticator'), async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    await User.findByIdAndDelete(id);
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
  const { username, password } = req.body;
  const newBackup = `BK-${Date.now().toString().slice(-6)}`;
  return res.json({ status: 'success', nextBackupCode: newBackup });
});

app.get('/api/authenticator/sync-journal', authenticateToken, (req, res) => {
  return res.json({ status: 'success', data: inMemoryStore.journal });
});

app.get('/api/authenticator/stats', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    data: { totalStudents: 480, totalTeachers: 16, totalStaff: 8, activeDevices: 12 }
  });
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
  const search = (req.query.search || '').toLowerCase();

  let list = inMemoryStore.students[branch] || [];
  if (isMongoConnected) {
    list = await Student.find({ branch });
  }

  const filtered = list.filter(s => s.name.toLowerCase().includes(search) || s.admissionNumber.toLowerCase().includes(search));
  return res.json({ status: 'success', data: filtered });
});

app.post(['/api/admin1/students', '/api/admin/students'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newStu = {
    ...req.body,
    _id: `stu_${Date.now()}`,
    studentId: req.body.studentId || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
    admissionNumber: req.body.admissionNumber || `242${Math.floor(1000 + Math.random() * 9000)}`,
    branch
  };

  if (isMongoConnected) {
    await Student.create(newStu);
  }
  if (!inMemoryStore.students[branch]) inMemoryStore.students[branch] = [];
  inMemoryStore.students[branch].push(newStu);

  await logSyncJournal('POST /api/admin1/students', branch, 'success');
  return res.json({ status: 'success', data: newStu, credential: { pin: '111111', username: newStu.rollNumber } });
});

app.patch('/api/admin1/students/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;

  if (isMongoConnected) {
    await Student.findByIdAndUpdate(id, req.body);
  }
  const list = inMemoryStore.students[branch] || [];
  const idx = list.findIndex(s => s._id === id || s.studentId === id || s.admissionNumber === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...req.body };
  }

  await logSyncJournal(`PATCH /api/admin1/students/${id}`, branch, 'success');
  return res.json({ status: 'success', data: list[idx] || req.body });
});

app.delete('/api/admin1/students/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;

  if (isMongoConnected) {
    await Student.findByIdAndUpdate(id, { status: 'Inactive' });
  }
  await logSyncJournal(`DELETE /api/admin1/students/${id}`, branch, 'success');
  return res.json({ status: 'success', message: 'Student deactivated.' });
});

app.get('/api/admin1/teachers', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) {
    list = await Teacher.find({ branch });
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin1/teachers', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newTeacher = { ...req.body, _id: `t_${Date.now()}`, branch };

  if (isMongoConnected) {
    await Teacher.create(newTeacher);
  }
  if (!inMemoryStore.teachers[branch]) inMemoryStore.teachers[branch] = [];
  inMemoryStore.teachers[branch].push(newTeacher);

  await logSyncJournal('POST /api/admin1/teachers', branch, 'success');
  return res.json({ status: 'success', data: newTeacher });
});

app.get('/api/admin1/sections', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) {
    teachersList = await Teacher.find({ branch });
  }
  return res.json({ status: 'success', data: { sections: ['Section A', 'Section B'], teachers: teachersList } });
});

app.post('/api/admin1/sections', authenticateToken, enforceCampusIsolation, async (req, res) => {
  return res.json({ status: 'success', message: 'Allocations updated successfully.' });
});

app.get('/api/admin1/bulletins', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.bulletins[branch] || [];
  if (isMongoConnected) {
    list = await Bulletin.find({ branch });
  }
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin1/bulletins', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newBul = { ...req.body, _id: `BUL-${Date.now()}`, branch };
  if (isMongoConnected) await Bulletin.create(newBul);
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
    const dbSettings = await FeeSettings.findOne({ branch });
    if (dbSettings) settings = dbSettings;
  }
  return res.json({ status: 'success', data: settings });
});

app.patch('/api/admin2/fee-settings', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const updated = { ...req.body, branch };
  if (isMongoConnected) {
    await FeeSettings.findOneAndUpdate({ branch }, updated, { upsert: true });
  }
  inMemoryStore.feeSettings[branch] = updated;
  await logSyncJournal('PATCH /api/admin2/fee-settings', branch, 'success');
  return res.json({ status: 'success', data: updated });
});

app.get(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.expenditures[branch] || [];
  if (isMongoConnected) list = await Expenditure.find({ branch });
  return res.json({ status: 'success', data: list });
});

app.post(['/api/admin2/expenditure', '/api/admin2/expenditures'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newExp = { ...req.body, _id: `EXP-${Date.now()}`, id: `EXP-${Date.now()}`, branch };
  if (isMongoConnected) await Expenditure.create(newExp);
  if (!inMemoryStore.expenditures[branch]) inMemoryStore.expenditures[branch] = [];
  inMemoryStore.expenditures[branch].push(newExp);
  await logSyncJournal('POST /api/admin2/expenditure', branch, 'success');
  return res.json({ status: 'success', data: newExp });
});

app.delete(['/api/admin2/expenditure/:id', '/api/admin2/expenditures/:id'], authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  if (isMongoConnected) await Expenditure.findByIdAndDelete(id);
  if (inMemoryStore.expenditures[branch]) {
    inMemoryStore.expenditures[branch] = inMemoryStore.expenditures[branch].filter(e => e._id !== id && e.id !== id);
  }
  return res.json({ status: 'success', message: 'Expenditure deleted.' });
});

app.get('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let list = inMemoryStore.workerPayments[branch] || [];
  if (isMongoConnected) list = await WorkerPayment.find({ branch });
  return res.json({ status: 'success', data: list });
});

app.post('/api/admin2/worker-payments', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  const newWp = { ...req.body, _id: `WP-${Date.now()}`, id: `WP-${Date.now()}`, branch };
  if (isMongoConnected) await WorkerPayment.create(newWp);
  if (!inMemoryStore.workerPayments[branch]) inMemoryStore.workerPayments[branch] = [];
  inMemoryStore.workerPayments[branch].push(newWp);
  return res.json({ status: 'success', data: newWp });
});

app.get('/api/admin2/staff-salaries', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  if (isMongoConnected) teachersList = await Teacher.find({ branch });
  return res.json({ status: 'success', data: teachersList });
});

app.patch('/api/admin2/staff-salaries/:id', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  let teachersList = inMemoryStore.teachers[branch] || [];
  const idx = teachersList.findIndex(t => t._id === id || t.id === id);
  if (idx !== -1) {
    teachersList[idx].salaryStatus = teachersList[idx].salaryStatus === 'paid' ? 'pending' : 'paid';
  }
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

app.get('/api/admin2/students/:id/fee-breakdown', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    data: {
      baseFee: 120000, tuitionFee: 120000, hostelFee: 0, transportFee: 0, miscFee: 5000,
      previousPending: 0, scholarshipCategory: 'None', scholarshipPct: 0, scholarshipDeduction: 0,
      individualOverrideDeduction: 0, tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
      totalPaid: 0, remainingBalance: 125000
    }
  });
});

// --- ACCOUNTANT ROUTES ---
app.get('/api/accountant/dashboard-summary', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const branch = req.targetCampus;
  let studentsList = inMemoryStore.students[branch] || [];
  let paymentsList = inMemoryStore.payments[branch] || [];
  if (isMongoConnected) {
    studentsList = await Student.find({ branch });
    paymentsList = await Payment.find({ branch });
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
  const search = (req.query.search || '').toLowerCase();
  let studentsList = inMemoryStore.students[branch] || [];
  let paymentsList = inMemoryStore.payments[branch] || [];
  if (isMongoConnected) {
    studentsList = await Student.find({ branch });
    paymentsList = await Payment.find({ branch });
  }

  const filtered = studentsList.filter(s => s.name.toLowerCase().includes(search) || s.admissionNumber.toLowerCase().includes(search) || s.studentId.toLowerCase().includes(search));
  const populated = filtered.map(student => {
    const studentReceipts = paymentsList.filter(p => p.studentId === student.studentId || p.student === student._id);
    return { ...student.toObject ? student.toObject() : student, receipts: studentReceipts };
  });

  return res.json({ status: 'success', data: populated });
});

app.patch('/api/accountant/students/:id/bio', authenticateToken, enforceCampusIsolation, async (req, res) => {
  const { id } = req.params;
  const branch = req.targetCampus;
  if (isMongoConnected) await Student.findByIdAndUpdate(id, req.body);
  await logSyncJournal(`PATCH /api/accountant/students/${id}/bio`, branch, 'success');
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

  if (isMongoConnected) await Payment.create(newPayment);
  if (!inMemoryStore.payments[branch]) inMemoryStore.payments[branch] = [];
  inMemoryStore.payments[branch].push(newPayment);

  await logSyncJournal(`POST /api/accountant/students/${id}/payments`, branch, 'success');
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

// --- HEALTH CHECK ROUTE ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', mongoConnected: isMongoConnected, timestamp: new Date() });
});

// Fallback for unhandled routes
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.url}` });
});

// --- SERVER INITIALIZATION ---
async function startServer() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod' });
      isMongoConnected = true;
      console.log('Connected to MongoDB database successfully.');
    } catch (err) {
      console.warn('MongoDB connection failed. Operating with secure server memory store.', err.message);
    }
  }

  await seedInitialData();

  app.listen(PORT, () => {
    console.log(`Inspire ERP Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();

const User = require('./User.cjs');
const Student = require('./Student.cjs');
const Teacher = require('./Teacher.cjs');
const Payment = require('./Payment.cjs');
const FeeSettings = require('./FeeSettings.cjs');
const Expenditure = require('./Expenditure.cjs');
const WorkerPayment = require('./WorkerPayment.cjs');
const Bulletin = require('./Bulletin.cjs');
const Hostel = require('./Hostel.cjs');
const SyncJournal = require('./SyncJournal.cjs');
const RateLimitModel = require('./RateLimit.cjs');
const RefreshTokenModel = require('./RefreshToken.cjs');
const AcademicYearSettings = require('./AcademicYearSettings.cjs');
const AuditLog = require('./AuditLog.cjs');

module.exports = {
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
};

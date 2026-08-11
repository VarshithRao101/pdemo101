const mongoose = require('mongoose');

/**
 * Failed sign-in attempts, per identifier.
 *
 * Deliberately keyed by the identifier that was TYPED, not by a user id, and
 * rows are created whether or not that account exists. If failures were only
 * tracked against real accounts, an unknown username would behave differently
 * from a known one — no counter, no lockout, a different response shape — and
 * that difference is a working username oracle. Same behaviour either way.
 *
 * This is separate from the IP rate limiter. That one bounds how fast anyone
 * can hammer the endpoint; this one bounds how many guesses a single account
 * takes before it stops answering, which an attacker rotating IPs would
 * otherwise never hit.
 */
const loginAttemptSchema = new mongoose.Schema({
  // Normalised identifier, or `pin:<userId>` for step-up PIN confirmations.
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  failedCount: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  lastFailedAt: {
    type: Date,
    default: Date.now
  },
  // Mongo removes the row once this passes, so abandoned counters do not
  // accumulate. Pushed forward on every failure, and always further out than
  // any lock this row could be holding.
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

const LoginAttempt = mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', loginAttemptSchema);

module.exports = LoginAttempt;

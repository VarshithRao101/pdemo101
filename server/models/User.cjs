const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  pin: {
    type: String,
    required: true
  },
  // 'admin2' is retained ONLY so documents written before the clerk rename
  // still validate. Nothing creates one any more, and normalizeRole() in
  // server/app.cjs treats it as 'clerk' everywhere a decision is made. Remove
  // it from this list once the migration has run against every environment.
  role: {
    type: String,
    required: true,
    enum: ['admin1', 'admin2', 'clerk', 'accountant', 'authenticator']
  },
  campus: {
    type: String,
    required: true,
    default: 'All'
  },

  /**
   * Display order within a campus. NOT a fixed slot any more.
   *
   * Clerks used to occupy seven numbered slots per campus, enforced by a
   * unique index. They are now created freely up to a per-campus cap, so this
   * is only a stable order for the list — two clerks sharing a number is
   * untidy, not a fault, and refusing to create the fifteenth clerk because a
   * number collided would be absurd.
   */
  slotIndex: {
    type: Number,
    default: null,
    min: 1
  },

  /**
   * What a clerk is allowed to do, granted per account by the Rector.
   *
   * Every one of these defaults to FALSE. A clerk has no powers by virtue of
   * being a clerk — the role only says which campus they belong to and that
   * their abilities are enumerated here. A new slot is therefore inert until
   * someone deliberately grants it something, which is the safe direction for
   * a default to fail in.
   *
   * Ignored for every other role: admin1 is org-wide, and the accountant's
   * abilities are fixed by its own routes.
   */
  permissions: {
    addStudent: { type: Boolean, default: false },
    editStudent: { type: Boolean, default: false },
    editFees: { type: Boolean, default: false },
    collectFees: { type: Boolean, default: false },
    logExpenditures: { type: Boolean, default: false },
    // Teachers, staff salaries and worker payments. Added because those
    // routes admitted any clerk with no permission at all — a clerk with
    // every box unticked could still create, edit and delete teachers and
    // record salary payments. Defaults false like the rest, so it has to
    // be granted deliberately.
    manageStaff: { type: Boolean, default: false }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  },
  activeSessionId: {
    type: String,
    default: null
  },
  // When the current session signed in, and when it was last seen making a
  // request. `lastSeenAt` is what the server uses to expire an idle session;
  // the browser also runs its own idle timer, but a timer in the client is a
  // convenience, not a control — it cannot bind anyone holding a token.
  sessionStartedAt: {
    type: Date,
    default: null
  },
  lastSeenAt: {
    type: Date,
    default: null
  },
  // Recorded at login purely so the Authenticator can see where a session is
  // running. Never used to make an authorisation decision: both values are
  // client-controlled and trivially forged.
  sessionIp: { type: String, default: '' },
  sessionUserAgent: { type: String, default: '' },
  // CREDENTIAL STORAGE, changed deliberately on 2026-08-16.
  //
  // `password` and `pin` above now hold PLAINTEXT. The operator asked for the
  // Rector to be able to read as well as change every account's credentials
  // from the admin portal, and was given the tradeoff before deciding: bcrypt
  // never prevented an administrator from CHANGING a credential, only from
  // reading one back.
  //
  // This reverses an earlier hardening decision. There used to be a
  // `pin_plaintext` field here, removed at the time with a note saying not to
  // reintroduce a recoverable copy of a credential. That note is superseded
  // by the instruction above — it is recorded rather than deleted so a later
  // reader sees a decision that was made, not a regression that slipped in.
  //
  // What did NOT change: no credential is ever a literal in this repository,
  // which is public. Reads still go through the auth layer, which accepts
  // either a legacy bcrypt hash or plaintext, so accounts provisioned before
  // this change keep working until their credential is next set.
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  department: { type: String, default: '' }
}, {
  timestamps: true
});

/**
 * Clerk contact details, captured when the Rector creates the account.
 *
 * These are ordinary profile fields — `mobile` and `email` already exist
 * above — and are listed here only to record that the clerk creation form
 * collects them, so nothing downstream assumes a clerk has no contact
 * details.
 *
 * NOTE: the unique index on (campus, slotIndex) was removed with the fixed
 * seven-slot model. The per-campus cap is enforced in the create route
 * instead, counted inside the same request that inserts.
 */

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;



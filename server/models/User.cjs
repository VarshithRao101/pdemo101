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
   * Which of the seven clerk slots on this campus the account occupies.
   *
   * Clerks are provisioned into a fixed number of slots per campus rather
   * than created freely, so the cap is a property of the data and not a rule
   * someone has to remember. Null for every other role.
   */
  slotIndex: {
    type: Number,
    default: null,
    min: 1,
    max: 7
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
    logExpenditures: { type: Boolean, default: false }
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
 * One clerk per slot per campus, enforced by the database.
 *
 * An application-level count cannot hold this on its own: two concurrent
 * provisioning requests both read "six clerks" and both insert a seventh. A
 * partial index applies the constraint only to clerk documents, so the four
 * accountants and the Rector — which have no slot — are unaffected.
 */
userSchema.index(
  { campus: 1, slotIndex: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'clerk', slotIndex: { $type: 'number' } }
  }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;



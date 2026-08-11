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
  role: {
    type: String,
    required: true,
    enum: ['admin1', 'admin2', 'accountant', 'authenticator']
  },
  campus: {
    type: String,
    required: true,
    default: 'All'
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
  // NOTE: there was a `pin_plaintext` field here that stored every account's
  // PIN in cleartext alongside its own bcrypt hash, and an endpoint that read
  // it back. It has been removed from the schema and unset on existing
  // documents. Do not reintroduce a recoverable copy of a credential.
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  department: { type: String, default: '' }
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;



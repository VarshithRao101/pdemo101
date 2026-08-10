const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  // Binds the refresh token to the login session it was issued for, so it
  // cannot resurrect a session that has since been logged out or evicted.
  sessionId: {
    type: String,
    default: null,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '7d' }
  },
  revoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;

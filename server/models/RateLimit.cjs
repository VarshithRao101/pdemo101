const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    required: true,
    default: 1
  },
  resetAt: {
    type: Date,
    required: true,
    index: { expires: '15m' }
  }
}, {
  timestamps: true
});

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);

module.exports = RateLimit;

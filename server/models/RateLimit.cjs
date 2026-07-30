const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 1 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { 
  timestamps: true,
  autoIndex: true
});

const RateLimitModel = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);

module.exports = RateLimitModel;

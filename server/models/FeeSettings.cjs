const mongoose = require('mongoose');

const feeSettingsSchema = new mongoose.Schema({
  branch: {
    type: String,
    required: true,
    unique: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  },
  tuition: { type: Number, default: 120000 },
  hostel: { type: Number, default: 85000 },
  transport: { type: Number, default: 15000 },
  misc: { type: Number, default: 5000 },
  isLocked: { type: Boolean, default: false }
}, {
  timestamps: true
});

const FeeSettings = mongoose.models.FeeSettings || mongoose.model('FeeSettings', feeSettingsSchema);

module.exports = FeeSettings;

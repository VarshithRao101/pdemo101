const mongoose = require('mongoose');

const feeSettingsSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true, index: true },
  tuition: { type: Number, default: 120000 },
  hostel: { type: Number, default: 85000 },
  transport: { type: Number, default: 0 },
  misc: { type: Number, default: 5000 },
  isLocked: { type: Boolean, default: true },
  academicYear: { type: String, default: '2026-2027' },
  installments: { type: String, default: '3 Installments' },
  lateFeeRules: { type: String, default: 'Rs.100 per day after due date' },
  scholarshipRules: { type: String, default: 'Merit: 50% waiver, Sports: 30% waiver' }
}, { 
  timestamps: true,
  autoIndex: true
});

const FeeSettings = mongoose.models.FeeSettings || mongoose.model('FeeSettings', feeSettingsSchema);

module.exports = FeeSettings;

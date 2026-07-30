const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  receiptNumber: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  admissionNumber: { type: String, default: '', index: true },
  studentName: { type: String, default: '' },
  category: { type: String, default: 'Tuition Fee' },
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'Cash' },
  cashier: { type: String, default: 'Accountant' },
  branch: { type: String, required: true, index: true },
  academicYear: { type: String, default: '2026-27', index: true },
  remarks: { type: String, default: '' },
  date: { type: Date, default: Date.now, index: true }
}, { 
  timestamps: true,
  autoIndex: true
});

paymentSchema.index({ branch: 1, studentId: 1 });
paymentSchema.index({ branch: 1, academicYear: 1 });
paymentSchema.index({ branch: 1, date: -1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;

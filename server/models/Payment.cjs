const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  receiptNumber: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  student: { type: String, default: '' },
  date: { type: Date, default: Date.now, index: true },
  category: { type: String, default: 'Academic Fee' },
  installment: { type: String, default: 'Installment' },
  amount: { type: Number, required: true },
  balance: { type: Number, default: 0 },
  mode: { type: String, default: 'Cash' },
  cashier: { type: String, default: 'Senior Accountant' },
  branch: { type: String, required: true, index: true }
}, { 
  timestamps: true,
  autoIndex: true
});

paymentSchema.index({ branch: 1, studentId: 1 });
paymentSchema.index({ branch: 1, date: -1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;

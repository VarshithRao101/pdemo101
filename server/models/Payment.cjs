const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  admissionNumber: { type: String, default: '', index: true, trim: true },
  studentName: { type: String, default: '', trim: true },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  category: { type: String, default: 'Tuition Fee', trim: true },
  installment: { type: String, default: 'Installment 1', trim: true },
  paymentMode: { type: String, default: 'UPI / NetBanking', trim: true },
  cashier: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  },
  date: { type: Date, default: Date.now },
  remarks: { type: String, default: '', trim: true },
  transactionRef: { type: String, default: '', trim: true },
  // UNIQUE, not merely indexed. This constraint is what actually prevents a
  // double-click from producing two receipts — an application-level findOne()
  // check cannot, because two concurrent requests both read "not found"
  // before either inserts. `sparse` keeps legacy rows with no key valid.
  idempotencyKey: { type: String, index: true, unique: true, sparse: true }
}, {
  timestamps: true
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;

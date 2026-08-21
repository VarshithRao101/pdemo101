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
  idempotencyKey: { type: String, index: true, unique: true, sparse: true },

  // --- Reversal ----------------------------------------------------------
  //
  // A payment taken in error is REVERSED, never deleted. A clerk who types
  // 25,000 instead of 2,500 needs the money put back; the college needs to be
  // able to see afterwards that it happened, who did it and why. Deleting the
  // row would satisfy the first and destroy the second.
  //
  // A reversed payment stops counting towards what a family has paid — every
  // total in the system filters on `reversed` — but the row, its receipt
  // number and its original amount stay exactly where they were.
  reversed: { type: Boolean, default: false, index: true },
  reversedAt: { type: Date, default: null },
  reversedBy: { type: String, default: '', trim: true },
  reversalReason: { type: String, default: '', trim: true }
}, {
  timestamps: true
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;

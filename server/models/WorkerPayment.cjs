const mongoose = require('mongoose');

const workerPaymentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  workerName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  monthPeriod: {
    type: String,
    required: true,
    trim: true
  },
  paid: { type: Boolean, default: true },
  branch: {
    type: String,
    required: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  }
}, {
  timestamps: true
});

const WorkerPayment = mongoose.models.WorkerPayment || mongoose.model('WorkerPayment', workerPaymentSchema);

module.exports = WorkerPayment;

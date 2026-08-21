const mongoose = require('mongoose');
const softDeletePlugin = require('./softDelete.cjs');

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

// Adds deletedAt/deletedBy and hides soft-deleted rows from every
// read automatically. See softDelete.cjs for why this is a plugin
// rather than a field each query has to remember to filter on.
workerPaymentSchema.plugin(softDeletePlugin);

const WorkerPayment = mongoose.models.WorkerPayment || mongoose.model('WorkerPayment', workerPaymentSchema);

module.exports = WorkerPayment;

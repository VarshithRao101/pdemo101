const mongoose = require('mongoose');

const workerPaymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, default: '' },
  workerName: { type: String, required: true },
  role: { type: String, required: true },
  amount: { type: Number, required: true },
  monthPeriod: { type: String, required: true, index: true },
  paid: { type: Boolean, default: false },
  branch: { type: String, required: true, index: true }
}, { 
  timestamps: true,
  autoIndex: true
});

workerPaymentSchema.index({ branch: 1, monthPeriod: 1 });

const WorkerPayment = mongoose.models.WorkerPayment || mongoose.model('WorkerPayment', workerPaymentSchema);

module.exports = WorkerPayment;

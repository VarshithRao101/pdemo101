const mongoose = require('mongoose');

const expenditureSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, default: '' },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  date: { type: String, default: '', index: true },
  branch: { type: String, required: true, index: true }
}, { 
  timestamps: true,
  autoIndex: true
});

expenditureSchema.index({ branch: 1, date: -1 });

const Expenditure = mongoose.models.Expenditure || mongoose.model('Expenditure', expenditureSchema);

module.exports = Expenditure;

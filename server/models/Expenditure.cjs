const mongoose = require('mongoose');

const expenditureSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  description: { type: String, default: '', trim: true },
  date: { type: Date, default: Date.now },
  branch: {
    type: String,
    required: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  }
}, {
  timestamps: true
});

const Expenditure = mongoose.models.Expenditure || mongoose.model('Expenditure', expenditureSchema);

module.exports = Expenditure;

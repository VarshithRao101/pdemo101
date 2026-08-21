const mongoose = require('mongoose');
const softDeletePlugin = require('./softDelete.cjs');

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

// Adds deletedAt/deletedBy and hides soft-deleted rows from every
// read automatically. See softDelete.cjs for why this is a plugin
// rather than a field each query has to remember to filter on.
expenditureSchema.plugin(softDeletePlugin);

const Expenditure = mongoose.models.Expenditure || mongoose.model('Expenditure', expenditureSchema);

module.exports = Expenditure;

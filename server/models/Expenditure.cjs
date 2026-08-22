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

  /**
   * The account that entered this expenditure.
   *
   * Money coming IN records who took it — Payment.cashier, required, set from
   * the signed-in username. Money going OUT recorded nobody at all: this
   * schema had no such field, so the ledger of what the college spent could
   * not say who entered any line of it. The CSV export even had a "Logged By"
   * column, reading a property no document has ever carried, so it printed an
   * empty column and read as though the answer were simply missing for those
   * rows rather than never captured.
   *
   * Not `required`, deliberately: every expenditure written before this field
   * existed is valid and must keep loading, and a backup taken before it was
   * added must still restore. New entries always set it.
   */
  recordedBy: { type: String, default: '', trim: true },

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

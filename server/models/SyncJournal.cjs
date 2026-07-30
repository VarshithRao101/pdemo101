const mongoose = require('mongoose');

const syncJournalSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  transactionId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  sourceNode: { type: String, default: 'Inspire ERP Central Server' },
  action: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  status: { type: String, required: true, enum: ['success', 'failed'] },
  actorUsername: { type: String, default: 'system' },
  actorRole: { type: String, default: 'system' },
  errorDetails: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 } // Automatically expire logs after 30 days for Free Tier optimization
}, { 
  timestamps: true,
  autoIndex: true
});

syncJournalSchema.index({ branch: 1, timestamp: -1 });

const SyncJournal = mongoose.models.SyncJournal || mongoose.model('SyncJournal', syncJournalSchema);

module.exports = SyncJournal;

const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, default: '' },
  category: { type: String, default: 'announcement' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, default: '' },
  branch: { type: String, required: true, index: true }
}, { 
  timestamps: true,
  autoIndex: true
});

bulletinSchema.index({ branch: 1, createdAt: -1 });

const Bulletin = mongoose.models.Bulletin || mongoose.model('Bulletin', bulletinSchema);

module.exports = Bulletin;

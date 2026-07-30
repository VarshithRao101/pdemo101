const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: String, default: 'System' },
  role: { type: String, default: '' },
  time: { type: Date, default: Date.now },
  campus: { type: String, default: '' },
  targetId: { type: String, default: '' },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true,
  autoIndex: true
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

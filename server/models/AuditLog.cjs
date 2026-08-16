const mongoose = require('mongoose');

/**
 * Who did what, to which record, and when.
 *
 * This exists to answer one question the Rector could not previously ask:
 * "which account made this transaction?" Every money movement, every student
 * or staff record change, and every credential change writes one entry here.
 *
 * Two design rules that matter:
 *
 * 1. An entry is a FACT ABOUT THE PAST. Nothing updates or deletes one — the
 *    only writes are inserts. A log that can be edited by the same people it
 *    records is not evidence of anything.
 *
 * 2. It never carries a credential. `summary` is written for a human to read
 *    and is built by the call site, so a password change records THAT it
 *    happened, who did it and to whom, and never the value.
 */
const auditLogSchema = new mongoose.Schema({
  // --- Who ---------------------------------------------------------------
  // Copied at write time rather than referenced. If an account is later
  // renamed or its campus reassigned, the log must still say what was true
  // when the action happened.
  actorUsername: { type: String, required: true, index: true, trim: true },
  actorRole: { type: String, default: '', trim: true },
  actorName: { type: String, default: '', trim: true },
  actorCampus: { type: String, default: '', trim: true },

  // --- What --------------------------------------------------------------
  // A stable machine key, e.g. 'student.create', 'payment.collect',
  // 'expenditure.delete', 'credential.update'. Filtered on, so indexed.
  action: { type: String, required: true, index: true, trim: true },

  // 'student' | 'teacher' | 'payment' | 'expenditure' | 'account' | ...
  entityType: { type: String, default: '', index: true, trim: true },
  entityId: { type: String, default: '', trim: true },
  // Human label frozen at write time — "Priya Menon (2400101)" — so the log
  // stays readable after the underlying record is deleted.
  entityLabel: { type: String, default: '', trim: true },

  // One sentence, already formatted for display.
  summary: { type: String, required: true, trim: true },

  // Present only on entries that moved money, so the Rector can filter to
  // transactions and total them without parsing the summary text.
  amount: { type: Number, default: null },

  // --- Where -------------------------------------------------------------
  // The campus the AFFECTED RECORD belongs to, which is not always the
  // actor's: admin1 is org-wide and acts across all four.
  campus: { type: String, default: '', index: true, trim: true },

  // --- Outcome -----------------------------------------------------------
  // Refused attempts are recorded too. "Who tried to delete this and was
  // stopped" is exactly the kind of question a log is for.
  outcome: {
    type: String,
    enum: ['success', 'denied', 'failed'],
    default: 'success',
    index: true
  },

  // Free-form extras for the detail view: before/after values, receipt
  // numbers, month keys. Never credentials.
  details: { type: Object, default: {} },

  // Recorded for provenance only, never used to make a decision — both values
  // are client-controlled and trivially forged.
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, {
  timestamps: true
});

// The Logs screen reads newest-first, usually narrowed to a campus or an
// account. Without these the collection is scanned in full on every open, and
// it is the fastest-growing collection in the system.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ campus: 1, createdAt: -1 });
auditLogSchema.index({ actorUsername: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

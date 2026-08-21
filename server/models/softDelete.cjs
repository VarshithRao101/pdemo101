/**
 * Soft deletion, applied as a schema plugin.
 *
 * WHY THIS IS A PLUGIN AND NOT A FIELD
 *
 * Deleting a student used to remove the student AND every payment record
 * pointing at them, permanently, on one confirmation. The audit trail recorded
 * who did it, which tells you what was lost without giving any of it back; the
 * only recovery was the last Drive snapshot, which means also losing
 * everything else that happened since that snapshot.
 *
 * The obvious implementation — add a `deletedAt` field and remember to filter
 * on it — is the one that fails. There are dozens of queries across this file
 * against these collections, and a single one that forgets the filter shows
 * deleted records as live: a "deleted" student still appearing in the registry,
 * or worse, their payments still counting toward a revenue total. Remembering
 * is exactly the discipline that has failed in this codebase before.
 *
 * So the filter is not something a query opts INTO. Every read on a collection
 * carrying this plugin excludes soft-deleted rows automatically, and a caller
 * that genuinely wants them has to say so:
 *
 *     Student.find(filter).setOptions({ withDeleted: true })
 *     Student.aggregate(pipeline).option({ withDeleted: true })
 *
 * which is greppable, and rare enough that each use can be read and justified.
 *
 * ON EXISTING DATA
 *
 * No migration is needed. In MongoDB `{ deletedAt: null }` matches documents
 * where the field is null AND documents where it is absent, so every record
 * written before this plugin existed is treated as live, which is what it is.
 */

module.exports = function softDeletePlugin(schema) {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: '' },
    // Why it was deleted, when the caller supplied a reason. Shown on the
    // recycle bin so the Rector can tell an accident from an intention.
    deletedReason: { type: String, default: '' }
  });

  /**
   * Exclude soft-deleted rows from a query.
   *
   * Bails out in two cases: an explicit `withDeleted` option, and a query that
   * already mentions `deletedAt` itself — the recycle bin asks for exactly the
   * rows this would otherwise hide, and silently ANDing `deletedAt: null` onto
   * it would make it always return nothing.
   */
  function hideDeleted() {
    const options = typeof this.getOptions === 'function' ? this.getOptions() : {};
    if (options && options.withDeleted) return;

    const current = typeof this.getQuery === 'function' ? this.getQuery() : null;
    if (current && Object.prototype.hasOwnProperty.call(current, 'deletedAt')) return;

    this.where({ deletedAt: null });
  }

  // `/^find/` covers find, findOne, findById, findOneAndUpdate and
  // findOneAndDelete. The counts and distincts are named separately because
  // they do not begin with "find" and would otherwise report figures that
  // include deleted rows — which is how a total goes wrong while every list
  // on screen looks right.
  schema.pre(/^find/, hideDeleted);
  schema.pre('countDocuments', hideDeleted);
  schema.pre('distinct', hideDeleted);

  // Aggregations bypass query middleware entirely, so they need their own
  // hook. Every money total in this application is an aggregation; without
  // this, a deleted student's payments would keep contributing to revenue.
  schema.pre('aggregate', function () {
    if (this.options && this.options.withDeleted) return;
    const pipeline = this.pipeline();
    // Unshifted so the exclusion happens before any $group, and before any
    // $match the caller wrote — never after a stage that has already summed.
    pipeline.unshift({ $match: { deletedAt: null } });
  });

  /** Mark as deleted. Returns the number of rows actually affected. */
  schema.statics.softDelete = async function (filter, { by = '', reason = '' } = {}) {
    const result = await this.updateMany(
      { ...filter, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: String(by || ''), deletedReason: String(reason || '') } }
    );
    return result.modifiedCount || 0;
  };

  /** Put it back. `withDeleted` is required or the filter matches nothing. */
  schema.statics.restoreDeleted = async function (filter) {
    const result = await this.updateMany(
      { ...filter, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, deletedBy: '', deletedReason: '' } }
    ).setOptions({ withDeleted: true });
    return result.modifiedCount || 0;
  };
};

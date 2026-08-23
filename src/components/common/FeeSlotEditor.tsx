/**
 * FeeSlotEditor — the fee-entry table, defined once.
 *
 * WHY THIS IS A COMPONENT AND NOT COPIED MARKUP
 *
 * Three screens ask a member of staff to type a student's fees: the Rector's
 * admission form, the accountant's admission form, and the accountant's
 * year-upgrade sheet. They had three different answers to the same question.
 *
 * The Rector's screen listed eleven named sections — tuition, books, uniform,
 * HND, the two exam fees, party, bus, lab, hand loan, others — each on its own
 * row with a running total, a delete button, and a control for adding a new
 * one. The accountant's screen offered three boxes: tuition, hostel, misc. So
 * a student admitted by the accountant could not be given a books fee or a bus
 * fee at all without hand-adding a custom slot, and the same college ended up
 * with two shapes of fee record depending on who happened to type it in.
 *
 * The upgrade sheet had a fourth arrangement again: four fixed boxes, with
 * custom rows in a separate block underneath.
 *
 * Copying the Rector's markup into the other two would have made them agree
 * today and drift apart at the next change, which is the failure this codebase
 * has already written down twice — in `csp.cjs`, where a hand-maintained
 * second copy of the policy was the one nobody watched, and in `gates.ts`,
 * where eleven copies of two strings meant changing them missed some. So the
 * table lives here and all three screens render this.
 *
 * The component is deliberately CONTROLLED and holds no fee state of its own:
 * each screen already owns its slots and submits them differently — the
 * admission forms post a new student, the upgrade sheet posts a year rollover
 * — and hiding that state in here would only move the difference somewhere
 * harder to see.
 */
import React, { useState } from 'react';
import { LIMITS } from '../../constants/fieldLimits';

export interface FeeSlot {
  id: string;
  /** Maps a row back onto a Student field. Absent on a custom row. */
  key?: string;
  name: string;
  amount: string | number;
  isCustom?: boolean;
}

/**
 * The sections a new admission starts with.
 *
 * Everything is blank rather than zero: a zero looks like a decision someone
 * made, an empty box looks like a question still to answer, and a fee slot
 * left at zero is dropped on submit either way.
 */
export const INITIAL_REG_FEE_SLOTS: FeeSlot[] = [
  { id: 'tuitionFee', key: 'tuitionFee', name: 'Tuition Fee', amount: '' },
  { id: 'booksFee', key: 'booksFee', name: 'Books Fee', amount: '' },
  { id: 'uniformFees', key: 'uniformFees', name: 'Uniform Fees', amount: '' },
  { id: 'hndFees', key: 'hndFees', name: 'HND Fees', amount: '' },
  { id: 'internalExamFees', key: 'internalExamFees', name: 'Internal Exam Fee', amount: '' },
  { id: 'annualExamFees', key: 'annualExamFees', name: 'Annual Exam Fee', amount: '' },
  { id: 'partyFees', key: 'partyFees', name: 'Party / Event Fees', amount: '' },
  { id: 'busFees', key: 'busFees', name: 'Bus Transport Fees', amount: '' },
  { id: 'labFees', key: 'labFees', name: 'Lab Fees', amount: '' },
  { id: 'handLoan', key: 'handLoan', name: 'Hand Loan', amount: '' },
  { id: 'othersFee', key: 'othersFee', name: 'Others Fee', amount: '' }
];

/** A fresh copy, so one screen's edits cannot reach another's initial state. */
export const freshRegFeeSlots = (): FeeSlot[] => INITIAL_REG_FEE_SLOTS.map(s => ({ ...s }));

/**
 * Turn a saved student's stored fee fields back into editable rows.
 *
 * Used by the upgrade sheet, which starts from what the student was charged
 * last year. A slot whose stored value is zero still gets a row — the point of
 * the upgrade screen is to type next year's numbers over last year's.
 */
export const slotsFromStudentFees = (fees: any): FeeSlot[] => {
  const base = freshRegFeeSlots().map(s => ({
    ...s,
    amount: fees && fees[s.key as string] != null ? Number(fees[s.key as string]) || 0 : ''
  }));
  // Fields the standard sections do not cover, kept so nothing is silently lost.
  for (const [key, name] of [['hostelFee', 'Hostel Fee'], ['transportFee', 'Transport Fee'],
                             ['miscellaneousFee', 'Miscellaneous Fee']] as Array<[string, string]>) {
    if (fees && fees[key] != null) base.push({ id: key, key, name, amount: Number(fees[key]) || 0 });
  }
  // A stored custom slot that IS one of the standard sections folds back into
  // that row rather than appearing beside it.
  //
  // Student has columns for only five fees, so everything else — books, lab,
  // uniform, the exam fees — is written into customFeeSlots by
  // feeSlotsToPayload, carrying the section's own id. Appending those blindly
  // produced the row twice: an empty "Books Fee" from the standard list and a
  // "Books Fee (Custom)" holding the actual amount. The total stayed right,
  // because the empty one contributed nothing, so this was invisible in the
  // figures and obvious on screen — two identical labels, one of them wrong.
  // Matched on id, key OR NAME. The name is not a nicety: a record written
  // before this change — or by the accountant's old three-box form — carries
  // an invented id like `slot_books` with the name "Books Fee", so an id-only
  // match leaves exactly the duplicate this is meant to prevent, and only for
  // the college's OLDER students, which is the worst set to get wrong.
  const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const custom: FeeSlot[] = [];
  for (const [i, c] of (((fees && fees.customFeeSlots) || []) as any[]).entries()) {
    const match = base.find(b =>
      b.id === c.id || (c.key && b.key === c.key) || (c.name && norm(b.name) === norm(c.name)));
    if (match) {
      match.amount = Number(c.amount) || 0;
      continue;
    }
    custom.push({
      id: c.id || `slot_restored_${i}`,
      name: c.name,
      amount: Number(c.amount) || 0,
      isCustom: true
    });
  }
  return [...base, ...custom];
};

/** Sum of every row, ignoring blanks and anything unparseable. */
export const sumFeeSlots = (slots: FeeSlot[]): number =>
  slots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

interface Props {
  slots: FeeSlot[];
  onChange: (next: FeeSlot[]) => void;
  /** The host screen's input styling, so the table looks native to each portal. */
  inputStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  /** Surfaced to the host so it can use its own toast. */
  onNotify?: (message: string) => void;
  title?: string;
  /** The upgrade sheet is already inside a card; the admission forms are not. */
  framed?: boolean;
}

export const FeeSlotEditor: React.FC<Props> = ({
  slots, onChange, inputStyle, buttonStyle, onNotify,
  title = 'Fee Structure & Bill Format Breakdown', framed = true
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [slotName, setSlotName] = useState('');
  const [slotAmount, setSlotAmount] = useState('');

  const total = sumFeeSlots(slots);

  const addSlot = () => {
    if (!slotName.trim()) {
      onNotify?.('Please enter fee section description.');
      return;
    }
    onChange([...slots, {
      id: 'slot_' + Date.now(),
      name: slotName.trim(),
      amount: parseFloat(slotAmount) || 0,
      isCustom: true
    }]);
    onNotify?.(`Fee section slot "${slotName.trim()}" added.`);
    setSlotName('');
    setSlotAmount('');
    setIsAdding(false);
  };

  const removeSlot = (id: string) => {
    onChange(slots.filter(s => s.id !== id));
    onNotify?.('Fee section slot deleted.');
  };

  const ROW = 'minmax(0, 1fr) minmax(0, 160px) 32px';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      ...(framed ? {
        background: 'var(--surface)',
        border: '1.5px solid var(--line-strong)',
        borderRadius: '16px',
        padding: '18px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
      } : {})
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--line)', paddingBottom: '8px', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            INSPIRE JUNIOR COLLEGE
          </span>
          <h4 style={{ margin: '1px 0 0', fontSize: '1rem', fontWeight: 900, color: 'var(--ink)' }}>{title}</h4>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7143rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>Live Accumulated Total:</span>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--good)', marginLeft: '6px' }}>
            Rs.{total.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: ROW, gap: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--line-strong)' }}>
        <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
          Fee Section Description
        </span>
        <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>
          Amount (Rs)
        </span>
        <span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
        {slots.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-secondary)', fontSize: '0.8571rem', fontStyle: 'italic' }}>
            All fee slots removed. Click "+ Add Fee Section Slot" below to add slots.
          </div>
        ) : (
          slots.map((slot) => (
            <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: ROW, gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink)' }}>{slot.name}</label>
                {slot.isCustom && (
                  <span style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--royal-gold)', backgroundColor: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '4px' }}>Custom</span>
                )}
              </div>
              <input
                min={0}
                max={999999999}
                type="number"
                placeholder="0"
                value={slot.amount}
                onChange={(e) => onChange(slots.map(s => s.id === slot.id ? { ...s, amount: e.target.value } : s))}
                style={{ ...inputStyle, textAlign: 'right', fontWeight: 700, padding: '4px 8px', fontSize: '0.8571rem' }}
              />
              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                style={{ backgroundColor: 'var(--critical-wash)', color: 'var(--critical)', border: '1px solid var(--critical-wash)', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800, fontSize: '0.7857rem' }}
                title="Delete Fee Slot"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {isAdding ? (
        <div style={{ display: 'flex', gap: '8px', padding: '8px', backgroundColor: 'var(--surface-sunken)', borderRadius: '8px', border: '1px dashed var(--line-strong)', marginTop: '4px', flexWrap: 'wrap' }}>
          <input
            maxLength={LIMITS.feeSlotName}
            type="text"
            placeholder="Fee Section Description"
            value={slotName}
            onChange={(e) => setSlotName(e.target.value)}
            style={{ ...inputStyle, flex: 2, minWidth: '140px', fontSize: '0.8571rem' }}
          />
          <input
            min={0}
            max={999999999}
            type="number"
            placeholder="Amount (Rs)"
            value={slotAmount}
            onChange={(e) => setSlotAmount(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: '100px', textAlign: 'right', fontSize: '0.8571rem' }}
          />
          <button
            type="button"
            onClick={addSlot}
            style={{ ...buttonStyle, backgroundColor: 'var(--good)', color: '#fff', border: 'none', padding: '4px 12px', fontSize: '0.8571rem', fontWeight: 800 }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setIsAdding(false); setSlotName(''); setSlotAmount(''); }}
            style={{ ...buttonStyle, backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none', padding: '4px 8px', fontSize: '0.8571rem' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          style={{
            marginTop: '4px', alignSelf: 'flex-start', padding: '6px 12px', borderRadius: '6px',
            border: '1px dashed var(--royal-gold)', backgroundColor: 'var(--surface-sunken)',
            color: 'var(--warning)', fontSize: '0.7857rem', fontWeight: 800, cursor: 'pointer'
          }}
          className="press-interactive"
        >
          + Add Fee Section Slot
        </button>
      )}

      <div style={{ borderTop: '2px solid var(--ink)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)' }}>
          GROSS BASE FEES TOTAL:
        </span>
        <span style={{ fontSize: '1.1429rem', fontWeight: 900, color: 'var(--good)', backgroundColor: 'var(--good-wash)', padding: '4px 14px', borderRadius: '8px', border: '1px solid var(--good-wash)' }}>
          Rs. {total.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
};

export default FeeSlotEditor;

/**
 * Turn editor rows into the fee fields a student create expects.
 *
 * Shared for the same reason the table is: the Rector's form built this
 * mapping inline, the accountant's form built a different one from three
 * fixed inputs, and the result was that the SAME college ended up holding two
 * shapes of fee record depending on which member of staff typed it in. A
 * student admitted by an accountant simply had no books fee or bus fee field
 * to carry, so those charges either went missing or were smuggled in as
 * free-text custom slots that no report groups correctly.
 *
 * Rows worth nothing are dropped, not sent as zeroes — an unfilled section is
 * a section this student is not charged for, and storing it as 0 makes every
 * later screen show a fee line that was never meant to exist.
 */
export const feeSlotsToPayload = (slots: FeeSlot[]) => {
  const active = slots.filter(s => Number(s.amount) > 0);

  // The five that have their own column on Student. Everything else travels in
  // customFeeSlots. `key` is optional, and includes() will not take undefined,
  // so an absent key falls through to the custom side — which is correct, a
  // row with no key cannot be one of the standard columns.
  const STD = ['tuitionFee', 'hostelFee', 'transportFee', 'miscellaneousFee', 'previousPending'];
  const customFeeSlots = active
    .filter(s => s.isCustom || (!STD.includes(s.id) && !STD.includes(s.key ?? '')))
    .map(s => ({ id: s.id, key: s.key, name: s.name, amount: Number(s.amount) || 0 }));

  const amt = (k: string) => {
    const found = active.find(s => s.key === k);
    return found ? Number(found.amount) || 0 : 0;
  };

  return {
    tuitionFee: amt('tuitionFee'),
    booksFee: amt('booksFee'),
    uniformFees: amt('uniformFees'),
    hndFees: amt('hndFees'),
    internalExamFees: amt('internalExamFees'),
    annualExamFees: amt('annualExamFees'),
    partyFees: amt('partyFees'),
    busFees: amt('busFees'),
    labFees: amt('labFees'),
    handLoan: amt('handLoan'),
    othersFee: amt('othersFee'),
    hostelFee: amt('hostelFee'),
    transportFee: amt('transportFee'),
    miscellaneousFee: amt('miscellaneousFee'),
    previousPending: amt('previousPending'),
    customFeeSlots,
    /** Every row, including any the caller chooses not to map. */
    grossTotal: sumFeeSlots(active)
  };
};

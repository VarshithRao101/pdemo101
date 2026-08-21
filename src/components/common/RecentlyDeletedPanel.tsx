/**
 * RecentlyDeletedPanel — the undo window.
 *
 * Deleting a student used to remove them AND every receipt they had ever been
 * given, permanently, on one confirmation. Payment reversal already existed
 * for the case where an amount was typed wrong; this is the same idea applied
 * to the other irreversible action.
 *
 * Rector-only, and gated on the Rector's own PIN, because restoring writes
 * records — and amounts — back into the live books.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { admin1Service, type DeletedEntry } from '../../services/admin1Service';

interface Props {
  onToast: (message: string) => void;
  /** Refresh whatever the surrounding screen is showing after a restore. */
  onRestored?: () => void;
}

const money = (n: number | null) =>
  n === null || n === undefined ? '' : `₹${Number(n).toLocaleString('en-IN')}`;

const readable = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

/** How the five collections read on screen. */
const TYPE_LABEL: Record<string, string> = {
  student: 'Student',
  expenditure: 'Expenditure',
  worker_payment: 'Worker payment',
  teacher: 'Staff member'
};

export const RecentlyDeletedPanel: React.FC<Props> = ({ onToast, onRestored }) => {
  const [entries, setEntries] = useState<DeletedEntry[]>([]);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The row awaiting confirmation, and the PIN typed for it. Held per-row
  // rather than globally so a PIN entered for one restore cannot be submitted
  // against a different one after the list refreshes underneath.
  const [confirming, setConfirming] = useState<DeletedEntry | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, meta } = await admin1Service.getRecentlyDeleted();
      setEntries(items);
      if ((meta as any).windowDays) setWindowDays((meta as any).windowDays);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not load recently deleted records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async () => {
    if (!confirming) return;
    if (!/^\d{6}$/.test(pin)) {
      onToast('Enter your 6-digit PIN to confirm.');
      return;
    }
    setBusy(true);
    try {
      const res = await admin1Service.restoreDeleted(confirming.type, confirming.id, pin);
      onToast(res.message || 'Restored.');
      setConfirming(null);
      setPin('');
      await load();
      onRestored?.();
    } catch (err: any) {
      onToast(err?.message || 'Could not restore that record.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
          Recently deleted
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: '0.8214rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
          Anything deleted in the last {windowDays} days can be put back. Restoring a student brings
          their receipts back with them.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)' }}>Loading…</p>
      ) : error ? (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--critical-wash)', color: 'var(--critical)',
          fontSize: '0.8571rem', fontWeight: 700
        }}>{error}</div>
      ) : entries.length === 0 ? (
        <div style={{
          padding: '20px', borderRadius: 12, border: '1px dashed var(--card-border)',
          textAlign: 'center', color: 'var(--muted-gray)', fontSize: '0.8571rem', fontWeight: 700
        }}>
          Nothing has been deleted in the last {windowDays} days.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={`${entry.type}-${entry.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: '13px 15px',
                borderRadius: 12,
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.6786rem', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--accent)',
                    background: 'var(--accent-wash)', padding: '2px 7px', borderRadius: 5
                  }}>
                    {TYPE_LABEL[entry.type] || entry.type}
                  </span>
                  <strong style={{ fontSize: '0.9286rem', fontWeight: 800, color: 'var(--ink)' }}>
                    {entry.label}
                  </strong>
                  {entry.reference && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-gray)', fontFamily: 'var(--font-mono)' }}>
                      {entry.reference}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginTop: 4 }}>
                  Deleted by <strong>{entry.deletedBy || 'unknown'}</strong> on {readable(entry.deletedAt)}
                  {entry.campus ? ` · ${entry.campus}` : ''}
                  {entry.amount !== null ? ` · ${money(entry.amount)}` : ''}
                </div>

                {/* The number that decides whether this is worth undoing. */}
                {entry.attachedPayments ? (
                  <div style={{ fontSize: '0.7857rem', color: 'var(--critical)', fontWeight: 800, marginTop: 3 }}>
                    {entry.attachedPayments} payment record(s) will be restored with this student
                  </div>
                ) : null}

                {entry.deletedReason && (
                  <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: 3, fontStyle: 'italic' }}>
                    “{entry.deletedReason}”
                  </div>
                )}
              </div>

              <button
                onClick={() => { setConfirming(entry); setPin(''); }}
                style={{
                  padding: '9px 15px', borderRadius: 9, border: '1.5px solid var(--accent)',
                  background: 'transparent', color: 'var(--accent)',
                  fontWeight: 850, fontSize: '0.8214rem', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
                className="press-interactive"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- Confirmation, with the PIN --- */}
      {confirming && (
        <div
          onClick={() => !busy && setConfirming(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)', borderRadius: 16, padding: '22px 24px',
              maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 14,
              border: '1px solid var(--card-border)'
            }}
          >
            <h4 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
              Restore {TYPE_LABEL[confirming.type]?.toLowerCase() || 'record'}?
            </h4>
            <p style={{ margin: 0, fontSize: '0.8571rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
              <strong>{confirming.label}</strong> will be put back into the live records
              {confirming.attachedPayments
                ? `, along with ${confirming.attachedPayments} payment record(s)`
                : ''}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                Your 6-digit PIN
              </span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') restore(); }}
                style={{
                  padding: '11px 13px', borderRadius: 10,
                  border: '1.5px solid var(--card-border)', background: 'var(--bg-secondary)',
                  color: 'var(--ink)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.3em'
                }}
                placeholder="······"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirming(null)}
                disabled={busy}
                style={{
                  padding: '10px 16px', borderRadius: 9, border: '1.5px solid var(--card-border)',
                  background: 'transparent', color: 'var(--ink-secondary)',
                  fontWeight: 800, fontSize: '0.8571rem', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={restore}
                disabled={busy}
                style={{
                  padding: '10px 16px', borderRadius: 9, border: 'none',
                  background: busy ? 'var(--muted-gray)' : 'var(--accent)',
                  color: 'var(--ink-inverse)', fontWeight: 850, fontSize: '0.8571rem',
                  cursor: busy ? 'default' : 'pointer'
                }}
                className="press-interactive"
              >
                {busy ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * OutstandingFeesPanel — everyone who still owes something, largest first.
 *
 * Receipt sharing already works one student at a time, which is right for a
 * parent standing at the counter and no use for the thing a college actually
 * does every month: contact everybody with a balance.
 *
 * The balances are the server's own arithmetic — the same computeStudentFees
 * the ledger and the receipts use — so this screen cannot drift from what the
 * fee-collection screen shows. It deliberately does not send anything itself:
 * it opens WhatsApp with a drafted message so a person reads it and presses
 * send, and it can copy the numbers for whoever does the calling.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getOutstandingFees, type OutstandingStudent } from '../../services/accountService';

interface Props {
  campuses: readonly string[];
  /** '' or 'All' for an org-wide account; a fixed campus pins the filter. */
  fixedCampus?: string;
  collegeName?: string;
  onToast: (message: string) => void;
}

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const OutstandingFeesPanel: React.FC<Props> = ({
  campuses, fixedCampus, collegeName = 'Inspire Educational Institutions', onToast
}) => {
  const [rows, setRows] = useState<OutstandingStudent[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [withoutContact, setWithoutContact] = useState(0);
  const [branch, setBranch] = useState(fixedCampus && fixedCampus !== 'All' ? fixedCampus : 'All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, meta } = await getOutstandingFees(branch);
      setRows(items);
      setTotalAmount(meta.totalAmount ?? 0);
      setWithoutContact((meta as any).withoutContact ?? 0);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not load outstanding fees.');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => { load(); }, [load]);

  // Filtering here is over a list already scoped and ordered by the server,
  // and it is a narrowing of what is on screen rather than a search of the
  // registry — so doing it in the browser is correct.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q)
      || (r.admissionNumber || '').toLowerCase().includes(q)
      || (r.contact || '').includes(q)
    );
  }, [rows, search]);

  const messageFor = (student: OutstandingStudent) =>
    `Dear Parent, this is a fee reminder from ${collegeName}.\n\n`
    + `Student: ${student.name} (${student.admissionNumber})\n`
    + `Outstanding balance: ${money(student.balance)}\n\n`
    + `Kindly clear the balance at the college office at your earliest convenience. `
    + `Please ignore this message if you have already paid.`;

  /** Indian numbers stored as 10 digits; WhatsApp wants the country code. */
  const waNumber = (contact: string) => {
    const digits = String(contact || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const remind = (student: OutstandingStudent) => {
    if (!student.contact) {
      onToast(`No contact number on file for ${student.name}.`);
      return;
    }
    // Opened, never sent. A person reads the draft and presses send.
    const url = `https://wa.me/${waNumber(student.contact)}?text=${encodeURIComponent(messageFor(student))}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) onToast('Popup blocked. Allow popups for this site to open WhatsApp.');
  };

  const copyNumbers = async () => {
    const numbers = visible.map(r => r.contact).filter(Boolean);
    if (numbers.length === 0) {
      onToast('No contact numbers to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(numbers.join(', '));
      onToast(`Copied ${numbers.length} contact number(s).`);
    } catch {
      onToast('Could not copy. Your browser blocked clipboard access.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
          Outstanding fees
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: '0.8214rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
          Students with a balance, largest first. Reminders open WhatsApp with a drafted message —
          nothing is sent until you press send there.
        </p>
      </div>

      {/* --- Summary --- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
        gap: 10
      }}>
        {[
          { label: 'Students owing', value: String(rows.length) },
          { label: 'Total outstanding', value: money(totalAmount) },
          { label: 'No contact on file', value: String(withoutContact) }
        ].map(tile => (
          <div key={tile.label} style={{
            padding: '13px 15px', borderRadius: 12,
            border: '1px solid var(--card-border)', background: 'var(--card-bg)'
          }}>
            <span style={{
              fontSize: '0.7143rem', fontWeight: 800, color: 'var(--ink-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>{tile.label}</span>
            <div style={{
              fontSize: '1.2857rem', fontWeight: 900, color: 'var(--ink)', marginTop: 4,
              fontVariantNumeric: 'tabular-nums'
            }}>{tile.value}</div>
          </div>
        ))}
      </div>

      {/* --- Controls --- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
        gap: 10
      }}>
        {(!fixedCampus || fixedCampus === 'All') && (
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--card-border)',
              background: 'var(--bg-primary)', color: 'var(--ink)', fontWeight: 700, fontSize: '0.8571rem'
            }}
          >
            <option value="All">All campuses</option>
            {campuses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, admission no or number"
          style={{
            padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--card-border)',
            background: 'var(--bg-primary)', color: 'var(--ink)', fontWeight: 600, fontSize: '0.8571rem'
          }}
        />
        <button
          onClick={copyNumbers}
          style={{
            padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--card-border)',
            background: 'transparent', color: 'var(--ink)', fontWeight: 800,
            fontSize: '0.8571rem', cursor: 'pointer'
          }}
          className="press-interactive"
        >
          Copy contact numbers
        </button>
      </div>

      {/* --- List --- */}
      {loading ? (
        <p style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)' }}>Loading…</p>
      ) : error ? (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--critical-wash)', color: 'var(--critical)',
          fontSize: '0.8571rem', fontWeight: 700
        }}>{error}</div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: '20px', borderRadius: 12, border: '1px dashed var(--card-border)',
          textAlign: 'center', color: 'var(--muted-gray)', fontSize: '0.8571rem', fontWeight: 700
        }}>
          {rows.length === 0 ? 'No outstanding balances. Everything is collected.' : 'Nothing matches that filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(student => (
            <div
              key={student.admissionNumber}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 11,
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: '0.9286rem', fontWeight: 800, color: 'var(--ink)' }}>
                  {student.name}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-gray)', marginTop: 2 }}>
                  {student.admissionNumber}
                  {student.campus ? ` · ${student.campus}` : ''}
                  {student.course ? ` · ${student.course}` : ''}
                  {student.contact
                    ? ` · ${student.contact}`
                    : ' · no contact on file'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.9286rem', fontWeight: 900, color: 'var(--critical)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {money(student.balance)}
                </div>
                <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)' }}>
                  of {money(student.totalPayable)}
                </div>
              </div>

              <button
                onClick={() => remind(student)}
                disabled={!student.contact}
                title={student.contact ? 'Open WhatsApp with a drafted reminder' : 'No contact number on file'}
                style={{
                  padding: '8px 13px', borderRadius: 9,
                  border: `1.5px solid ${student.contact ? 'var(--good)' : 'var(--card-border)'}`,
                  background: 'transparent',
                  color: student.contact ? 'var(--good)' : 'var(--muted-gray)',
                  fontWeight: 850, fontSize: '0.7857rem',
                  cursor: student.contact ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap'
                }}
                className="press-interactive"
              >
                Remind
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * WhatsAppNumberDialog — ask which number to send to, then open WhatsApp.
 *
 * Most students arrived from the college's fee Excel with no mobile at all, so
 * a WhatsApp button that only worked from a saved number did nothing for them.
 * This asks for the number at the moment it is needed instead: prefilled when
 * one is on file, typed in when not.
 *
 * "Save on the record" is on by default whenever the typed number is not the
 * one already saved. It matters beyond convenience: the receipt link a parent
 * opens is unlocked with the mobile on the student's record, so a receipt sent
 * to a number that was never saved arrives with a link that will not open.
 *
 * The dialog does no network work itself. `onSend` runs inside the click, so
 * the caller can open WhatsApp synchronously — a window.open after an await is
 * what pop-up blockers stop.
 */
import React, { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  studentName: string;
  /** The number on file, if any — shown and preselected. */
  savedNumber?: string;
  /** What the send button says, e.g. "Send reminder" or "Send receipt". */
  sendLabel?: string;
  onSend: (tenDigits: string, saveToRecord: boolean) => void;
  onClose: () => void;
}

/**
 * Reduce what was typed to the ten national digits, or '' if it is not an
 * Indian mobile. "+91 98765 43210", "09876543210" and "9876543210" all work,
 * because a clerk will paste any of them.
 */
const tenDigitMobile =(raw: string): string => {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
};

export const WhatsAppNumberDialog: React.FC<Props> = ({
  open, studentName, savedNumber = '', sendLabel = 'Send on WhatsApp', onSend, onClose
}) => {
  const saved = tenDigitMobile(savedNumber);
  const [number, setNumber] = useState(saved);
  const [save, setSave] = useState(true);
  const [touched, setTouched] = useState(false);

  // Every opening starts from the student's own number, never the last one typed.
  useEffect(() => {
    if (open) { setNumber(saved); setSave(true); setTouched(false); }
  }, [open, saved]);

  if (!open) return null;

  const digits = tenDigitMobile(number);
  const isNew = Boolean(digits) && digits !== saved;
  const send = () => {
    setTouched(true);
    if (!digits) return;
    onSend(digits, isNew && save);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 12000
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`WhatsApp number for ${studentName}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)', borderRadius: 16, padding: '22px 24px',
          maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 14,
          border: '1px solid var(--card-border)'
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
            Send on WhatsApp
          </h4>
          <p style={{ margin: '6px 0 0', fontSize: '0.8571rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
            For <strong>{studentName}</strong>.{' '}
            {saved ? 'Check the number, or type a different one.' : 'No number is saved yet — enter the parent\'s mobile.'}
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
            Mobile number
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            maxLength={16}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="10-digit mobile"
            style={{
              padding: '11px 13px', borderRadius: 10,
              border: `1.5px solid ${touched && !digits ? 'var(--critical)' : 'var(--card-border)'}`,
              background: 'var(--bg-secondary)', color: 'var(--ink)',
              fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em'
            }}
          />
          {touched && !digits && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--critical)' }}>
              Enter a 10-digit Indian mobile number.
            </span>
          )}
        </label>

        {isNew && (
          // The app's global label style is small caps; this one is a sentence.
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: '0.8214rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.45 }}>
              Save as the parent mobile on {studentName}'s record
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-gray)' }}>
                The parent opens the receipt link with this number, so leave it ticked unless it is a one-off.
              </span>
            </span>
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 9, border: '1.5px solid var(--card-border)',
              background: 'transparent', color: 'var(--ink-secondary)',
              fontWeight: 800, fontSize: '0.8571rem', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            style={{
              padding: '10px 16px', borderRadius: 9, border: 'none',
              background: '#25D366', color: '#FFFFFF',
              fontWeight: 850, fontSize: '0.8571rem', cursor: 'pointer'
            }}
            className="press-interactive"
          >
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

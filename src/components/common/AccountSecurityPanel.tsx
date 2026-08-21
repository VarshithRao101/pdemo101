/**
 * AccountSecurityPanel
 *
 * Two things the signed-in account can do about itself, on one screen because
 * they answer the same question: "is my account still mine?"
 *
 *  - Change your own password and/or PIN. There was previously no way to do
 *    this at all — every credential change went through the Rector or the
 *    authenticator, so somebody who thought their password had been seen had
 *    to find another person before they could act on it.
 *
 *  - See where this session is running and when the previous one was. Sessions
 *    here are single-session and end when the account signs in elsewhere,
 *    which is a good property nobody could observe. "Was the last sign-in
 *    me?" is a question a person can actually answer; not recognising it is
 *    the signal worth acting on, and the form above is the action.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  changeOwnPassword,
  getSessionInfo,
  type SessionInfo
} from '../../services/accountService';

interface Props {
  /** Called after a successful change, once the user has read the message. */
  onSignOut: (reason: string) => void;
  onToast?: (message: string) => void;
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 14,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14
};

const label: React.CSSProperties = {
  fontSize: '0.7857rem',
  fontWeight: 800,
  color: 'var(--ink-secondary)',
  letterSpacing: '0.02em'
};

const input: React.CSSProperties = {
  padding: '11px 13px',
  borderRadius: 10,
  border: '1.5px solid var(--card-border)',
  background: 'var(--bg-primary)',
  color: 'var(--ink)',
  fontSize: '0.9286rem',
  fontWeight: 600,
  width: '100%'
};

/** A date a person can read, or a dash. Never "Invalid Date". */
const readable = (value: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const AccountSecurityPanel: React.FC<Props> = ({ onSignOut, onToast }) => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const loadSession = useCallback(async () => {
    try {
      setSession(await getSessionInfo());
      setSessionError('');
    } catch (err: any) {
      // A failure here must not take the password form down with it — the
      // form is the useful half, and it does not depend on this read.
      setSessionError(err?.message || 'Could not load session details.');
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const submit = async () => {
    setError('');

    if (!currentPassword) {
      setError('Enter your current password to confirm the change.');
      return;
    }
    if (!newPassword && !newPin) {
      setError('Enter a new password, a new PIN, or both.');
      return;
    }
    // Checked here as well as on the server, so a typo is caught before it
    // costs an attempt against the lockout budget.
    if (newPassword && newPassword.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    if (newPin && !/^\d{6}$/.test(newPin)) {
      setError('Your new PIN must be exactly 6 digits.');
      return;
    }

    setBusy(true);
    try {
      const res = await changeOwnPassword({
        currentPassword,
        ...(newPassword ? { newPassword } : {}),
        ...(newPin ? { newPin } : {})
      });

      // The server has already ended every session, so this screen is talking
      // to a dead token from here on. Say so plainly and hand over, rather
      // than letting the next click fail with an opaque 401.
      setDone(res.message || 'Your credentials have been changed. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPin('');
    } catch (err: any) {
      setError(err?.message || 'Could not change your credentials.');
      onToast?.(err?.message || 'Could not change your credentials.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ ...card, gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
          Credentials changed
        </h3>
        <p style={{ margin: 0, fontSize: '0.9286rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
          {done}
        </p>
        <p style={{ margin: 0, fontSize: '0.8214rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
          Every device signed in with the old password has been signed out, including this one.
        </p>
        <button
          onClick={() => onSignOut('Your credentials were changed. Please sign in again.')}
          style={{
            padding: '12px 18px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--ink-inverse)',
            fontWeight: 850, fontSize: '0.9286rem', cursor: 'pointer'
          }}
          className="press-interactive"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* --- Change password / PIN --- */}
      <div style={card}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
            Change your password
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '0.8214rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
            Leave a field blank to keep it as it is. Changing either one signs you out everywhere,
            including here.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={label}>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={input}
            placeholder="Required"
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 12
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={input}
              placeholder="At least 8 characters"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={input}
              placeholder="Type it again"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={label}>New 6-digit PIN (optional)</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            style={{ ...input, maxWidth: 200, letterSpacing: '0.3em' }}
            placeholder="······"
          />
        </div>

        {error && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--critical-wash)', color: 'var(--critical)',
            fontSize: '0.8214rem', fontWeight: 700
          }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: '12px 18px', borderRadius: 10, border: 'none',
            background: busy ? 'var(--muted-gray)' : 'var(--accent)',
            color: 'var(--ink-inverse)', fontWeight: 850, fontSize: '0.9286rem',
            cursor: busy ? 'default' : 'pointer', alignSelf: 'flex-start'
          }}
          className="press-interactive"
        >
          {busy ? 'Changing…' : 'Change credentials'}
        </button>
      </div>

      {/* --- This session --- */}
      <div style={card}>
        <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 850, color: 'var(--ink)' }}>
          Your sign-in activity
        </h3>

        {sessionError ? (
          <p style={{ margin: 0, fontSize: '0.8214rem', color: 'var(--muted-gray)' }}>{sessionError}</p>
        ) : !session ? (
          <p style={{ margin: 0, fontSize: '0.8214rem', color: 'var(--muted-gray)' }}>Loading…</p>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 12
            }}>
              <div>
                <span style={label}>This session started</span>
                <div style={{ fontSize: '0.9286rem', fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                  {readable(session.sessionStartedAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-gray)', fontFamily: 'var(--font-mono)' }}>
                  {session.sessionIp || 'address not recorded'}
                </div>
              </div>
              <div>
                <span style={label}>Previous sign-in</span>
                <div style={{ fontSize: '0.9286rem', fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                  {readable(session.previousSessionAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-gray)', fontFamily: 'var(--font-mono)' }}>
                  {session.previousSessionIp || 'address not recorded'}
                </div>
              </div>
            </div>

            <p style={{
              margin: 0, fontSize: '0.8214rem', color: 'var(--ink-secondary)',
              lineHeight: 1.55, borderTop: '1px solid var(--border-divider)', paddingTop: 12
            }}>
              If you do not recognise the previous sign-in, change your password above and tell the
              Rector. This account signs out automatically after {session.idleTimeoutMinutes} minutes
              of inactivity, and signing in on another device ends this session.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

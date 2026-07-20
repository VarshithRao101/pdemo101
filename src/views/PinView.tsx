import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import PinEntry from '../components/common/PinEntry';
import { useNavigation } from '../context/NavigationContext';
import { InspireLogo } from '../components/common/InspireLogo';
import passwordBg from '../assets/passwordbackground.jpg';

interface PinViewProps {
  onComplete: () => void;
}

// Identifier map: each segment resolves to a different username tried against the backend.
// The 6-digit PIN entered is the shared secret (password).
// Segment → default username hint used as the identifier:
//   student   → 'student'
//   admin     → 'admin'
//   accountant→ 'accountant'
// The backend will match it via User.username, so this is consistent with seed data.
const SEGMENT_TO_IDENTIFIER: Record<string, string> = {
  admin1: 'admin1',
  admin2: 'admin2',
  accountant: 'accountant',
  authenticator: 'authenticator',
};

export const PinView: React.FC<PinViewProps> = ({ onComplete }) => {
  const [pin, setPin] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isError, setIsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastKeypadIndex, setLastKeypadIndex] = useState<number | null>(null);
  // biometric scanning state removed (not used directly here)
  const { isMobile, portalRole, login } = useNavigation();

  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');



  // Clear toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleKeyPress = (num: number) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setLastKeypadIndex(pin.length);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      setLastKeypadIndex(null);
    }
  };

  const triggerError = (msg: string) => {
    setIsError(true);
    setToastMessage(msg);
    setTimeout(() => setIsError(false), 500);
    setPin('');
  };

  const handleConfirm = async () => {
    if (pin.length !== 6) {
      triggerError('Please enter a 6-digit PIN');
      return;
    }

    let identifier = userId.trim() || SEGMENT_TO_IDENTIFIER[portalRole] || 'admin1';

    setIsChecking(true);

    try {
      await login(identifier, pin);
      // On success: let App.tsx drive the transition via isAuthenticated state
      onComplete();
    } catch (err: any) {
      const msg =
        err?.status === 429
          ? 'Too many attempts. Please wait 15 minutes.'
          : 'Incorrect PIN. Please try again.';
      triggerError(msg);
    } finally {
      setIsChecking(false);
    }
  };

  const handleBiometrics = () => {
    // Biometrics remain as a UI prototype gesture — use checking + toast
    setIsChecking(true);
    setToastMessage('Scanning fingerprint...');
    setTimeout(() => {
      setIsChecking(false);
      setToastMessage('Fingerprint login is not yet enabled on this device.');
    }, 1200);
  };

  const handleResetPin = () => {
    setPin('');
    setToastMessage('PIN reset link sent to your registered mobile number');
  };

  // PIN boxes are now rendered by the shared `PinEntry` component.

  // Shared credentials layout page
  const renderCredentialsContent = () => {
    return (
      <>
        {/* Main Title Section */}
        <div style={styles.titleSection}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <InspireLogo size="lg" />
          </div>
          <p style={{ ...styles.subtitle, color: styles.subtitle.color }}>
            {portalRole === 'admin1'
              ? 'Admin 1 (Rector) Login'
              : portalRole === 'admin2'
              ? 'Admin 2 (Campus Principal) Login'
              : portalRole === 'accountant'
              ? 'Accountant Login'
              : 'Portal Login'}
          </p>

        </div>

        {/* Credentials Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '24px 0', width: '100%', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
            <label style={{ fontSize: '10.5px', color: 'var(--muted-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID / ID Card No</label>
            <input
              type="text"
              placeholder="e.g. ADM24001"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid rgba(0, 0, 0, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'var(--font-family)',
                fontSize: '13px',
                color: 'var(--dark-charcoal)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
            <label style={{ fontSize: '10.5px', color: 'var(--muted-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep('pin')}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(0, 0, 0, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: 'var(--font-family)',
                  fontSize: '13px',
                  color: 'var(--dark-charcoal)',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: 'var(--muted-gray)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s ease',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('pin')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '13px',
              background: 'var(--gold-gradient)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
              marginTop: '8px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            className="press-interactive"
          >
            Continue to PIN
            <span style={{ fontSize: '11px', opacity: 0.75, fontWeight: 600 }}>↵ Enter</span>
          </button>
        </div>
      </>
    );
  };

  // Shared content widget
  const renderPinContent = () => {
    return (
      <>
        {/* Top Action Bar */}
        <header style={styles.header}>
          <button
            onClick={() => setStep('credentials')}
            className="press-interactive"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--royal-gold)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ← Edit ID
          </button>
          <button
            onClick={handleResetPin}
            className="press-interactive"
            style={styles.resetBtn}
          >
            Reset PIN
          </button>
        </header>

        {/* Main Title Section */}
        <div style={styles.titleSection}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <InspireLogo size="lg" />
          </div>
          <p style={{ ...styles.subtitle, color: styles.subtitle.color }}>
            {portalRole === 'admin1'
              ? 'Admin 1 (Rector) Portal'
              : portalRole === 'admin2'
              ? 'Admin 2 (Campus Principal) Portal'
              : portalRole === 'accountant'
              ? 'Accountant Portal'
              : 'Authenticator Portal'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--muted-gray)', fontWeight: 500, marginTop: '2px', opacity: 0.8 }}>
            Enter your 6-digit access PIN
          </p>
        </div>

        <PinEntry
          pin={pin}
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
          onBiometrics={handleBiometrics}
          lastKeyIndex={lastKeypadIndex}
          isError={isError}
          isChecking={isChecking}
        />
      </>
    );
  };

  if (isMobile) {
    return (
      <div className="view-container anim-slide-in-right" style={styles.container}>
        {step === 'credentials' ? renderCredentialsContent() : renderPinContent()}

        {/* Checking/Loading Modal Overlay */}
        {isChecking && (
          <div style={styles.loaderOverlay} className="anim-fade-in">
            <div style={styles.loaderContainer} className="glass-panel-heavy anim-scale-in">
              <div style={styles.spinner} />
              <span style={styles.loaderText}>Checking...</span>
            </div>
          </div>
        )}

        {/* Floating Action Notification Toast */}
        {toastMessage && (
          <div style={styles.toastContainer} className="anim-slide-up">
            <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
              <span style={styles.toastText}>{toastMessage}</span>
            </GlassCard>
          </div>
        )}
      </div>
    );
  }

  // Laptop/Desktop Viewport Wrapper
  return (
    <div style={styles.desktopBg} className="anim-fade-in">
      <div style={styles.ambientGlow} />

      <GlassCard hoverable={false} style={styles.desktopCard} className="anim-scale-in">
        {step === 'credentials' ? renderCredentialsContent() : renderPinContent()}
      </GlassCard>

      {/* Checking/Loading Modal Overlay */}
      {isChecking && (
        <div style={styles.loaderOverlay} className="anim-fade-in">
          <div style={styles.loaderContainer} className="glass-panel-heavy anim-scale-in">
            <div style={styles.spinner} />
            <span style={styles.loaderText}>Checking...</span>
          </div>
        </div>
      )}

      {/* Floating Action Notification Toast */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundImage: `url(${passwordBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: 'calc(24px + var(--safe-area-top)) 24px calc(24px + var(--safe-area-bottom)) 24px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  desktopBg: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundImage: `url(${passwordBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: '560px',
    height: '560px',
    background: 'none',
    pointerEvents: 'none',
  },
  desktopCard: {
    width: '420px',
    display: 'flex',
    flexDirection: 'column',
    padding: '34px 34px',
    backgroundColor: 'var(--card-bg)',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: 'var(--radius-xl)',
    position: 'relative',
    zIndex: 10,
  },
  header: {
    height: '44px',
    display: 'flex',
    alignItems: 'center',
  },
  resetBtn: {
    background: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  titleSection: {
    textAlign: 'center',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: 900,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: '1.05',
  },
  subtitle: {
    fontSize: '14px',
    color: '#475569',
    fontWeight: 700,
    marginTop: '0px',
  },
  pinContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    margin: '24px 0',
  },
  pinBox: {
    width: '42px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: '1.5px',
    transition: 'all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  pinDot: {
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    background: 'var(--gold-gradient)',
    boxShadow: '0 0 6px rgba(212,175,55,0.4)',
  },
  bioContainer: {
    display: 'flex',
    justifyContent: 'center',
    margin: '8px 0 24px 0',
  },
  bioButton: {
    background: 'rgba(255, 255, 255, 0.45)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  },
  bioText: {
    letterSpacing: '-0.01em',
  },
  keypadContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '280px',
    margin: '0 auto 16px auto',
  },
  keypadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  keypadButton: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 500,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: 'var(--font-family)',
  },
  keypadActionBtn: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 250, 250, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px 32px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: 'var(--shadow-lg)',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid rgba(212, 175, 55, 0.2)',
    borderTop: '3px solid var(--royal-gold)',
    borderRadius: '50%',
    animation: 'fadeIn 0.3s ease, rotate 0.8s linear infinite',
  },
  loaderText: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
  },
  toastContainer: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    right: '24px',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  toastCard: {
    padding: '12px 18px',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    boxShadow: 'var(--shadow-lg)',
  },
  toastText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
  },
};

// Add raw keyframe spin style injection directly into the head if not loaded
const injectSpinnerKeyframes = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'spinner-keyframe-style';
  if (document.getElementById(styleId)) return;

  const styleNode = document.createElement('style');
  styleNode.id = styleId;
  styleNode.innerHTML = `
    @keyframes rotate {
      100% {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(styleNode);
};

injectSpinnerKeyframes();

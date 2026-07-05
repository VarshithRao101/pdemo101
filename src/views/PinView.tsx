import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

interface PinViewProps {
  onComplete: () => void;
}

export const PinView: React.FC<PinViewProps> = ({ onComplete }) => {
  const [pin, setPin] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isError, setIsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastKeypadIndex, setLastKeypadIndex] = useState<number | null>(null);
  const [bioScanning, setBioScanning] = useState(false);
  const { isMobile, portalRole, setPortalRole } = useNavigation();

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

  const handleConfirm = () => {
    if (pin.length === 6) {
      setIsChecking(true);
      setTimeout(() => {
        setIsChecking(false);
        onComplete();
      }, 700);
    } else {
      // Trigger shake error animation
      setIsError(true);
      setToastMessage('Please enter a 6-digit PIN');
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleBiometrics = () => {
    setBioScanning(true);
    setToastMessage('Scanning fingerprint...');
    setTimeout(() => {
      setBioScanning(false);
      setIsChecking(true);
      setTimeout(() => {
        setIsChecking(false);
        onComplete();
      }, 500);
    }, 1200);
  };

  const handleResetPin = () => {
    setPin('');
    setToastMessage('PIN reset link sent to your registered mobile number');
  };

  // Helper to render PIN boxes
  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < pin.length;
      const isActive = i === pin.length;
      const hasJustEntered = i === lastKeypadIndex;

      boxes.push(
        <div
          key={i}
          className={`glass-panel ${hasJustEntered ? 'anim-pin-pop' : ''}`}
          style={{
            ...styles.pinBox,
            borderColor: isActive
              ? 'var(--royal-gold)'
              : isFilled
              ? 'rgba(212, 175, 55, 0.4)'
              : 'rgba(255, 255, 255, 0.4)',
            boxShadow: isActive
              ? '0 0 12px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)'
              : 'var(--shadow-sm)',
            transform: hasJustEntered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {isFilled && (
            <div style={styles.pinDot} />
          )}
        </div>
      );
    }
    return boxes;
  };

  // Shared content widget
  const renderPinContent = () => {
    return (
      <>
        {/* Top Action Bar */}
        <header style={styles.header}>
          <div style={{ flex: 1 }} />
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
          <h1 style={styles.welcomeTitle}>
            {portalRole === 'student' ? 'Inspire Junior College' : 'Welcome Back'}
          </h1>
          <p style={styles.subtitle}>
            {portalRole === 'student'
              ? 'Student Portal'
              : portalRole === 'faculty'
              ? 'Teacher Portal'
              : 'Admin Portal'}
          </p>

          {/* Role selector Segment */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderRadius: '14px',
            padding: '2px',
            marginTop: '18px',
            width: '360px',
            marginLeft: 'auto',
            marginRight: 'auto',
            border: '1px solid rgba(0, 0, 0, 0.03)'
          }}>
            <button
              onClick={() => { setPortalRole('student'); setPin(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: 'none',
                fontFamily: 'var(--font-family)',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                backgroundColor: portalRole === 'student' ? 'rgba(255,255,255,0.96)' : 'transparent',
                color: portalRole === 'student' ? '#0F172A' : 'var(--muted-gray)',
                boxShadow: portalRole === 'student' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Student
            </button>
            <button
              onClick={() => { setPortalRole('faculty'); setPin(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: 'none',
                fontFamily: 'var(--font-family)',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                backgroundColor: portalRole === 'faculty' ? 'rgba(255,255,255,0.96)' : 'transparent',
                color: portalRole === 'faculty' ? '#0F172A' : 'var(--muted-gray)',
                boxShadow: portalRole === 'faculty' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Teacher
            </button>
            <button
              onClick={() => { setPortalRole('admin'); setPin(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: 'none',
                fontFamily: 'var(--font-family)',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                backgroundColor: portalRole === 'admin' ? 'rgba(255,255,255,0.96)' : 'transparent',
                color: portalRole === 'admin' ? '#0F172A' : 'var(--muted-gray)',
                boxShadow: portalRole === 'admin' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Admin
            </button>
          </div>
        </div>

        {/* PIN Box Container */}
        <div
          style={styles.pinContainer}
          className={isError ? 'anim-shiver' : ''}
        >
          {renderPinBoxes()}
        </div>

        {/* Biometric Trigger */}
        <div style={styles.bioContainer}>
          <button
            onClick={handleBiometrics}
            className={`press-interactive ${bioScanning ? 'anim-biometric' : ''}`}
            style={{
              ...styles.bioButton,
              border: bioScanning ? '1px solid var(--royal-gold)' : '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#goldGradientBio)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id="goldGradientBio" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5C158" />
                  <stop offset="100%" stopColor="#B38F4D" />
                </linearGradient>
              </defs>
              <path d="M12 2a10 10 0 0 0-10 10" />
              <path d="M22 12a10 10 0 0 0-10-10" />
              <path d="M12 22a10 10 0 0 0 10-10" />
              <path d="M2 12a10 10 0 0 0 10 10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
              <path d="M12 5a7 7 0 0 1 7 7c0 1.5-.5 2-1 3.5M5 12a7 7 0 0 1 7-7" />
              <path d="M9 15c.5-1.5 1-2 1-3.5" />
            </svg>
            <span style={styles.bioText}>Use Fingerprint</span>
          </button>
        </div>

        {/* Custom Keypad Container */}
        <div style={styles.keypadContainer}>
          <div style={styles.keypadRow}>
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="press-interactive glass-panel"
                style={styles.keypadButton}
              >
                {num}
              </button>
            ))}
          </div>
          <div style={styles.keypadRow}>
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="press-interactive glass-panel"
                style={styles.keypadButton}
              >
                {num}
              </button>
            ))}
          </div>
          <div style={styles.keypadRow}>
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="press-interactive glass-panel"
                style={styles.keypadButton}
              >
                {num}
              </button>
            ))}
          </div>
          <div style={styles.keypadRow}>
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="press-interactive glass-panel"
              style={styles.keypadActionBtn}
              aria-label="Delete"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--dark-charcoal)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
            {/* Zero Button */}
            <button
              onClick={() => handleKeyPress(0)}
              className="press-interactive glass-panel"
              style={styles.keypadButton}
            >
              0
            </button>
            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              className="press-interactive glass-panel"
              style={{
                ...styles.keypadActionBtn,
                background: pin.length === 6 ? 'var(--gold-gradient)' : 'rgba(255, 255, 255, 0.45)',
                borderColor: pin.length === 6 ? 'var(--royal-gold)' : 'rgba(255, 255, 255, 0.5)',
                color: pin.length === 6 ? 'var(--dark-charcoal)' : 'var(--dark-charcoal)',
              }}
              aria-label="Confirm"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  };

  if (isMobile) {
    return (
      <div className="view-container anim-slide-in-right" style={styles.container}>
        {renderPinContent()}

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
        {renderPinContent()}
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
    backgroundColor: 'var(--bg-primary)',
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
    backgroundColor: 'var(--bg-primary)',
    backgroundImage: 'var(--bg-gradient-overlay)',
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
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'var(--gold-gradient)',
    boxShadow: '0 2px 6px rgba(212, 175, 55, 0.3)',
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

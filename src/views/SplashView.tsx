import React, { useEffect, useState } from 'react';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Play splash for 1.2 seconds, then start exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // Complete transition after exit animation finishes (500ms duration)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        ...styles.container,
        animation: isExiting ? 'slideOutLeft 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards' : 'fadeIn 0.3s ease-out forwards'
      }}
    >
      <div style={styles.centerContent}>
        {/* Inspire Logo Crest */}
        <div style={styles.logoContainer} className="glass-panel anim-scale-logo">
          <div style={styles.logoCrest}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="var(--royal-gold)" stroke="none" fontFamily="var(--font-family)">I</text>
            </svg>
          </div>
        </div>
 
        {/* College Name & Subtitle */}
        <div className="anim-slide-up stagger-1" style={styles.textContainer}>
          <h1 style={styles.collegeName}>INSPIRE</h1>
          <h2 style={styles.collegeNameSub}>Junior College</h2>
          <p style={styles.subtitle}>Residential Campus Portal</p>
        </div>
      </div>
 
      {/* Powered by Creds */}
      <footer className="anim-fade-in stagger-3" style={styles.footer}>
        <span style={styles.poweredText}>Powered by</span>
        <span style={styles.companyText}>TrentBee Technologies</span>
      </footer>
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
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    padding: '40px 24px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, /* Display overlaying everything */
  },
  centerContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    transform: 'translateY(-20px)',
  },
  logoContainer: {
    width: '92px',
    height: '92px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
  },
  logoCrest: {
    width: '100%',
    height: '100%',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    textAlign: 'center',
  },
  collegeName: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
  },
  collegeNameSub: {
    fontSize: '28px',
    fontWeight: '500',
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
    opacity: 0.95,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  poweredText: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    opacity: 0.6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  companyText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
    opacity: 0.8,
    letterSpacing: '0.02em',
  },
};

import React, { useEffect, useState } from 'react';
import { InspireLogo } from '../components/common/InspireLogo';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Play splash for 3.5 seconds, then start exit animation (4 seconds total duration)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

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
        <InspireLogo size="lg" />
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

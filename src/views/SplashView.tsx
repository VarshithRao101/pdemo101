import React, { useEffect, useState } from 'react';
import { InspireLogo } from '../components/common/InspireLogo';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    // Stagger: logo first, then tagline, then dots
    const taglineTimer = setTimeout(() => setShowTagline(true), 600);
    const dotsTimer = setTimeout(() => setShowDots(true), 1100);
    const exitTimer = setTimeout(() => setIsExiting(true), 3200);
    const completeTimer = setTimeout(() => onComplete(), 3700);

    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(dotsTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="splash-container"
      style={{
        ...styles.container,
        animation: isExiting
          ? 'slideOutLeft 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards'
          : 'fadeIn 0.4s ease-out forwards',
      }}
    >
      {/* Ambient radial glow behind logo */}
      <div style={styles.ambientGlow} />

      <div style={styles.centerContent}>
        {/* Halo ring around logo */}
        <div style={styles.haloWrapper} className="anim-scale-logo">
          <div style={styles.haloRingOuter} className="anim-border-glow" />
          <div style={styles.haloRingInner} />
          <div style={styles.logoInner}>
            <InspireLogo size="lg" style={{ transform: 'scale(1.45)' }} />
          </div>
        </div>

        {/* Tagline — staggered fade in */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p
            style={{
              ...styles.tagline,
              opacity: showTagline ? 1 : 0,
              transform: showTagline ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Inspiring Excellence
          </p>
          <p
            style={{
              ...styles.subTagline,
              opacity: showTagline ? 1 : 0,
              transform: showTagline ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.6s ease 0.15s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            Junior College Management System
          </p>
        </div>

        {/* Animated loading dots */}
        <div
          style={{
            display: 'flex',
            gap: '7px',
            marginTop: '36px',
            opacity: showDots ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--royal-gold)',
              }}
              className={`typing-dot-${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Version badge */}
      <div style={styles.versionBadge}>
        <span style={styles.versionText}>v1.0 · Inspire JC</span>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: '40px 24px 28px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  ambientGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -60%)',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212,175,55,0.13) 0%, rgba(212,175,55,0.04) 55%, transparent 75%)',
    pointerEvents: 'none',
  },
  centerContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  haloWrapper: {
    position: 'relative',
    width: '160px',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRingOuter: {
    position: 'absolute',
    inset: '-14px',
    borderRadius: '50%',
    border: '1.5px solid rgba(212, 175, 55, 0.28)',
  },
  haloRingInner: {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '50%',
    border: '1px solid rgba(212, 175, 55, 0.14)',
  },
  logoInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
    margin: 0,
  },
  subTagline: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--muted-gray)',
    letterSpacing: '0.02em',
    marginTop: '6px',
    textTransform: 'uppercase',
  },
  versionBadge: {
    position: 'absolute',
    bottom: '22px',
    right: '22px',
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '100px',
    padding: '4px 12px',
  },
  versionText: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    letterSpacing: '0.04em',
  },
};

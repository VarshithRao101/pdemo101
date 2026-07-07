import React, { useEffect, useState } from 'react';
import { InspireLogo } from '../components/common/InspireLogo';

interface SplashViewProps {
  onComplete: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Play splash loading screen for 3.5s, exit animation finishes at 4.0s
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
      className="splash-container"
      style={{
        ...styles.container,
        animation: isExiting ? 'slideOutLeft 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards' : 'fadeIn 0.3s ease-out forwards'
      }}
    >
      <div style={styles.centerContent}>
        <InspireLogo size="lg" style={{ transform: 'scale(1.45)' }} />
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
    padding: '40px 24px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  centerContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  }
};

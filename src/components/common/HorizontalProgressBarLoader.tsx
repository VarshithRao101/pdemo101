import React, { useEffect, useState } from 'react';
import { InspireLogo } from './InspireLogo';

interface HorizontalProgressBarLoaderProps {
  onComplete?: () => void;
  message?: string;
  subMessage?: string;
  durationMs?: number;
}

export const HorizontalProgressBarLoader: React.FC<HorizontalProgressBarLoaderProps> = ({
  onComplete,
  message = 'Initializing System Engine & Syncing Campus Ledger...',
  subMessage,
  durationMs = 1200
}) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 150);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#070B19',
        backgroundImage: 'linear-gradient(135deg, #070B19 0%, #0F172A 100%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#FFFFFF',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}
      className="anim-fade-in"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          textAlign: 'center'
        }}
      >
        <InspireLogo size="lg" />

        <div style={{ marginTop: '8px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0'
            }}
          >
            INSPIRE JUNIOR COLLEGE
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#94A3B8',
              margin: 0,
              fontWeight: 500
            }}
          >
            {message}
          </p>
          {subMessage && (
            <div style={{ fontSize: '11px', color: 'var(--royal-gold)', marginTop: '4px', fontWeight: 700 }}>
              {subMessage}
            </div>
          )}
        </div>

        {/* 2D Horizontal Progress Bar Container */}
        <div style={{ width: '100%', marginTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <span style={{ color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Ready State
            </span>
            <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 900, fontFamily: 'monospace' }}>
              {progress}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              overflow: 'hidden',
              padding: '2px',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.15)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #D4AF37 0%, #F59E0B 100%)',
                boxShadow: '0 0 10px rgba(212, 175, 55, 0.6)',
                transition: 'width 0.05s linear'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '11px', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
          TRNT BEE Technologies
        </div>
      </div>
    </div>
  );
};

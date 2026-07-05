import React from 'react';

interface InspireLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const InspireLogo: React.FC<InspireLogoProps> = ({ size = 'md', style }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const crestSize = isLg ? 48 : isSm ? 28 : 42;
  const brandFontSize = isLg ? '22px' : isSm ? '14px' : '20px';
  const subFontSize = isLg ? '10px' : isSm ? '8px' : '9px';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isSm ? '8px' : '10px', ...style }}>
      {/* Golden Shield Crest with I */}
      <div style={{
        width: crestSize,
        height: crestSize,
        borderRadius: '50%',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '2px solid var(--royal-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}>
        <svg width={crestSize * 0.6} height={crestSize * 0.6} viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="var(--royal-gold)" stroke="none" fontFamily="var(--font-family)">I</text>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <h2 style={{
          fontSize: brandFontSize,
          fontWeight: 900,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: 'var(--dark-charcoal)',
        }}>
          INSPIRE
        </h2>
        <span style={{
          fontSize: subFontSize,
          color: 'var(--royal-gold)',
          fontWeight: 800,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.1,
        }}>
          Junior College
        </span>
      </div>
    </div>
  );
};



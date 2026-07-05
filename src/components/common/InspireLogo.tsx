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
  const subFontSize = isLg ? '9px' : isSm ? '7px' : '8px';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isSm ? '8px' : '10px', ...style }}>
      {/* Narayana Circular Crest */}
      <div style={{
        width: crestSize,
        height: crestSize,
        borderRadius: '50%',
        background: '#FFFFFF',
        border: '1.5px solid #0B56A4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}>
        <svg width={crestSize * 0.7} height={crestSize * 0.7} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#0B56A4" strokeWidth="1.5" />
          <path d="M10 22V10l12 12V10" stroke="#F15C22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 24s4.5-1.5 9-1.5 9 1.5 9 1.5" stroke="#0B56A4" strokeWidth="1.5" strokeLinecap="round" />
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
          color: '#0B56A4',
        }}>
          NARAYANA
        </h2>
        <span style={{
          fontSize: subFontSize,
          color: '#F15C22',
          fontWeight: 800,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.1,
        }}>
          Educational Institutions
        </span>
      </div>
    </div>
  );
};


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
  const subFontSize = isLg ? '10px' : isSm ? '8px' : '10px';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isSm ? '8px' : '10px', ...style }}>
      {/* Golden Crest */}
      <div style={{
        width: crestSize,
        height: crestSize,
        borderRadius: '50%',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '1.5px solid rgba(212, 175, 55, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <svg width={crestSize * 0.55} height={crestSize * 0.55} viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <h2 style={{
          fontSize: brandFontSize,
          fontWeight: 850,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          background: 'linear-gradient(135deg, #E5C158 0%, #B38F4D 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Inspire
        </h2>
        <span style={{
          fontSize: subFontSize,
          color: 'var(--muted-gray)',
          fontWeight: 700,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1.1,
        }}>
          Educational Institutions
        </span>
      </div>
    </div>
  );
};

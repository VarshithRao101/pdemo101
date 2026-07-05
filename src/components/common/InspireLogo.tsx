import React from 'react';

interface InspireLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const InspireLogo: React.FC<InspireLogoProps> = ({ size = 'md', style }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  
  // Responsive sizes
  const crestSize = isLg ? 64 : isSm ? 32 : 46;
  const brandFontSize = isLg ? '36px' : isSm ? '18px' : '26px';
  const subFontSize = isLg ? '15px' : isSm ? '8px' : '11px';

  return (
    <div style={{ display: 'flex', flexDirection: isLg ? 'column' : 'row', alignItems: 'center', gap: isLg ? '12px' : '10px', ...style }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: isSm ? '8px' : '12px' }}>
        {/* Emblem Badge */}
        <div style={{ width: crestSize, height: crestSize, flexShrink: 0 }} className="anim-scale-logo">
          <svg width={crestSize} height={crestSize} viewBox="0 0 48 48" fill="none">
            {/* Outer Dark Blue Circle */}
            <circle cx="24" cy="24" r="22" fill="#0A1931" />
            
            {/* Tracks perspective ladder */}
            <path d="M24 14 L12 40 L36 40 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
            <line x1="21" y1="20" x2="27" y2="20" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="19" y1="25" x2="29" y2="25" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="17" y1="30" x2="31" y2="30" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="14" y1="35" x2="34" y2="35" stroke="#FFFFFF" strokeWidth="1.2" />

            {/* Left Graduate outline */}
            <path d="M8 36 C8 33, 13 33, 13 36 L13 40 L8 40 Z" fill="#FFFFFF" opacity="0.85" />
            <circle cx="10.5" cy="31" r="2.2" fill="#FFFFFF" />
            <path d="M7.5 28 L10.5 26 L13.5 28 L10.5 30 Z" fill="#FFFFFF" />

            {/* Right Graduate outline */}
            <path d="M40 36 C40 33, 35 33, 35 36 L35 40 L40 40 Z" fill="#FFFFFF" opacity="0.85" />
            <circle cx="37.5" cy="31" r="2.2" fill="#FFFFFF" />
            <path d="M34.5 28 L37.5 26 L40.5 28 L37.5 30 Z" fill="#FFFFFF" />

            {/* Sun at top */}
            <circle cx="24" cy="9" r="3.5" fill="#FFF200" />
            <line x1="24" y1="3" x2="24" y2="5" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="24" y1="13" x2="24" y2="15" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="18" y1="9" x2="20" y2="9" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="28" y1="9" x2="30" y2="9" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="19.5" y1="4.5" x2="21" y2="6" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="27" y1="12" x2="28.5" y2="13.5" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="28.5" y1="4.5" x2="27" y2="6" stroke="#FFF200" strokeWidth="1.2" />
            <line x1="21" y1="12" x2="19.5" y2="13.5" stroke="#FFF200" strokeWidth="1.2" />

            {/* Banner at the bottom */}
            <path d="M9 40 Q24 43 39 40 L37 43 Q24 46 11 43 Z" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Text Details */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {/* styled lowercase 'inspire' with green dot on second i */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: 'var(--font-family)',
            fontWeight: 900,
            fontSize: brandFontSize,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: '#E31E24'
          }}>
            <span>insp</span>
            <div style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              width: isSm ? '7px' : isLg ? '13px' : '10px',
              height: brandFontSize,
            }}>
              {/* Green Dot */}
              <div style={{
                width: isSm ? '3.5px' : isLg ? '7px' : '5px',
                height: isSm ? '3.5px' : isLg ? '7px' : '5px',
                borderRadius: '50%',
                backgroundColor: '#8DC63F',
                position: 'absolute',
                top: isSm ? '1px' : isLg ? '2px' : '2px',
              }} />
              {/* Red Stem */}
              <div style={{
                width: isSm ? '3px' : isLg ? '6px' : '4px',
                height: isSm ? '11px' : isLg ? '21px' : '15px',
                borderRadius: '1px',
                backgroundColor: '#E31E24',
                position: 'absolute',
                bottom: '1px',
              }} />
            </div>
            <span>re</span>
          </div>
          
          <span style={{
            fontSize: subFontSize,
            color: '#0A1931',
            fontWeight: 850,
            margin: '2px 0 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}>
            Junior College
          </span>
        </div>
      </div>

      {isLg && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '4px' }}>
          {/* Slogan */}
          <span style={{
            fontSize: '11px',
            color: '#0A1931',
            fontStyle: 'italic',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}>
            ...inspiring young minds through education
          </span>

          {/* IIT-JEE/NEET Capsule */}
          <div style={{
            backgroundColor: '#0A1931',
            borderRadius: '20px',
            padding: '5px 22px',
            marginTop: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            border: '1.5px solid var(--card-border)'
          }}>
            <span style={{ color: '#FFF200', fontWeight: 900, fontSize: '12px', letterSpacing: '0.04em' }}>
              IIT-JEE/NEET
            </span>
          </div>
        </div>
      )}
      
    </div>
  );
};




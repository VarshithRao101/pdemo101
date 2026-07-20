import React from 'react';
import collegeLogo from '../../assets/college logo.png';

interface InspireLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const InspireLogo: React.FC<InspireLogoProps> = ({ size = 'md', style }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // Responsive heights (doubled/tripled for prominence)
  const height = isLg ? 260 : isSm ? 75 : 115;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <img
        src={collegeLogo}
        alt="Inspire Junior College Logo"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  );
};

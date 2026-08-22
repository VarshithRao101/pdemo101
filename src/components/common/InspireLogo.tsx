import React, { useState } from 'react';
import collegeLogo from '../../assets/college logo.webp';

interface InspireLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  boxed?: boolean;
  inPortal?: boolean;
}

export const InspireLogo: React.FC<InspireLogoProps> = ({ size = 'md', style }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  // Responsive heights
  const height = isLg ? 220 : isSm ? 54 : 92;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
        cursor: 'pointer',
        ...style
      }}
    >
      <img
        src={collegeLogo}
        alt="Inspire Junior College Logo"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0px 4px 12px rgba(15, 23, 42, 0.12))'
        }}
      />
    </div>
  );
};


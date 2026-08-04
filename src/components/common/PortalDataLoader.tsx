import React from 'react';

interface PortalDataLoaderProps {
  message?: string;
  colorAccent?: string; // kept for API compat, not used in display
  visible?: boolean;
}

/**
 * PortalDataLoader — Full-overlay loading spinner for portal page transitions.
 * Displays a single clean black circle spinner, no text, centred on a
 * semi-transparent blurred overlay.
 */
export const PortalDataLoader: React.FC<PortalDataLoaderProps> = ({
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '4px solid rgba(0, 0, 0, .1)',
          borderLeftColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin89345 1s linear infinite',
        }}
      />
    </div>
  );
};

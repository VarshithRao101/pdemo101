import React from 'react';

interface PortalDataLoaderProps {
  message?: string;
  colorAccent?: string; // CSS color string
  visible?: boolean;
}

/**
 * PortalDataLoader — Full-overlay loading spinner for portal page transitions.
 * Place this as a sibling of page content; it blurs and covers the existing content
 * while a fetch is in-flight so the user always gets immediate visual feedback.
 */
export const PortalDataLoader: React.FC<PortalDataLoaderProps> = ({
  message = 'Loading data...',
  colorAccent = '#FBBF24',
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(7, 11, 25, 0.55)',
        gap: '18px',
        pointerEvents: 'all',
      }}
    >
      {/* Spinner ring */}
      <div
        style={{
          width: '52px',
          height: '52px',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Outer glow ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid rgba(255,255,255,0.08)`,
          }}
        />
        {/* Spinning arc */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid transparent`,
            borderTopColor: colorAccent,
            borderRightColor: colorAccent,
            animation: 'portal-spin 0.75s linear infinite',
            boxShadow: `0 0 14px ${colorAccent}55`,
          }}
        />
        {/* Inner dot */}
        <div
          style={{
            position: 'absolute',
            inset: '14px',
            borderRadius: '50%',
            backgroundColor: colorAccent,
            opacity: 0.25,
            animation: 'portal-pulse 1.2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Text */}
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#E2E8F0',
            letterSpacing: '0.04em',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
          }}
        >
          {message}
        </span>
        {/* Animated dots */}
        <span
          style={{
            fontSize: '11px',
            color: colorAccent,
            fontWeight: 600,
            letterSpacing: '0.1em',
            animation: 'portal-dots 1.4s step-start infinite',
            fontFamily: 'monospace',
            minWidth: '24px',
          }}
        >
          ●●●
        </span>
      </div>

      <style>{`
        @keyframes portal-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes portal-pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50%       { opacity: 0.35; transform: scale(1.1); }
        }
        @keyframes portal-dots {
          0%   { content: '●○○'; opacity: 0.5; }
          33%  { content: '●●○'; opacity: 0.75; }
          66%  { content: '●●●'; opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

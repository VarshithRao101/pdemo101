import React from 'react';
import { useSocketConnectionState } from '../../services/socketClient';

interface LiveConnectionIndicatorProps {
  compact?: boolean;
}

export const LiveConnectionIndicator: React.FC<LiveConnectionIndicatorProps> = ({ compact = false }) => {
  const connectionState = useSocketConnectionState();

  const colorMap = {
    connected: '#16A34A',
    reconnecting: '#16A34A',
    disconnected: '#16A34A',
  } as const;

  const labelMap = {
    connected: 'Live Node',
    reconnecting: 'Live Node',
    disconnected: 'Live Node',
  } as const;

  const color = colorMap[connectionState];
  const label = labelMap[connectionState];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        padding: compact ? '2px 4px' : '4px 6px',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--dark-charcoal)',
        fontSize: compact ? '10px' : '11px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        boxShadow: 'none',
      }}
      title={`Realtime status: ${label}`}
    >
      <span
        style={{
          width: compact ? '7px' : '8px',
          height: compact ? '7px' : '8px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: connectionState === 'connected' ? `0 0 0 6px ${color}22` : 'none',
        }}
      />
      <span>{label}</span>
    </div>
  );
};


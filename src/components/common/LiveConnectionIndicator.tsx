import React from 'react';
import { useSocketConnectionState } from '../../services/socketClient';

interface LiveConnectionIndicatorProps {
  compact?: boolean;
}

export const LiveConnectionIndicator: React.FC<LiveConnectionIndicatorProps> = ({ compact = false }) => {
  const connectionState = useSocketConnectionState();

  const colorMap = {
    connected: '#16A34A',
    reconnecting: '#F59E0B',
    disconnected: '#94A3B8',
  } as const;

  const labelMap = {
    connected: 'Live',
    reconnecting: 'Reconnecting',
    disconnected: 'Offline',
  } as const;

  const color = colorMap[connectionState];
  const label = labelMap[connectionState];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        padding: compact ? '4px 8px' : '6px 10px',
        borderRadius: '999px',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        color: 'var(--dark-charcoal)',
        fontSize: compact ? '10px' : '11px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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


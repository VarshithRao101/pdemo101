import React from 'react';
import { useSocketConnectionState } from '../../services/socketClient';

interface LiveConnectionIndicatorProps {
  compact?: boolean;
  textColor?: string;
}

export const LiveConnectionIndicator: React.FC<LiveConnectionIndicatorProps> = ({ compact = false, textColor }) => {
  const connectionState = useSocketConnectionState();

  const colorMap = {
    connected: '#10B981',
    reconnecting: '#F59E0B',
    disconnected: '#EF4444',
  } as const;

  const labelMap = {
    connected: 'Live Node',
    reconnecting: 'Reconnecting...',
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
        padding: compact ? '2px 4px' : '4px 6px',
        border: 'none',
        backgroundColor: 'transparent',
        color: textColor || (compact ? '#E2E8F0' : 'inherit'),
        fontSize: compact ? '11px' : '11.5px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        boxShadow: 'none',
      }}
      title={`Realtime status: ${label}`}
    >
      <span
        style={{
          width: compact ? '8px' : '9px',
          height: compact ? '8px' : '9px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: connectionState === 'connected' ? `0 0 8px ${color}` : 'none',
        }}
      />
      <span style={{ color: textColor || (compact ? '#E2E8F0' : 'inherit') }}>{label}</span>
    </div>
  );
};


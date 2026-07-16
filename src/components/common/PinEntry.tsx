import React from 'react';

interface PinEntryProps {
  pin: string;
  onKeyPress: (n: number) => void;
  onDelete: () => void;
  onConfirm: () => void;
  onBiometrics?: () => void;
  lastKeyIndex?: number | null;
  isError?: boolean;
  isChecking?: boolean;
}

export const PinEntry: React.FC<PinEntryProps> = ({ pin, onKeyPress, onDelete, onConfirm, onBiometrics, lastKeyIndex, isError, isChecking }) => {
  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < pin.length;
      const isActive = i === pin.length;
      const hasJustEntered = i === lastKeyIndex;
      boxes.push(
        <div
          key={i}
          className={`glass-panel ${hasJustEntered ? 'anim-pin-pop' : ''}`}
          style={{
            width: 'min(56px, 9.5vw)',
            height: 'min(56px, 9.5vw)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            transition: 'all 0.15s ease',
            background: 'rgba(255,255,255,0.45)',
            borderColor: isActive ? 'var(--royal-gold)' : isFilled ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.4)',
            boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.4)' : 'var(--shadow-sm)',
            transform: hasJustEntered ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          {isFilled && <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--gold-gradient)', boxShadow: '0 0 6px rgba(212,175,55,0.4)' }} />}
        </div>
      );
    }
    return boxes;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'nowrap' }} className={isError ? 'anim-shiver' : ''}>
        {renderPinBoxes()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <button
          onClick={onBiometrics}
          className={`press-interactive ${isChecking ? 'anim-biometric' : ''}`}
          style={{
            background: 'rgba(255,255,255,0.45)',
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer'
          }}
        >
          Use Fingerprint
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => onKeyPress(n)} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%', fontSize: 20 }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {[4, 5, 6].map(n => (
            <button key={n} onClick={() => onKeyPress(n)} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%', fontSize: 20 }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {[7, 8, 9].map(n => (
            <button key={n} onClick={() => onKeyPress(n)} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%', fontSize: 20 }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <button onClick={onDelete} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%' }}>⌫</button>
          <button onClick={() => onKeyPress(0)} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%', fontSize: 20 }}>0</button>
          <button onClick={onConfirm} className="press-interactive glass-panel" style={{ width: 'min(64px, 16vw)', height: 'min(64px, 16vw)', borderRadius: '50%', background: 'var(--gold-gradient)' }}>✓</button>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;

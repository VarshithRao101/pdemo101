import React from 'react';

interface PinEntryProps {
  pin: string;
  onKeyPress: (n: number) => void;
  onDelete: () => void;
  onConfirm: () => void;
  lastKeyIndex?: number | null;
  isError?: boolean;
  isChecking?: boolean;
}

export const PinEntry: React.FC<PinEntryProps> = ({
  pin,
  onKeyPress,
  onDelete,
  onConfirm,
  lastKeyIndex,
  isError,
}) => {
  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < pin.length;
      const isActive = i === pin.length;
      const hasJustEntered = i === lastKeyIndex;
      boxes.push(
        <div
          key={i}
          className={`${hasJustEntered ? 'anim-pin-pop' : ''}`}
          style={{
            width: 'min(48px, 8.5vw)',
            height: 'min(48px, 8.5vw)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid',
            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            background: isActive 
              ? 'rgba(212, 175, 55, 0.15)' 
              : isFilled 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(255, 255, 255, 0.05)',
            borderColor: isActive 
              ? 'var(--royal-gold)' 
              : isFilled 
              ? 'rgba(212, 175, 55, 0.6)' 
              : 'rgba(255, 255, 255, 0.25)',
            boxShadow: isActive 
              ? '0 0 16px rgba(212, 175, 55, 0.4)' 
              : 'none',
            transform: hasJustEntered ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {isFilled && (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--gold-gradient)',
                boxShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
              }}
            />
          )}
        </div>
      );
    }
    return boxes;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
      <div
        style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'nowrap' }}
        className={isError ? 'anim-shiver' : ''}
      >
        {renderPinBoxes()}
      </div>

      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => onKeyPress(n)}
              className="press-interactive premium-keypad-btn"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {[4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => onKeyPress(n)}
              className="press-interactive premium-keypad-btn"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {[7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => onKeyPress(n)}
              className="press-interactive premium-keypad-btn"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={onDelete}
            className="press-interactive premium-keypad-btn"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⌫
          </button>
          <button
            onClick={() => onKeyPress(0)}
            className="press-interactive premium-keypad-btn"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              fontSize: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            0
          </button>
          <button
            onClick={onConfirm}
            className="press-interactive premium-keypad-btn"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              fontSize: 20,
              background: 'var(--gold-gradient)',
              color: '#fff',
              borderColor: 'rgba(212, 175, 55, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;

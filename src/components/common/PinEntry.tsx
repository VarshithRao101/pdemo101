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
  isChecking,
}) => {
  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < pin.length;
      const isActive = i === pin.length;
      const hasJustEntered = i === lastKeyIndex;

      let borderColor = '#E4E4E1';
      let bgColor = '#FFFFFF';
      let boxShadow = 'none';

      if (isError) {
        borderColor = '#B45309';
        bgColor = '#FAFAF9';
      } else if (isActive) {
        borderColor = '#1C1C1E';
        bgColor = '#FAFAF9';
      } else if (isFilled) {
        borderColor = '#1C1C1E';
        bgColor = '#FFFFFF';
      }

      boxes.push(
        <div
          key={i}
          className={`${hasJustEntered ? 'anim-pin-pop' : ''}`}
          style={{
            width: 'min(44px, 12vw)',
            height: 'min(48px, 13vw)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            boxShadow: boxShadow,
            transition: 'border-color 150ms ease',
            position: 'relative'
          }}
        >
          {isFilled && (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#1C1C1E',
              }}
            />
          )}
          {!isFilled && isActive && (
            <div
              style={{
                width: 2,
                height: 16,
                backgroundColor: '#1C1C1E',
                borderRadius: '1px',
                animation: 'pulse 1s infinite'
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
      {/* 6-Digit PIN Boxes Row */}
      <div
        style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'nowrap', padding: '4px' }}
        className={isError ? 'anim-shiver' : ''}
      >
        {renderPinBoxes()}
      </div>

      {/* Flat Minimalist Keypad Grid */}
      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              type="button"
              disabled={isChecking}
              onClick={() => onKeyPress(n)}
              className="press-interactive"
              style={{
                width: '64px',
                height: '48px',
                borderRadius: '6px',
                fontSize: 18,
                fontWeight: 600,
                color: '#1C1C1E',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E1',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color 150ms ease'
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {[4, 5, 6].map(n => (
            <button
              key={n}
              type="button"
              disabled={isChecking}
              onClick={() => onKeyPress(n)}
              className="press-interactive"
              style={{
                width: '64px',
                height: '48px',
                borderRadius: '6px',
                fontSize: 18,
                fontWeight: 600,
                color: '#1C1C1E',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E1',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color 150ms ease'
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {[7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              disabled={isChecking}
              onClick={() => onKeyPress(n)}
              className="press-interactive"
              style={{
                width: '64px',
                height: '48px',
                borderRadius: '6px',
                fontSize: 18,
                fontWeight: 600,
                color: '#1C1C1E',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E1',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color 150ms ease'
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {/* Delete Button */}
          <button
            type="button"
            disabled={isChecking}
            onClick={onDelete}
            className="press-interactive"
            title="Delete last digit"
            style={{
              width: '64px',
              height: '48px',
              borderRadius: '6px',
              backgroundColor: '#FAFAF9',
              border: '1px solid #E4E4E1',
              color: '#6E6E73',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'border-color 150ms ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>

          {/* 0 Button */}
          <button
            type="button"
            disabled={isChecking}
            onClick={() => onKeyPress(0)}
            className="press-interactive"
            style={{
              width: '64px',
              height: '48px',
              borderRadius: '6px',
              fontSize: 18,
              fontWeight: 600,
              color: '#1C1C1E',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E1',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'border-color 150ms ease'
            }}
          >
            0
          </button>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={isChecking}
            onClick={onConfirm}
            className="press-interactive"
            title="Submit 6-Digit PIN"
            style={{
              width: '64px',
              height: '48px',
              borderRadius: '6px',
              backgroundColor: 'var(--portal-accent, #1C1C1E)',
              border: 'none',
              color: '#FFFFFF',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 150ms ease'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;


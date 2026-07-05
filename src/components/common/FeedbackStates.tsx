import React from 'react';
import { GlassCard } from './GlassCard';

// --- SVGS ---
const QuestionIllustration = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorIllustration = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SuccessIllustration = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// --- EMPTY STATE COMPONENT ---
interface EmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionText, onAction }) => {
  return (
    <div style={styles.stateContainer} className="anim-fade-in">
      <GlassCard hoverable={false} style={styles.stateCard}>
        <div style={styles.illustrationWrap}>
          <QuestionIllustration />
        </div>
        <h4 style={styles.stateTitle}>{title}</h4>
        <p style={styles.stateMessage}>{message}</p>
        {actionText && onAction && (
          <button onClick={onAction} style={styles.stateBtn} className="press-interactive">
            {actionText}
          </button>
        )}
      </GlassCard>
    </div>
  );
};

// --- ERROR STATE COMPONENT ---
interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message, onRetry }) => {
  return (
    <div style={styles.stateContainer} className="anim-fade-in">
      <GlassCard hoverable={false} style={{ ...styles.stateCard, border: '1px solid rgba(211,47,47,0.15)' }}>
        <div style={styles.illustrationWrap}>
          <ErrorIllustration />
        </div>
        <h4 style={{ ...styles.stateTitle, color: '#D32F2F' }}>{title}</h4>
        <p style={styles.stateMessage}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} style={{ ...styles.stateBtn, backgroundColor: '#D32F2F' }} className="press-interactive">
            Retry Action
          </button>
        )}
      </GlassCard>
    </div>
  );
};

// --- SUCCESS SNACKBAR TOAST ---
interface SuccessToastProps {
  message: string;
  onClose?: () => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ message, onClose }) => {
  return (
    <div style={styles.toastWrap} className="anim-slide-up">
      <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
        <SuccessIllustration />
        <span style={styles.toastText}>{message}</span>
        {onClose && (
          <button onClick={onClose} style={styles.toastCloseBtn}>
            
          </button>
        )}
      </GlassCard>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  stateContainer: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  stateCard: {
    padding: '32px 24px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(0,0,0,0.03)',
    textAlign: 'center',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  illustrationWrap: {
    marginBottom: '16px',
  },
  stateTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  stateMessage: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    marginTop: '6px',
    lineHeight: '1.4',
  },
  stateBtn: {
    marginTop: '16px',
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--royal-gold)',
    color: '#fff',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  toastWrap: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    right: '24px',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  toastCard: {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.95)',
    border: '1.5px solid rgba(46,125,50,0.3)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: '16px',
  },
  toastText: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    flex: 1,
  },
  toastCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-gray)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '2px',
    pointerEvents: 'auto',
  },
};

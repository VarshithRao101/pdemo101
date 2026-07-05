import React, { type ReactNode } from 'react';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'glass' | 'outline' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--gold-gradient)',
          color: 'var(--dark-charcoal)',
          border: 'none',
          boxShadow: 'var(--shadow-sm), 0 4px 15px rgba(212, 175, 55, 0.2)',
          fontWeight: 600,
        };
      case 'glass':
        return {
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'var(--dark-charcoal)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: 'var(--shadow-sm)',
          fontWeight: 500,
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--dark-charcoal)',
          border: '1.5px solid var(--warm-gold)',
          fontWeight: 500,
        };
      case 'dark':
        return {
          background: 'var(--dark-gradient)',
          color: 'var(--white)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'var(--shadow-md)',
          fontWeight: 600,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-sm)' };
      case 'md':
        return { padding: '12px 24px', fontSize: '15px', borderRadius: 'var(--radius-md)' };
      case 'lg':
        return { padding: '16px 32px', fontSize: '17px', borderRadius: 'var(--radius-lg)' };
    }
  };

  const buttonStyle: React.CSSProperties = {
    fontFamily: 'var(--font-family)',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: fullWidth ? '100%' : 'auto',
    opacity: props.disabled ? 0.6 : 1,
    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...props.style,
  };

  return (
    <button
      className={`press-interactive ${className}`}
      style={buttonStyle}
      {...props}
    >
      {children}
    </button>
  );
};

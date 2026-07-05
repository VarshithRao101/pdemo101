import React, { type ReactNode } from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  heavy?: boolean;
  hoverable?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  heavy = false,
  hoverable = true,
  onClick,
  ...props
}) => {
  const isInteractive = onClick || hoverable;
  
  const cardClasses = [
    heavy ? 'glass-panel-heavy' : 'glass-panel',
    isInteractive ? 'glass-card-interactive press-interactive' : '',
    'anim-scale-in',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

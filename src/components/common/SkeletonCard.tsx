import React from 'react';

interface SkeletonCardProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
  colorAccent?: string;
}

/**
 * SkeletonCard — Animated shimmer placeholder shown while dashboard data loads.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = '100%',
  height = '88px',
  borderRadius = '12px',
  style,
  colorAccent = 'rgba(251,191,36,0.08)',
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: `linear-gradient(90deg,
        rgba(255,255,255,0.04) 0%,
        ${colorAccent} 40%,
        rgba(255,255,255,0.04) 80%
      )`,
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s linear infinite',
      border: '1px solid rgba(255,255,255,0.07)',
      ...style,
    }}
  >
    <style>{`
      @keyframes skeleton-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

interface SkeletonStatGridProps {
  count?: number;
  colorAccent?: string;
}

/** Renders a grid of skeleton stat cards for the dashboard loading state */
export const SkeletonStatGrid: React.FC<SkeletonStatGridProps> = ({
  count = 4,
  colorAccent,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '14px',
      width: '100%',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} colorAccent={colorAccent} />
    ))}
  </div>
);

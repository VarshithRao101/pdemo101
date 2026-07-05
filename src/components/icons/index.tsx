import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  active?: boolean;
}

// Apple / Linear inspired grid home icon
export const DashboardIcon: React.FC<IconProps> = ({ size = 24, active, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={active ? "url(#goldGradientIcon)" : "none"}
    stroke={active ? "none" : "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'all 0.3s ease' }}
    {...props}
  >
    <defs>
      <linearGradient id="goldGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5C158" />
        <stop offset="50%" stopColor="#C5A880" />
        <stop offset="100%" stopColor="#B38F4D" />
      </linearGradient>
    </defs>
    {active ? (
      /* Filled grid */
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ) : (
      /* Outlined grid */
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    )}
  </svg>
);

// Apple / Linear graduation/book icon
export const AcademicsIcon: React.FC<IconProps> = ({ size = 24, active, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={active ? "url(#goldGradientIcon)" : "none"}
    stroke={active ? "none" : "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'all 0.3s ease' }}
    {...props}
  >
    {active ? (
      <path d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    ) : (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </>
    )}
  </svg>
);

// Apple / Linear bell icon
export const UpdatesIcon: React.FC<IconProps> = ({ size = 24, active, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={active ? "url(#goldGradientIcon)" : "none"}
    stroke={active ? "none" : "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'all 0.3s ease' }}
    {...props}
  >
    {active ? (
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />
    ) : (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    )}
  </svg>
);

// Apple / Linear user profile icon
export const ProfileIcon: React.FC<IconProps> = ({ size = 24, active, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={active ? "url(#goldGradientIcon)" : "none"}
    stroke={active ? "none" : "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'all 0.3s ease' }}
    {...props}
  >
    {active ? (
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    ) : (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    )}
  </svg>
);

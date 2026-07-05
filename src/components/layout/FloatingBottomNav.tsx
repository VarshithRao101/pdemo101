import React from 'react';
import { useNavigation, type TabType } from '../../context/NavigationContext';
import {
  DashboardIcon,
  AcademicsIcon,
  UpdatesIcon,
  ProfileIcon,
} from '../icons';

export const FloatingBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, portalRole } = useNavigation();

  const tabs: { type: TabType; label: string; Icon: React.ComponentType<any> }[] = portalRole === 'admin' ? [
    { type: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { type: 'academics', label: 'Management', Icon: AcademicsIcon },
    { type: 'updates', label: 'Reports', Icon: UpdatesIcon },
    { type: 'profile', label: 'Profile', Icon: ProfileIcon },
  ] : portalRole === 'faculty' ? [
    { type: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { type: 'academics', label: 'Classes', Icon: AcademicsIcon },
    { type: 'updates', label: 'Broadcaster', Icon: UpdatesIcon },
    { type: 'profile', label: 'Profile', Icon: ProfileIcon },
  ] : [
    { type: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { type: 'academics', label: 'Academics', Icon: AcademicsIcon },
    { type: 'updates', label: 'Updates', Icon: UpdatesIcon },
    { type: 'profile', label: 'Profile', Icon: ProfileIcon },
  ];

  const activeIndex = tabs.findIndex((t) => t.type === activeTab);

  return (
    <div style={styles.navContainer} className="glass-panel">
      {/* Sliding background capsule */}
      <div
        className="tab-sliding-indicator"
        style={{
          ...styles.slidingIndicator,
          left: `calc(12px + ${activeIndex * 25}% - ${activeIndex * 6}px)`,
        }}
      />

      {/* Tabs */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.type;
        return (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            style={styles.tabButton}
            className="press-interactive"
          >
            <div style={styles.iconContainer}>
              <tab.Icon active={isActive} size={22} />
            </div>
            <span
              style={{
                ...styles.tabLabel,
                color: isActive ? 'var(--dark-charcoal)' : 'var(--muted-gray)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navContainer: {
    position: 'absolute',
    bottom: 'calc(16px + var(--safe-area-bottom))',
    left: '16px',
    right: '16px',
    height: '68px',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 999,
    /* Premium thin glass border and heavy shadows */
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
  },
  slidingIndicator: {
    position: 'absolute',
    top: '8px',
    bottom: '8px',
    width: 'calc(25% - 18px)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    outline: 'none',
    padding: '4px 0',
    cursor: 'pointer',
    zIndex: 2,
    gap: '4px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '24px',
  },
  tabLabel: {
    fontSize: '11px',
    letterSpacing: '-0.01em',
    transition: 'color 0.25s ease',
  },
};

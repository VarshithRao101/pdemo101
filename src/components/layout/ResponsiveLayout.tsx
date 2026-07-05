import React, { type ReactNode } from 'react';
import { useNavigation, type TabType } from '../../context/NavigationContext';
import { FloatingBottomNav } from './FloatingBottomNav';
import { InspireLogo } from '../common/InspireLogo';
import {
  DashboardIcon,
  AcademicsIcon,
  UpdatesIcon,
  ProfileIcon,
} from '../icons';

interface ResponsiveLayoutProps {
  children: ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { isMobile, activeTab, setActiveTab, portalRole } = useNavigation();

  if (isMobile) {
    return (
      <div style={styles.mobileContainer}>
        {children}
        {portalRole !== 'student' && <FloatingBottomNav />}
      </div>
    );
  }

  const menuItems: { type: TabType; label: string; Icon: React.ComponentType<any> }[] = portalRole === 'admin' ? [
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
    { type: 'academics', label: 'Academics Portal', Icon: AcademicsIcon },
    { type: 'updates', label: 'Campus Updates', Icon: UpdatesIcon },
    { type: 'profile', label: 'My Account', Icon: ProfileIcon },
  ];

  return (
    <div style={styles.desktopContainer} className="anim-fade-in">
      {/* Left Sidebar Menu */}
      <aside style={styles.sidebar} className="glass-panel">
        <div style={styles.sidebarHeader}>
          <InspireLogo size="md" />
        </div>

        {/* Sidebar Nav Links */}
        <nav style={styles.sidebarNav}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setActiveTab(item.type)}
                style={{
                  ...styles.navLink,
                  backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                  borderColor: isActive ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                  color: isActive ? 'var(--dark-charcoal)' : 'var(--muted-gray)',
                }}
                className="press-interactive"
              >
                <item.Icon active={isActive} size={18} />
                <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                {isActive && <div style={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>

        {/* User Card at bottom of Sidebar */}
        <div style={styles.sidebarFooter}>
          <div style={styles.userCard} className="glass-panel">
            <div style={styles.avatar} className="glass-gold-ring">
              {portalRole === 'student' ? 'VR' : portalRole === 'faculty' ? 'SF' : 'DK'}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {portalRole === 'student' ? 'Varshith Rao' : portalRole === 'faculty' ? 'Mr. Srinivas' : 'Dr. Ramesh Kumar'}
              </div>
              <div style={styles.userRole}>
                {portalRole === 'student' ? 'ID: IJC240145 • MPC' : portalRole === 'faculty' ? 'FAC-1045 • Physics' : 'Principal • Admin'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  mobileContainer: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  desktopContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  sidebar: {
    width: '260px',
    height: '100%',
    borderRight: '1px solid rgba(255, 255, 255, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 16px',
    borderRadius: '0px',
    boxShadow: 'var(--shadow-md)',
    zIndex: 100,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    padding: '0 8px',
  },
  logoCrestContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--light-gray)',
    boxShadow: 'var(--shadow-sm)',
  },
  sidebarBrand: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
  },
  sidebarSubBrand: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--muted-gray)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontFamily: 'var(--font-family)',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  activeIndicator: {
    position: 'absolute',
    left: '0',
    top: '30%',
    bottom: '30%',
    width: '3px',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '0 4px 4px 0',
  },
  sidebarFooter: {
    marginTop: 'auto',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--light-gray)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--dark-charcoal)',
    boxShadow: 'var(--shadow-sm)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--dark-charcoal)',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflow: 'visible',
    position: 'relative',
  },
};

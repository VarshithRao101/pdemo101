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

// --- PREMIUM DRAWER SVG ICONS ---
const SvgHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SvgSibling = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="17" y1="11" x2="23" y2="11" />
  </svg>
);

const SvgBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SvgCrest = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const SvgStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SvgQuestion = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SvgPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const SvgCog = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { isMobile, activeTab, setActiveTab, portalRole, isDrawerOpen, setIsDrawerOpen } = useNavigation();

  // Mobile side drawer list items (from Screen 1)
  const drawerMenuItems = [
    { label: 'Home', type: 'home', icon: <SvgHome />, action: () => setActiveTab('dashboard') },
    { label: 'Add Sibling', type: 'sibling', icon: <SvgSibling />, action: () => alert('Add Sibling Feature coming soon!') },
    { label: 'Notifications', type: 'notif', icon: <SvgBell />, action: () => setActiveTab('updates') },
    { label: 'About Us', type: 'about', icon: <SvgCrest />, action: () => alert('College details and credentials.') },
    { label: 'Spotlight', type: 'spotlight', icon: <SvgStar />, action: () => alert('Spotlight & Events highlight.') },
    { label: 'Help & Feedback', type: 'feedback', icon: <SvgQuestion />, action: () => setActiveTab('profile') },
    { label: 'Rate the App', type: 'rate', icon: <SvgStar />, action: () => alert('Thank you for rating our application!') },
    { label: 'Contact Us', type: 'contact', icon: <SvgPhone />, action: () => setActiveTab('profile') },
    { label: 'Settings', type: 'settings', icon: <SvgCog />, action: () => setActiveTab('profile') },
  ];

  if (isMobile) {
    return (
      <div style={styles.mobileWrapper}>
        {/* Left Side Sliding Navigation Drawer (Screen 1 design) */}
        <div style={styles.mobileDrawerContainer}>
          {/* User profile header card */}
          <div style={styles.drawerProfileHeader}>
            <div style={styles.drawerAvatarOuter}>
              <div style={styles.drawerAvatarInner}>PM</div>
            </div>
            <div style={styles.drawerProfileInfo}>
              <h3 style={styles.drawerProfileName}>Polsani Manoneeth Rao</h3>
              <span style={styles.drawerProfileMeta}>👤 2421604 &gt;</span>
              <div style={styles.drawerBrandText}>NARAYANA</div>
            </div>
          </div>

          <div style={styles.drawerDivider} />

          {/* Navigation Links list */}
          <div style={styles.drawerNavScroll}>
            {drawerMenuItems.map((item, idx) => {
              const isHomeActive = item.type === 'home' && activeTab === 'dashboard';
              const isUpdatesActive = item.type === 'notif' && activeTab === 'updates';
              const isProfileActive = (item.type === 'settings' || item.type === 'contact' || item.type === 'feedback') && activeTab === 'profile';
              const isActive = isHomeActive || isUpdatesActive || isProfileActive;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setIsDrawerOpen(false);
                  }}
                  style={{
                    ...styles.drawerLinkBtn,
                    color: isActive ? '#3B82F6' : '#94A3B8',
                    borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  <span style={styles.drawerLinkIconCol}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div style={styles.drawerFooterCol}>
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                if ((window as any).logoutUser) (window as any).logoutUser();
              }}
              style={styles.drawerLinkFooterBtn}
            >
              👤 Switch Account
            </button>
            <div style={styles.footerBrandingWrapper}>
              <div style={styles.brandingCrestSmall}>N</div>
              <div style={styles.brandingCrestText}>NARAYANA GROUP</div>
            </div>
          </div>
        </div>

        {/* Main interactive sliding content screen */}
        <div
          onClick={() => {
            if (isDrawerOpen) setIsDrawerOpen(false);
          }}
          style={{
            ...styles.mobileMainView,
            transform: isDrawerOpen ? 'translateX(260px) scale(0.94)' : 'translateX(0px) scale(1)',
            borderRadius: isDrawerOpen ? '24px' : '0px',
            boxShadow: isDrawerOpen ? '0 12px 36px rgba(0,0,0,0.45)' : 'none',
            pointerEvents: isDrawerOpen ? 'none' : 'auto',
          }}
        >
          {children}
          {portalRole !== 'student' && <FloatingBottomNav />}
        </div>
      </div>
    );
  }

  // Desktop Menu Items
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
              {portalRole === 'student' ? 'PM' : portalRole === 'faculty' ? 'SF' : 'DK'}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {portalRole === 'student' ? 'Polsani Manoneeth Rao' : portalRole === 'faculty' ? 'Mr. Srinivas' : 'Dr. Ramesh Kumar'}
              </div>
              <div style={styles.userRole}>
                {portalRole === 'student' ? 'ID: 2421604 • MPC' : portalRole === 'faculty' ? 'FAC-1045 • Physics' : 'Principal • Admin'}
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
  mobileWrapper: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0F172A', // slate-900 base background under the sliding pane
  },
  mobileDrawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: '#1E293B', // slate-800 dark slate matching Screen 1 drawer
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    overflowY: 'auto',
  },
  drawerProfileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '20px 8px 8px 8px',
  },
  drawerAvatarOuter: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(255,255,255,0.15)',
    marginBottom: '12px',
  },
  drawerAvatarInner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#CBD5E1', // grey silhouette placeholder
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
  },
  drawerProfileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  drawerProfileName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F8FAFC',
    margin: 0,
  },
  drawerProfileMeta: {
    fontSize: '12px',
    color: '#94A3B8',
    marginTop: '2px',
    fontWeight: 500,
  },
  drawerBrandText: {
    fontSize: '14px',
    fontWeight: 900,
    color: '#3B82F6', // Blue highlight
    marginTop: '6px',
    letterSpacing: '0.05em',
  },
  drawerDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: '16px 8px',
  },
  drawerNavScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  drawerLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '11px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontFamily: 'var(--font-family)',
    transition: 'all 0.2s ease',
  },
  drawerLinkIconCol: {
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerFooterCol: {
    marginTop: 'auto',
    padding: '16px 8px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  drawerLinkFooterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: '#CBD5E1',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-family)',
  },
  footerBrandingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: 0.25,
    paddingLeft: '4px',
  },
  brandingCrestSmall: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 900,
  },
  brandingCrestText: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.05em',
  },
  mobileMainView: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.35s, box-shadow 0.35s',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  desktopContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
  },
  sidebar: {
    width: '260px',
    height: '100%',
    borderRight: '1px solid var(--sidebar-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 16px',
    borderRadius: '0px',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 100,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    padding: '0 8px',
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
    border: '1px solid var(--card-border)',
    backgroundColor: 'var(--bg-primary)',
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
    overflowY: 'auto',
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
  },
};

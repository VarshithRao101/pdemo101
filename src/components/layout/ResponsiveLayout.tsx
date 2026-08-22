import React, { type ReactNode } from 'react';
import { useNavigation, accountCan } from '../../context/NavigationContext';

// --- TRNT BEE FLOATING BRAND BADGE (REMOVED) ---
const TrntBeeBadge = () => {
  return null;
};

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

const SvgCog = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { isMobile, activeTab, setActiveTab, portalRole, isDrawerOpen, setIsDrawerOpen, user } = useNavigation();




  // Derive dynamic user initials, name, ID, and branding
  const getInitials = (n: string) => {
    if (!n) return '??';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = user?.name || 'Staff Member';
  const displayId = user?.username || '—';
  const displayInitials = getInitials(displayName);
  const displayBrand = 'INSPIRE JUNIOR COLLEGE X TRNT BEE';




  // Mobile & Desktop side drawer list items for all portal roles
  const drawerMenuItems = portalRole === 'authenticator'
    ? [
        { label: 'Dashboard Overview', type: 'dashboard', icon: <SvgHome />, action: () => { setIsDrawerOpen(false); setActiveTab('dashboard'); } },
        { label: 'Sync Integrity Console', type: 'sync_integrity', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('sync_integrity'); } },
        { label: 'Settings', type: 'settings', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('settings'); } },
      ]
    : portalRole === 'admin1'
    ? [
        { label: 'Rector General Cockpit', type: 'dashboard', icon: <SvgHome />, action: () => { setIsDrawerOpen(false); setActiveTab('dashboard'); } },
        { label: 'Students Registry', type: 'students', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setActiveTab('students'); } },
        { label: '+ Add Student Admission', type: 'add_student', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('add_student'); } },
        { label: 'Faculty Management', type: 'teachers', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('teachers'); } },
        { label: 'Student Fee & Waivers', type: 'fee_editor', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setActiveTab('fee_editor'); } },
        { label: 'Multi-Branch Expenditure', type: 'expenditure', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('expenditure'); } },
        { label: 'Admission Enquiries', type: 'enquiries', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setActiveTab('enquiries'); } },
        { label: 'Clerks', type: 'clerks', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('clerks'); } },
        { label: 'Activity Log', type: 'logs', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('logs'); } },
        { label: 'Credentials', type: 'credentials', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('credentials'); } },
      ]
    : portalRole === 'clerk'
    ? [
        // Built from the clerk's granted permissions, so the drawer can never
        // offer a screen the server would refuse. Filtered rather than
        // conditionally spread so the entries stay readable.
        { label: 'Campus Cockpit', type: 'dashboard', icon: <SvgHome />, action: () => { setIsDrawerOpen(false); setActiveTab('dashboard'); } },
        ...(accountCan(user, 'addStudent')
          ? [{ label: '+ Add Student', type: 'add_student', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('add_student'); } }]
          : []),
        ...(accountCan(user, 'editStudent')
          ? [{ label: 'Students Registry', type: 'students', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setActiveTab('students'); } }]
          : []),
        ...(accountCan(user, 'collectFees')
          ? [{ label: 'Collect Student Fees', type: 'fee_collection', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('fee_collection'); } }]
          : []),
        ...(accountCan(user, 'logExpenditures')
          ? [{ label: 'Campus Expenditures', type: 'expenditure', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('expenditure'); } }]
          : []),
      ]
    : [
        { label: 'Accountant Cockpit', type: 'dashboard', icon: <SvgHome />, action: () => { setIsDrawerOpen(false); setActiveTab('dashboard'); } },
        { label: 'Student Registry', type: 'student_search', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setActiveTab('student_search'); } },
        { label: '+ Add New Student', type: 'add_student', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setActiveTab('add_student'); } },
        { label: 'Collect Student Fees', type: 'fee_collection', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setActiveTab('fee_collection'); } },
      ];

  // Helper function to render styled Neo-Brutalist Modal Overlay
  /*
    REMOVED: renderModal, and the four modals built on it — About, Campus
    Spotlight, Rate the Portal App and Portal Settings.

    None of them could be opened. `showAboutModal`, `showSpotlightModal`,
    `showRateModal` and `showSettingsModal` were all initialised false and no
    call anywhere in the app ever set one to true; no drawer entry pointed at
    them either. They rendered nothing, and shipped in the bundle regardless.

    Three of the things they contained are the reason this is a deletion
    rather than a rewiring:

      - "Submit Review" ran a setTimeout, showed "Submitting…", then a success
        message, and discarded the stars and the written feedback. There was
        no endpoint behind it and never had been.
      - "SMS Reminders" and "Fingerprint Sign-in" were bare useState toggles.
        They persisted nothing, nothing read them, and biometric sign-in is
        not implemented anywhere in this application.
      - "Reset Portal Security PIN" called alert() with a hardcoded message
        naming a real person and a partially masked real phone number. That
        string was in the public JavaScript bundle, readable by anyone who
        opened the source of the site.

    A dead control is worse than a missing one — the Authenticator panel's
    removed CSV drop-zone carries the same note and the same reasoning. The
    working theme switch these modals also held is not lost: theme is set from
    the Settings tab, which is a real screen with a real route.

    Changing your own password is now a genuine feature. It lives on the
    Profile screen and talks to POST /api/account/password.
  */



  // If NOT Authenticator (admin1, admin2, accountant), render clean full-width content without sidebar
  if (portalRole !== 'authenticator') {
    return (
      <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={styles.mobileWrapper}>

        {/* Left Side Sliding Navigation Drawer (Screen 1 design) */}
        <div style={styles.mobileDrawerContainer}>
          {/* User profile header card */}
          <div style={styles.drawerProfileHeader}>
            <div style={styles.drawerAvatarOuter}>
              <div style={styles.drawerAvatarInner}>{displayInitials}</div>
            </div>
            <div style={styles.drawerProfileInfo}>
              <h3 style={styles.drawerProfileName}>{displayName}</h3>
              <span style={styles.drawerProfileMeta}>{displayId} &gt;</span>
              <div style={styles.drawerBrandText}>{displayBrand}</div>

            </div>
          </div>

          <div style={styles.drawerDivider} />

          {/* Navigation Links list */}
          <div style={styles.drawerNavScroll}>
            {drawerMenuItems.map((item, idx) => {
              const isHomeActive = item.type === 'home' && activeTab === 'dashboard';
              const isActive = isHomeActive || item.type === activeTab;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                  }}
                  style={{
                    ...styles.drawerLinkBtn,
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                    borderLeft: isActive ? '3px solid #60A5FA' : '3px solid transparent',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                    fontWeight: isActive ? 800 : 600
                  }}
                >
                  <span style={{ ...styles.drawerLinkIconCol, color: isActive ? '#60A5FA' : '#94A3B8' }}>{item.icon}</span>
                  <span style={{ color: isActive ? '#FFFFFF' : '#E2E8F0' }}>{item.label}</span>
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
              Switch Account
            </button>
            <div style={styles.footerBrandingWrapper}>
              <div style={styles.brandingCrestSmall}>I</div>
              <div style={styles.brandingCrestText}>INSPIRE GROUP</div>
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
        </div>
      </div>
    );
  }

  return (
    <div style={styles.desktopContainer} className="anim-fade-in">
      {/* Left Sidebar Navigation */}
      <aside style={{
        width: '260px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        backgroundColor: '#0c1938',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        position: 'relative'
      }}>
        {/* User profile header card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '20px 8px 8px 8px',
        }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.15)',
              marginBottom: '12px',
              cursor: 'pointer'
            }}
            className="press-interactive"
            title="User Profile"
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#CBD5E1',
              color: '#0c1938',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4286rem',
              fontWeight: 800,
            }}>
              {displayInitials}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <h3
              style={{
                fontSize: '1.0357rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                cursor: 'pointer'
              }}
              className="press-interactive"
              title="User Profile"
            >
              {displayName}
            </h3>
            <span style={{ fontSize: '0.7857rem', color: '#CBD5E1', marginTop: '2px', fontWeight: 600 }}>ID: {displayId} &gt;</span>
            <div style={{
              fontSize: '0.7143rem',
              fontWeight: 800,
              color: '#F59E0B',
              letterSpacing: '0.08em',
              marginTop: '6px',
              textTransform: 'uppercase'
            }}>
              {displayBrand}
            </div>

          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />

        {/* Sidebar Nav Links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px'
        }} className="drawer-scrollbar">
          {drawerMenuItems.map((item, idx) => {
            const isHomeActive = item.type === 'home' && activeTab === 'dashboard';
            const isActive = isHomeActive || item.type === activeTab;
            return (
              <button
                key={idx}
                onClick={item.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '0.9643rem',
                  fontFamily: 'var(--font-family)',
                  transition: 'all 0.2s ease',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.28)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#CBD5E1',
                  fontWeight: isActive ? 800 : 600,
                  borderLeft: isActive ? '3px solid #60A5FA' : '3px solid transparent',
                  position: 'relative'
                }}
                className="press-interactive"
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#60A5FA' : '#94A3B8' }}>{item.icon}</span>
                <span style={{ flex: 1, color: isActive ? '#FFFFFF' : '#E2E8F0' }}>{item.label}</span>
                {(item as any).badge && (
                  <span style={{
                    backgroundColor: '#EF4444',
                    color: '#fff',
                    fontSize: '0.6429rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    width: '15px',
                    height: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>{(item as any).badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px 8px 0 8px' }}>
          <button
            onClick={() => {
              if ((window as any).logoutUser) (window as any).logoutUser();
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '0.8929rem',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'var(--font-family)',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            Switch Account
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            opacity: 0.6
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1.5px solid #fff',
              color: '#fff',
              fontSize: '0.7857rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>I</div>
            <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>INSPIRE GROUP</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Render Modals on Desktop */}

        {children}
      </main>

      {/* Global Floating TRNT BEE Trademark Badge */}
      <TrntBeeBadge />
    </div>
  );
}

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
    fontSize: '1.4286rem',
    fontWeight: 800,
  },
  drawerProfileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  drawerProfileName: {
    fontSize: '1.0714rem',
    fontWeight: 700,
    color: '#F8FAFC',
    margin: 0,
  },
  drawerProfileMeta: {
    fontSize: '0.8571rem',
    color: '#94A3B8',
    marginTop: '2px',
    fontWeight: 500,
  },
  drawerBrandText: {
    fontSize: '1rem',
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
    // These are the portal's primary navigation, and on a phone they rendered
    // 42px tall — just under the 44px that a fingertip reliably hits. Two
    // pixels sounds like nothing; on the control that every other screen is
    // reached through, it is the difference between tapping and re-tapping.
    // A minimum rather than a fixed height, so the row still grows if a label
    // wraps or the reader has scaled their font up.
    minHeight: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '1rem',
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
    fontSize: '0.9286rem',
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
    fontSize: '0.7143rem',
    fontWeight: 900,
  },
  brandingCrestText: {
    fontSize: '0.6429rem',
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
    fontSize: '1rem',
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
    fontSize: '0.8571rem',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    boxShadow: 'var(--shadow-sm)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '0.9286rem',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
  },
  userRole: {
    fontSize: '0.7143rem',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    position: 'relative',
    backgroundColor: 'transparent',
  },
};

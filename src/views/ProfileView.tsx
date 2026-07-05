import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// --- PROFILE UI ICONS ---
const CallIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-gray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const QrCodeIllustration = () => (
  <svg width="86" height="86" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="10" fill="rgba(255,255,255,0.95)" />
    
    <rect x="6" y="6" width="20" height="20" rx="3" stroke="var(--royal-gold)" strokeWidth="3" />
    <rect x="11" y="11" width="10" height="10" rx="1.5" fill="var(--royal-gold)" />
    
    <rect x="74" y="6" width="20" height="20" rx="3" stroke="var(--royal-gold)" strokeWidth="3" />
    <rect x="79" y="11" width="10" height="10" rx="1.5" fill="var(--royal-gold)" />
    
    <rect x="6" y="74" width="20" height="20" rx="3" stroke="var(--royal-gold)" strokeWidth="3" />
    <rect x="11" y="79" width="10" height="10" rx="1.5" fill="var(--royal-gold)" />

    <circle cx="45" cy="16" r="2.5" fill="var(--dark-charcoal)" />
    <circle cx="55" cy="12" r="2" fill="var(--royal-gold)" />
    <circle cx="62" cy="18" r="2.5" fill="var(--dark-charcoal)" />
    
    <circle cx="40" cy="35" r="3" fill="var(--royal-gold)" />
    <circle cx="50" cy="42" r="2" fill="var(--dark-charcoal)" />
    <circle cx="34" cy="50" r="2.5" fill="var(--dark-charcoal)" />
    
    <circle cx="16" cy="40" r="2.5" fill="var(--dark-charcoal)" />
    <circle cx="12" cy="50" r="2" fill="var(--royal-gold)" />
    <circle cx="24" cy="46" r="3" fill="var(--dark-charcoal)" />
    
    <circle cx="84" cy="40" r="3" fill="var(--dark-charcoal)" />
    <circle cx="90" cy="50" r="2" fill="var(--royal-gold)" />
    <circle cx="78" cy="46" r="2.5" fill="var(--dark-charcoal)" />
  </svg>
);

const ShieldBadgeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CogIconSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const UserCheckIconSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);

interface ProfileViewProps {
  onClose?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active settings sheets state: 'settings_menu' | 'contacts_menu' | 'appearance' | 'language' | 'notifications' | 'security' | null
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Settings mock state values
  const { themeMode, setThemeMode, setActiveTab, theme } = useNavigation();

  const customBackgroundStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: theme === 'light' ? '#FAFAFA' : '#0B0F19',
    backgroundImage: `
      radial-gradient(circle at 50% 30%, rgba(212, 175, 55, 0.08) 0%, transparent 60%),
      radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.02) 0%, transparent 40%),
      repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.015) 24px, rgba(0,0,0,0.015) 25px)
    `
  };
  const [selectedLang, setSelectedLang] = useState<'English' | 'Telugu' | 'Hindi'>('English');
  const [notifPreferences, setNotifPreferences] = useState({
    announcements: true,
    results: true,
    attendance: true,
    fees: false,
    hostel: true,
    emergency: true
  });
  const [securitySettings, setSecuritySettings] = useState({
    faceId: true,
    fingerprint: false,
    pinLock: true,
    autoLogout: false
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    setShowLogoutSheet(false);
    const globalLogout = (window as any).logoutUser;
    if (globalLogout) {
      globalLogout();
    } else {
      triggerToast('Redirecting session back to PIN Auth...');
    }
  };

  // Contacts dataset
  const emergencyDirectory = [
    { name: 'Hostel Warden', role: 'B Block Admin', phone: '+91 90123 45678', email: 'warden.b@inspire.edu' },
    { name: 'Academic Coordinator', role: 'MPC Branch head', phone: '+91 90123 45679', email: 'coord.mpc@inspire.edu' },
    { name: 'Principal Office', role: 'Administration', phone: '+91 90123 45680', email: 'principal@inspire.edu' },
    { name: 'Medical Room', role: '24/7 Campus Nurse', phone: '+91 90123 45682', email: 'medical@inspire.edu' }
  ];

  if (isLoading) {
    return (
      <div className="view-container" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <div style={{ width: 120, height: 24, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 24, height: 24, borderRadius: '50%' }} className="shimmer-item" />
        </header>

        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ height: 220, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ height: 140, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div className="view-container anim-slide-up" style={customBackgroundStyle}>
      {/* Sticky App Header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <button onClick={onClose || (() => setActiveTab('dashboard'))} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Student Information & Digital Identity</p>
          </div>
          <button
            onClick={() => triggerToast('Edit profile triggers are prototype only.')}
            style={styles.headerIconBtn}
            className="press-interactive"
            aria-label="Edit Profile"
          >
            <EditIcon />
          </button>
        </div>
      </header>

      {/* Profile Scroller Panels */}
      <main style={styles.content}>

        {/* PROFILE HERO CARD */}
        <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
          <div style={styles.heroHeaderRow}>
            <div style={styles.heroAvatar} className="glass-gold-ring anim-scale-in">PM</div>
            <div style={styles.heroStudentInfo}>
              <h2 style={styles.studentName}>Polsani Manoneeth Rao</h2>
              <span style={styles.studentID}>ID: 2421604</span>
              <span style={styles.statusBadge}>● Active Student</span>
            </div>
          </div>

          <div style={styles.heroLineDivider} />

          <div style={styles.heroMetaGrid}>
            <div style={styles.metaRow}>
              <span style={styles.metaLabelText}>Course:</span>
              <span style={styles.metaValText}>MPC (Maths, Physics, Chemistry)</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaLabelText}>Academic Year:</span>
              <span style={styles.metaValText}>2026 - 2027</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaLabelText}>Hostel Boarding:</span>
              <span style={styles.metaValText}>Block A • Room A-203</span>
            </div>
          </div>
        </GlassCard>

        {/* DIGITAL STUDENT IDENTITY CARD - REMOVED BLOOD GROUP */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Digital ID Card</h3>
          
          <GlassCard hoverable={false} style={styles.idCard} className="glass-gold-ring">
            <div style={styles.idCardHeader}>
              <div style={styles.idCollegeCrestRow}>
                <div style={styles.crestCircle}>I</div>
                <div style={styles.idCollegeMeta}>
                  <h4 style={styles.idCollegeTitle}>INSPIRE JUNIOR COLLEGE</h4>
                  <span style={styles.idCollegeSub}>Residential Campus Portal</span>
                </div>
              </div>
            </div>

            <div style={styles.idDetailsContainer}>
              <div style={styles.idDetailsRow}>
                <div style={styles.idCardPhoto}>PM</div>
                <div style={styles.idCardTextGrid}>
                  <div style={styles.idCardItem}>
                    <span style={styles.idCardLabel}>STUDENT NAME</span>
                    <span style={styles.idCardVal}>Polsani Manoneeth Rao</span>
                  </div>
                  <div style={styles.idCardItem}>
                    <span style={styles.idCardLabel}>STUDENT ID</span>
                    <span style={styles.idCardVal}>2421604</span>
                  </div>
                  <div style={styles.idCardItem}>
                    <span style={styles.idCardLabel}>COURSE & YEAR</span>
                    <span style={styles.idCardVal}>MPC • 2026-2027</span>
                  </div>
                </div>
              </div>

              <div style={styles.idQrAndContactsRow}>
                <div style={styles.idCardContacts}>
                  <div style={styles.idCardContactItem}>
                    <span style={styles.idCardLabel}>PARENT / GUARDIAN</span>
                    <span style={styles.idCardVal}>Raman Rao</span>
                  </div>
                  <div style={styles.idCardContactItem}>
                    <span style={styles.idCardLabel}>EMERGENCY CONTACT</span>
                    <span style={styles.idCardVal}>+91 98480 22338</span>
                  </div>
                </div>
                <div style={styles.idQrWrapper} className="anim-pulse-gold">
                  <QrCodeIllustration />
                </div>
              </div>
            </div>

            <div style={styles.idFooterBlock}>
              <ShieldBadgeIcon />
              <span style={styles.idFooterText}>RESIDENTIAL STUDENT IDENTITY CARD</span>
            </div>
          </GlassCard>
        </section>

        {/* HOSTEL BOARDING DETAILS */}
        <section style={styles.section} className="anim-slide-up stagger-2">
          <h3 style={styles.sectionTitle}>Hostel Boarding Details</h3>
          <GlassCard hoverable={false} style={styles.infoSheetCard}>
            <div style={styles.infoSheetItem}>
              <span style={styles.sheetLabel}>Hostel Block</span>
              <span style={styles.sheetVal}>Block A (Boys Wing)</span>
            </div>
            <div style={styles.infoSheetItem}>
              <span style={styles.sheetLabel}>Room Number</span>
              <span style={styles.sheetVal}>A-203</span>
            </div>
            <div style={styles.infoSheetItem}>
              <span style={styles.sheetLabel}>Room Mentor</span>
              <span style={styles.sheetVal}>Mr. Suresh Kumar</span>
            </div>
            <div style={{ ...styles.infoSheetItem, borderBottom: 'none', paddingBottom: 0 }}>
              <span style={styles.sheetLabel}>Boarding Status</span>
              <span style={{ ...styles.sheetVal, color: '#2E7D32', fontWeight: 800 }}>ACTIVE</span>
            </div>
          </GlassCard>
        </section>

        {/* SINGLE REDIRECT BUTTONS FOR SYSTEM SETTINGS & CONTACT HOSTEL */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <h3 style={styles.sectionTitle}>Account Portal Options</h3>
          
          <div style={styles.settingsGrid}>
            <GlassCard
              hoverable={true}
              onClick={() => setActivePanel('settings_menu')}
              style={styles.settingCardItem}
            >
              <div style={styles.settingCardLeft}>
                <div style={styles.settingIconWrapper} className="glass-gold-ring">
                  <CogIconSvg />
                </div>
                <div>
                  <span style={styles.settingCardName}>System Settings</span>
                  <span style={styles.settingCardVal}>Language, Theme & Notification Preferences</span>
                </div>
              </div>
              <ArrowRightIcon />
            </GlassCard>

            <GlassCard
              hoverable={true}
              onClick={() => setActivePanel('contacts_menu')}
              style={styles.settingCardItem}
            >
              <div style={styles.settingCardLeft}>
                <div style={styles.settingIconWrapper} className="glass-gold-ring">
                  <UserCheckIconSvg />
                </div>
                <div>
                  <span style={styles.settingCardName}>Contact Management</span>
                  <span style={styles.settingCardVal}>Reach Hostel Wardens & Campus Staff</span>
                </div>
              </div>
              <ArrowRightIcon />
            </GlassCard>
          </div>
        </section>

        {/* LOGOUT BUTTON */}
        <div style={{ marginTop: '12px', paddingBottom: '32px' }} className="anim-slide-up stagger-4">
          <button
            onClick={() => setShowLogoutSheet(true)}
            style={styles.logoutBtn}
            className="press-interactive"
          >
            Logout
          </button>
        </div>

      </main>

      {/* --- SETTINGS ACTIVE OVERLAY SHEET --- */}
      {activePanel !== null && (
        <div style={styles.modalOverlay} onClick={() => setActivePanel(null)} className="anim-fade-in">
          <div
            style={styles.bottomSheet}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-heavy anim-slide-up"
          >
            <div style={styles.modalGrabHandle} />
            
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {activePanel === 'settings_menu' 
                  ? 'System Settings' 
                  : activePanel === 'contacts_menu' 
                  ? 'Contact Management'
                  : activePanel.charAt(0).toUpperCase() + activePanel.slice(1) + ' Settings'}
              </h3>
              <button onClick={() => {
                if (activePanel === 'appearance' || activePanel === 'language' || activePanel === 'notifications' || activePanel === 'security') {
                  setActivePanel('settings_menu');
                } else {
                  setActivePanel(null);
                }
              }} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>

              {/* SYSTEM SETTINGS MAIN OPTION REDIRECT LIST */}
              {activePanel === 'settings_menu' && (
                <div style={styles.panelSwitchesList}>
                  <button onClick={() => setActivePanel('appearance')} style={styles.panelRowOption} className="press-interactive">
                    <span>Appearance & Layout Accent</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>{themeMode}</span>
                  </button>
                  <button onClick={() => setActivePanel('language')} style={styles.panelRowOption} className="press-interactive">
                    <span>Interface Language Selection</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>{selectedLang}</span>
                  </button>
                  <button onClick={() => setActivePanel('notifications')} style={styles.panelRowOption} className="press-interactive">
                    <span>Notification Preferences</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>Configure subscriptions</span>
                  </button>
                  <button onClick={() => setActivePanel('security')} style={styles.panelRowOption} className="press-interactive">
                    <span>Biometric & PIN Lock Settings</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>Managed</span>
                  </button>
                </div>
              )}

              {/* CONTACT MANAGEMENT / HOSTEL EMERGENCY CONTACTS LIST */}
              {activePanel === 'contacts_menu' && (
                <div style={styles.contactsGrid}>
                  <p style={{ fontSize: '12px', color: 'var(--muted-gray)', marginBottom: '8px', lineHeight: '1.4' }}>
                    Select a contact below to call or email campus departments directly.
                  </p>
                  {emergencyDirectory.map((contact, idx) => (
                    <GlassCard key={idx} hoverable={false} style={styles.contactCard}>
                      <div style={styles.contactHeaderRow}>
                        <div style={styles.contactAvatar} className="glass-gold-ring">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={styles.contactMeta}>
                          <h4 style={styles.contactName}>{contact.name}</h4>
                          <span style={styles.contactRole}>{contact.role}</span>
                        </div>
                      </div>

                      <div style={styles.contactActionsRow}>
                        <button
                          onClick={() => triggerToast(`Initiating call to ${contact.phone}...`)}
                          style={styles.contactBtn}
                          className="press-interactive"
                        >
                          <CallIcon />
                          Call
                        </button>
                        <button
                          onClick={() => triggerToast(`Opening mail composer for ${contact.email}...`)}
                          style={styles.contactBtn}
                          className="press-interactive"
                        >
                          <EmailIcon />
                          Email
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* APPEARANCE OPTION */}
              {activePanel === 'appearance' && (
                <div style={styles.panelContent}>
                  <p style={styles.panelDesc}>Select portal accent visual preference:</p>
                  <div style={styles.themeChipsRow}>
                    {(['Light', 'Dark', 'System'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setThemeMode(mode);
                          triggerToast(`Accent switched to ${mode} mode.`);
                        }}
                        style={{
                          ...styles.panelChip,
                          backgroundColor: themeMode === mode ? 'var(--royal-gold)' : 'rgba(255,255,255,0.7)',
                          color: themeMode === mode ? '#fff' : 'var(--dark-charcoal)'
                        }}
                        className="press-interactive"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LANGUAGE SELECTION */}
              {activePanel === 'language' && (
                <div style={styles.panelContent}>
                  <p style={styles.panelDesc}>Select student portal interface language:</p>
                  <div style={styles.themeChipsRow}>
                    {(['English', 'Telugu', 'Hindi'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLang(lang);
                          triggerToast(`Language switched to ${lang}.`);
                        }}
                        style={{
                          ...styles.panelChip,
                          backgroundColor: selectedLang === lang ? 'var(--royal-gold)' : 'rgba(255,255,255,0.7)',
                          color: selectedLang === lang ? '#fff' : 'var(--dark-charcoal)'
                        }}
                        className="press-interactive"
                      >
                        {lang === 'Telugu' ? 'తెలుగు' : lang === 'Hindi' ? 'हिन्दी' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NOTIFICATION PREFERENCES TABS (MOVED FROM UPDATES) */}
              {activePanel === 'notifications' && (
                <div style={styles.panelSwitchesList}>
                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Academic Notifications</span>
                    <button
                      onClick={() => setNotifPreferences(p => ({ ...p, attendance: !p.attendance }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: notifPreferences.attendance ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: notifPreferences.attendance ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Hostel Updates</span>
                    <button
                      onClick={() => setNotifPreferences(p => ({ ...p, hostel: !p.hostel }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: notifPreferences.hostel ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: notifPreferences.hostel ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Emergency Alerts</span>
                    <button
                      onClick={() => setNotifPreferences(p => ({ ...p, emergency: !p.emergency }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: notifPreferences.emergency ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: notifPreferences.emergency ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Fee Reminders</span>
                    <button
                      onClick={() => setNotifPreferences(p => ({ ...p, fees: !p.fees }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: notifPreferences.fees ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: notifPreferences.fees ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Event Notifications</span>
                    <button
                      onClick={() => setNotifPreferences(p => ({ ...p, announcements: !p.announcements }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: notifPreferences.announcements ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: notifPreferences.announcements ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* SECURITY CRITERIA PANELS */}
              {activePanel === 'security' && (
                <div style={styles.panelSwitchesList}>
                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Face ID Authentication</span>
                    <button
                      onClick={() => setSecuritySettings(p => ({ ...p, faceId: !p.faceId }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: securitySettings.faceId ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: securitySettings.faceId ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>Fingerprint Logins</span>
                    <button
                      onClick={() => setSecuritySettings(p => ({ ...p, fingerprint: !p.fingerprint }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: securitySettings.fingerprint ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: securitySettings.fingerprint ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  <div style={styles.switchRow}>
                    <span style={styles.switchLabel}>PIN Lock Validation</span>
                    <button
                      onClick={() => setSecuritySettings(p => ({ ...p, pinLock: !p.pinLock }))}
                      style={{
                        ...styles.toggleSwitch,
                        backgroundColor: securitySettings.pinLock ? 'var(--royal-gold)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      <div style={{ ...styles.toggleKnob, transform: securitySettings.pinLock ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Logout Bottom Sheet confirmation modal */}
      {showLogoutSheet && (
        <div style={styles.modalOverlay} onClick={() => setShowLogoutSheet(false)} className="anim-fade-in">
          <div
            style={styles.bottomSheet}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-heavy anim-slide-up"
          >
            <div style={styles.modalGrabHandle} />
            
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Confirm Logout</h3>
              <button onClick={() => setShowLogoutSheet(false)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={styles.gatewayText}>
                Are you sure you want to log out of your student portal account?
              </p>
              
              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowLogoutSheet(false)}
                  style={{ ...styles.sheetBtn, backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--dark-charcoal)' }}
                  className="press-interactive"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  style={{ ...styles.sheetBtn, backgroundColor: '#D32F2F', color: '#fff', fontWeight: 800 }}
                  className="press-interactive"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared success toast notification banner */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#FAFAFA',
  },
  appBar: {
    height: 'calc(120px + var(--safe-area-top))',
    paddingTop: 'calc(48px + var(--safe-area-top))',
    paddingLeft: '24px',
    paddingRight: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--glass-bg)',
    borderBottom: '1.5px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  header: {
    padding: 'calc(48px + var(--safe-area-top)) 24px 16px 24px',
    background: 'var(--glass-bg)',
    borderBottom: '1.5px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 8px 4px 0',
  },
  title: {
    fontSize: '28px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '3px',
    textAlign: 'left',
  },
  headerIconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    marginLeft: 'auto',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  /* HERO CARD */
  heroCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '24px',
  },
  heroHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  heroAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
  },
  heroStudentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
  },
  studentName: {
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  studentID: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#2E7D32',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  heroLineDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    margin: '18px 0',
  },
  heroMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  metaLabelText: {
    color: 'var(--muted-gray)',
    fontWeight: 550,
  },
  metaValText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 750,
    textAlign: 'right',
  },

  /* ID CARD STYLING */
  idCard: {
    padding: '20px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-lg)',
  },
  idCardHeader: {
    borderBottom: '1.5px solid rgba(212, 175, 55, 0.25)',
    paddingBottom: '12px',
    marginBottom: '14px',
  },
  idCollegeCrestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  crestCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 850,
  },
  idCollegeMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  idCollegeTitle: {
    fontSize: '12.5px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '0.02em',
  },
  idCollegeSub: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  idDetailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  idDetailsRow: {
    display: 'flex',
    gap: '16px',
  },
  idCardPhoto: {
    width: '74px',
    height: '86px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
  },
  idCardTextGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
  },
  idCardItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  idCardLabel: {
    fontSize: '8px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  idCardVal: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  idQrAndContactsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(0,0,0,0.03)',
    paddingTop: '12px',
  },
  idCardContacts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start',
  },
  idCardContactItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  idQrWrapper: {
    padding: '4px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.03)',
  },
  idFooterBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '16px',
    backgroundColor: 'rgba(212,175,55,0.06)',
    padding: '8px',
    borderRadius: '10px',
    border: '1px solid rgba(212,175,55,0.12)',
  },
  idFooterText: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    letterSpacing: '0.02em',
  },

  /* INFO SHEET styles */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    textAlign: 'left',
  },
  infoSheetCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    borderRadius: '20px',
  },
  infoSheetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
  },
  sheetLabel: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  sheetVal: {
    fontSize: '12.5px',
    color: 'var(--dark-charcoal)',
    fontWeight: 750,
  },

  /* SYSTEM SETTINGS styles */
  settingsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  settingCardItem: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    borderRadius: '18px',
    cursor: 'pointer',
  },
  settingCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    textAlign: 'left',
  },
  settingIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  settingCardName: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    display: 'block',
  },
  settingCardVal: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
    display: 'block',
  },

  /* CONTACT CARD styles */
  contactsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  contactCard: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    borderRadius: '18px',
  },
  contactHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'left',
  },
  contactAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
  },
  contactMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  contactName: {
    fontSize: '14px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
  },
  contactRole: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  contactActionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  contactBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.03)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },

  /* LOGOUT BUTTON style */
  logoutBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '18px',
    border: 'none',
    backgroundColor: '#D32F2F',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
  },

  /* MODAL OVERLAY & BOTTOM SHEET */
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bottomSheet: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
    backgroundColor: 'rgba(250, 250, 250, 0.96)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderTopLeftRadius: '36px',
    borderTopRightRadius: '36px',
    border: '1.5px solid rgba(255,255,255,0.8)',
    borderBottom: 'none',
    padding: '10px 24px 34px 24px',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.08)',
  },
  modalGrabHandle: {
    width: '36px',
    height: '5px',
    borderRadius: '2.5px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    margin: '0 auto 12px auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--muted-gray)',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gatewayText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
    textAlign: 'left',
  },
  modalActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '8px',
  },
  sheetBtn: {
    padding: '13px',
    borderRadius: '14px',
    border: 'none',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
  },

  /* PANEL SPECIFIC styles */
  panelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
  },
  panelDesc: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  themeChipsRow: {
    display: 'flex',
    gap: '8px',
  },
  panelChip: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1.5px solid rgba(255,255,255,0.7)',
    fontSize: '12px',
    fontWeight: 750,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s',
  },
  panelSwitchesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  panelRowOption: {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid rgba(0,0,0,0.03)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '14px',
  },
  switchLabel: {
    fontSize: '12.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  toggleSwitch: {
    width: '42px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    padding: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  toggleKnob: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
  },

  /* TOAST STYLING */
  toastContainer: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1.5px solid rgba(212, 175, 55, 0.3)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: '16px',
  },
  toastText: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
};

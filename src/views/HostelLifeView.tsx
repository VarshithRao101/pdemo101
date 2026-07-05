import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MedicalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);


const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
  </svg>
);

const UtensilsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ContactMgmtIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const LaundryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 9a3 3 0 0 1 3 3" />
  </svg>
);

const GymIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="6" y1="12" x2="18" y2="12" strokeWidth="3" />
    <rect x="2" y="8" width="4" height="8" rx="1" fill="currentColor" />
    <rect x="18" y="8" width="4" height="8" rx="1" fill="currentColor" />
  </svg>
);

const IndoorGamesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const ReadingHallIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const WaterPurifierIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13s-7 8.7-7 13a7 7 0 0 0 7 7z" />
  </svg>
);

const GeneratorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface HostelLifeViewProps {
  onClose: () => void;
}

export const HostelLifeView: React.FC<HostelLifeViewProps> = ({ onClose }) => {
  const { theme } = useNavigation();

  const customBackgroundStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: theme === 'light' ? '#ECFDF5' : '#062F1F',
    backgroundImage: `
      radial-gradient(circle at 10% 30%, rgba(52, 211, 153, 0.12) 0%, transparent 40%),
      radial-gradient(circle at 90% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 45%),
      repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(16, 185, 129, 0.02) 20px, rgba(16, 185, 129, 0.02) 21px)
    `
  };

  const [isLoading, setIsLoading] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── DATA ─────────────────────────────────────────────────────────────────
  const facilities = [
    { name: 'Laundry', Icon: LaundryIcon },
    { name: 'Gym', Icon: GymIcon },
    { name: 'Indoor Games', Icon: IndoorGamesIcon },
    { name: 'Reading Hall', Icon: ReadingHallIcon },
    { name: 'Purified Water', Icon: WaterPurifierIcon },
    { name: 'Generator', Icon: GeneratorIcon },
  ];

  const hostelLifeCards = [
    {
      Icon: SunIcon,
      title: 'Morning Routine',
      desc: 'Wake-up bell at 5:30 AM. Morning PT and yoga sessions on the sports ground help students start the day energised.',
    },
    {
      Icon: UtensilsIcon,
      title: 'Nutritious Dining',
      desc: 'Three balanced meals a day prepared by a professional kitchen team. Special menus on weekends and festivals.',
    },
    {
      Icon: BookOpenIcon,
      title: 'Structured Study Hours',
      desc: 'Dedicated evening study hours (6 PM – 10 PM) in supervised classrooms for focused preparation.',
    },
    {
      Icon: ActivityIcon,
      title: 'Recreation & Sports',
      desc: 'Badminton, cricket, football and indoor games available in the evening. Gym open 5 AM – 8 PM daily.',
    },
    {
      Icon: UsersIcon,
      title: 'Community & Bonding',
      desc: 'Monthly hostel events, cultural nights and inter-block competitions build strong friendships and teamwork.',
    },
    {
      Icon: ShieldIcon,
      title: 'Safety & Security',
      desc: '24/7 CCTV surveillance, biometric entry gates and a dedicated security team ensure a safe and secure campus.',
    },
  ];

  const hostelUpdates = [
    {
      title: 'New Badminton Court Inaugurated',
      date: '02 July 2026',
      badge: 'Sports',
      badgeBg: 'rgba(46,125,50,0.1)',
      badgeColor: '#2E7D32',
    },
    {
      title: 'CCTV Coverage Upgraded to 4K',
      date: '28 June 2026',
      badge: 'Security',
      badgeBg: 'rgba(212,175,55,0.1)',
      badgeColor: 'var(--royal-gold)',
    },
    {
      title: 'New Weekend Special Menu Launched',
      date: '20 June 2026',
      badge: 'Dining',
      badgeBg: 'rgba(74,144,217,0.1)',
      badgeColor: '#4A90D9',
    },
  ];

  const hostelEvents = [
    { name: 'Inter-Block Cricket Tournament', date: '10 July 2026' },
    { name: 'Hostel Cultural Night', date: '18 July 2026' },
    { name: 'Room Cleanliness Competition', date: '25 July 2026' },
  ];

  const contacts = [
    { role: 'Chief Warden', name: 'Mr. Suresh Kumar', phone: '+91 98765 43210' },
    { role: 'Block B Warden', name: 'Mrs. Priya Nair', phone: '+91 98765 11223' },
    { role: 'Medical Officer', name: 'Dr. Anand Rao', phone: '+91 98765 55667' },
    { role: 'Security Head', name: 'Mr. Ravi Teja', phone: '+91 98765 77889' },
  ];

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="view-container" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <div style={{ width: 28, height: 28, borderRadius: 14 }} className="shimmer-item" />
          <div style={{ width: 160, height: 18, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 28 }} />
        </header>
        <main style={styles.content}>
          {[160, 280, 200, 180, 220].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          ))}
        </main>
      </div>
    );
  }

  // ─── CONTACTS MODAL ───────────────────────────────────────────────────────
  if (showContacts) {
    return (
      <div className="view-container anim-slide-up" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <button onClick={() => setShowContacts(false)} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={styles.appBarTitle}>Hostel Contacts</h2>
          <div style={{ width: 28 }} />
        </header>
        <main style={styles.content}>
          {contacts.map((c, idx) => (
            <GlassCard key={idx} hoverable={true} style={styles.contactCard} className="anim-slide-up">
              <div style={styles.contactAvatar}>
                {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={styles.contactInfo}>
                <span style={styles.contactRole}>{c.role}</span>
                <h4 style={styles.contactName}>{c.name}</h4>
                <span style={styles.contactPhone}>{c.phone}</span>
              </div>
            </GlassCard>
          ))}
        </main>
      </div>
    );
  }

  // ─── MAIN VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="view-container anim-slide-up" style={customBackgroundStyle}>
      {/* Header */}
      <header style={styles.appBar}>
        <button onClick={onClose} style={styles.backBtn} className="press-interactive">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={styles.appBarTitle}>Hostel &amp; Wellness</h2>
        <div style={{ width: 28 }} />
      </header>

      <main style={styles.content}>

        {/* Room Details */}
        <GlassCard hoverable={false} style={styles.roomCard} className="anim-scale-in">
          <div style={styles.roomHeader}>
            <div style={styles.roomIconCircle} className="glass-gold-ring">
              <HomeIcon />
            </div>
            <div>
              <span style={styles.roomCardLabel}>My Hostel Room</span>
              <h3 style={styles.roomCardTitle}>Block B — Room 214</h3>
            </div>
          </div>
          <div style={styles.roomDetailsGrid}>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Block</span>
              <span style={styles.roomDetailVal}>B (Boys)</span>
            </div>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Room No.</span>
              <span style={styles.roomDetailVal}>214</span>
            </div>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Floor</span>
              <span style={styles.roomDetailVal}>2nd Floor</span>
            </div>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Type</span>
              <span style={styles.roomDetailVal}>Triple Sharing</span>
            </div>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Roommates</span>
              <span style={styles.roomDetailVal}>Arjun K, Rahul M</span>
            </div>
            <div style={styles.roomDetailItem}>
              <span style={styles.roomDetailKey}>Warden</span>
              <span style={styles.roomDetailVal}>Mrs. Priya Nair</span>
            </div>
          </div>
        </GlassCard>

        {/* Life at the Hostel */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Life at the Hostel</h3>
          <div style={styles.lifeCardsGrid}>
            {hostelLifeCards.map((card, idx) => {
              const CardIcon = card.Icon;
              return (
                <GlassCard
                  key={idx}
                  hoverable={true}
                  style={styles.lifeCard}
                  className="stagger-anim"
                >
                  <div style={styles.lifeIconCircle} className="glass-gold-ring">
                    <CardIcon />
                  </div>
                  <h4 style={styles.lifeCardTitle}>{card.title}</h4>
                  <p style={styles.lifeCardDesc}>{card.desc}</p>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* Hostel Updates */}
        <section style={styles.section} className="anim-slide-up stagger-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BellIcon />
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Hostel Updates</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hostelUpdates.map((upd, idx) => (
              <GlassCard key={idx} hoverable={true} style={styles.updateCard} className="stagger-anim">
                <div style={{ flex: 1 }}>
                  <h4 style={styles.updateTitle}>{upd.title}</h4>
                  <span style={styles.updateDate}>{upd.date}</span>
                </div>
                <span style={{ ...styles.updateBadge, backgroundColor: upd.badgeBg, color: upd.badgeColor }}>
                  {upd.badge}
                </span>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Medical Support */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <h3 style={styles.sectionTitle}>Medical Support</h3>
          <GlassCard hoverable={false} style={styles.medicalCard}>
            <div style={styles.medicalHeader}>
              <div style={styles.medicalIconCircle} className="glass-gold-ring">
                <MedicalIcon />
              </div>
              <div>
                <h4 style={styles.medicalTitle}>Campus Health Centre</h4>
                <span style={styles.medicalSub}>Available 24 Hours — 7 Days</span>
              </div>
            </div>
            <div style={styles.medicalDetailGrid}>
              <div style={styles.medicalDetailItem}>
                <span style={styles.medicalDetailKey}>Doctor</span>
                <span style={styles.medicalDetailVal}>Dr. Anand Rao</span>
              </div>
              <div style={styles.medicalDetailItem}>
                <span style={styles.medicalDetailKey}>Clinic Hours</span>
                <span style={styles.medicalDetailVal}>8 AM – 8 PM</span>
              </div>
              <div style={styles.medicalDetailItem}>
                <span style={styles.medicalDetailKey}>Emergency</span>
                <span style={{ ...styles.medicalDetailVal, color: '#D32F2F', fontWeight: 800 }}>24/7 On-Call</span>
              </div>
              <div style={styles.medicalDetailItem}>
                <span style={styles.medicalDetailKey}>Ambulance</span>
                <span style={styles.medicalDetailVal}>On Campus</span>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Hostel Facilities */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <h3 style={styles.sectionTitle}>Hostel Facilities</h3>
          <div style={styles.facilitiesGrid}>
            {facilities.map((fac, idx) => {
              const FacIcon = fac.Icon;
              return (
                <GlassCard key={idx} hoverable={true} style={styles.facilityCard} className="stagger-anim">
                  <div style={styles.facilityIconWrap}>
                    <FacIcon />
                  </div>
                  <span style={styles.facilityName}>{fac.name}</span>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* Hostel Events */}
        <section style={styles.section} className="anim-slide-up stagger-5">
          <h3 style={styles.sectionTitle}>Upcoming Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hostelEvents.map((ev, idx) => (
              <GlassCard key={idx} hoverable={true} style={styles.eventCard}>
                <div style={styles.eventIconCircle}>
                  <CalendarIcon />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={styles.eventTitle}>{ev.name}</h4>
                  <span style={styles.eventDate}>{ev.date}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Contact Management */}
        <section style={styles.section} className="anim-slide-up stagger-5">
          <h3 style={styles.sectionTitle}>Contacts</h3>
          <GlassCard hoverable={false} style={styles.contactsTeaser}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={styles.contactsTeaserIcon} className="glass-gold-ring">
                <UsersIcon />
              </div>
              <div>
                <h4 style={styles.contactsTeaserTitle}>Hostel Staff Contacts</h4>
                <span style={styles.contactsTeaserSub}>Wardens, medical team & security</span>
              </div>
            </div>
            <button
              onClick={() => { setShowContacts(true); triggerToast('Loading contacts...'); }}
              style={styles.contactMgmtBtn}
              className="press-interactive"
            >
              <ContactMgmtIcon />
              Contact Management
            </button>
          </GlassCard>
        </section>

      </main>

      {/* Toast */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard}>
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
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
  },
  appBar: {
    height: 'calc(120px + var(--safe-area-top))',
    paddingTop: 'calc(48px + var(--safe-area-top))',
    paddingLeft: '20px',
    paddingRight: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--glass-bg)',
    borderBottom: '1.5px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  appBarTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
  content: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    paddingBottom: '40px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  },

  // Room Card
  roomCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1.5px solid rgba(212,175,55,0.22)',
    borderRadius: 'var(--radius-lg)',
  },
  roomHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  roomIconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roomCardLabel: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  roomCardTitle: {
    fontSize: '17px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    margin: 0,
    lineHeight: 1.2,
  },
  roomDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    background: 'rgba(0,0,0,0.02)',
    borderRadius: '14px',
    padding: '14px',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  roomDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  roomDetailKey: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  roomDetailVal: {
    fontSize: '13.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },

  // Life Cards
  lifeCardsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  lifeCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1.5px solid rgba(212,175,55,0.15)',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  lifeIconCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lifeCardTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    margin: 0,
  },
  lifeCardDesc: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    lineHeight: 1.5,
    margin: 0,
  },

  // Updates
  updateCard: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1.5px solid rgba(0,0,0,0.05)',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.2s ease',
  },
  updateTitle: {
    fontSize: '13.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    margin: '0 0 3px 0',
  },
  updateDate: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  updateBadge: {
    fontSize: '10px',
    fontWeight: 800,
    padding: '3px 9px',
    borderRadius: '20px',
    flexShrink: 0,
  },

  // Medical
  medicalCard: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1.5px solid rgba(212,175,55,0.2)',
    borderRadius: 'var(--radius-lg)',
  },
  medicalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  medicalIconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  medicalTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    margin: 0,
  },
  medicalSub: {
    fontSize: '11px',
    color: '#2E7D32',
    fontWeight: 700,
  },
  medicalDetailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    background: 'rgba(0,0,0,0.02)',
    borderRadius: '12px',
    padding: '12px 14px',
  },
  medicalDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  medicalDetailKey: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  medicalDetailVal: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },

  // Facilities
  facilitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  facilityCard: {
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    border: '1.5px solid rgba(0,0,0,0.06)',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  },
  facilityIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212,175,55,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityName: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    textAlign: 'center',
  },

  // Events
  eventCard: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1.5px solid rgba(212,175,55,0.15)',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.2s ease',
  },
  eventIconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212,175,55,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventTitle: {
    fontSize: '13.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    margin: '0 0 3px 0',
  },
  eventDate: {
    fontSize: '11px',
    color: 'var(--royal-gold)',
    fontWeight: 700,
  },

  // Contacts Teaser
  contactsTeaser: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1.5px solid rgba(212,175,55,0.2)',
    borderRadius: 'var(--radius-lg)',
  },
  contactsTeaserIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contactsTeaserTitle: {
    fontSize: '14.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    margin: 0,
  },
  contactsTeaserSub: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  contactMgmtBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #E5C158 0%, #B38F4D 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '13.5px',
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 16px rgba(212,175,55,0.3)',
    width: '100%',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease',
  },

  // Contact Card (full page)
  contactCard: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    border: '1.5px solid rgba(212,175,55,0.18)',
    borderRadius: 'var(--radius-md)',
  },
  contactAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
    border: '1.5px solid rgba(212,175,55,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 900,
    color: 'var(--royal-gold)',
    flexShrink: 0,
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  contactRole: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  contactName: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    margin: 0,
  },
  contactPhone: {
    fontSize: '12px',
    color: 'var(--royal-gold)',
    fontWeight: 700,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: '24px',
    left: '20px',
    right: '20px',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  toastCard: {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    border: '1.5px solid rgba(212,175,55,0.3)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: '16px',
  },
  toastText: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
};

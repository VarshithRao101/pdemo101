import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { ErrorState } from '../components/common/FeedbackStates';
import { useNavigation } from '../context/NavigationContext';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { fetchBulletins, type Bulletin } from '../services/studentService';
import { onSocketEvent } from '../services/socketClient';

// --- ANNOUNCEMENT CATEGORY ICONS ---
const AcademicsAnnouncementIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const HostelAnnouncementIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const EventAnnouncementIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const HolidayAnnouncementIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FilterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const EmptyUpdatesIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ opacity: 0.85 }}>
    <circle cx="60" cy="60" r="35" fill="rgba(212, 175, 55, 0.08)" filter="blur(8px)" />
    <circle cx="60" cy="55" r="22" stroke="rgba(212,175,55,0.2)" strokeWidth="2" strokeDasharray="5 5" />
    <path d="M60 42v18M60 67h.01" stroke="var(--royal-gold)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

interface UpdatesViewProps {
  onClose?: () => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulse, setLivePulse] = useState(false);
  const { isMobile, setIsDrawerOpen, theme } = useNavigation();

  const customBackgroundStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: theme === 'light' ? '#F5F3FF' : '#0B0B1E',
    backgroundImage: `
      radial-gradient(circle at 10% 10%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 90% 90%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
      repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(139, 92, 246, 0.015) 15px, rgba(139, 92, 246, 0.015) 30px)
    `
  };

  // Simulation Empty State hook
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  useEffect(() => {
    fetchBulletins()
      .then(data => {
        setBulletins(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Bulletins fetch error:', err);
        setFetchError(err?.message || 'Failed to load announcements.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const refreshBulletins = async () => {
      setLivePulse(true);
      try {
        const data = await fetchBulletins();
        setBulletins(data);
        setFetchError(null);
      } catch (err) {
        console.error('UpdatesView live refresh error:', err);
      } finally {
        window.setTimeout(() => setLivePulse(false), 1400);
      }
    };

    const unsubscribe = onSocketEvent('bulletin:updated', refreshBulletins);
    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Map bulletin category → icon component and priority colour
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'event': return EventAnnouncementIcon;
      case 'holiday': return HolidayAnnouncementIcon;
      case 'circular':
      case 'notice':
      case 'announcement': return AcademicsAnnouncementIcon;
      default: return HostelAnnouncementIcon;
    }
  };

  const getCategoryPriorityColor = (category: string) => {
    if (category === 'notice') return 'rgba(211, 47, 47, 0.25)'; // treat notice as emergency-like
    if (category === 'event') return 'rgba(0, 0, 0, 0.05)';
    if (category === 'holiday') return 'rgba(0, 0, 0, 0.05)';
    return 'rgba(212, 175, 55, 0.3)';
  };

  // Map DB category to the filter chip value strings
  const categoryToFilter: Record<string, string> = {
    announcement: 'Announcement',
    circular: 'Academics',
    notice: 'Emergency',
    event: 'Event',
    holiday: 'Holiday',
    gallery: 'Event',
  };

  // Build the live feed from API data
  const announcementFeed = bulletins.map((b, idx) => ({
    id: idx + 1,
    category: categoryToFilter[b.category] || 'Announcement',
    badgeText: b.category.charAt(0).toUpperCase() + b.category.slice(1),
    title: b.title,
    desc: b.content,
    date: b.date,
    time: '',
    priorityColor: getCategoryPriorityColor(b.category),
    Icon: getCategoryIcon(b.category),
  }));

  // Upcoming events — from bulletins with category 'event'
  const upcomingEvents = bulletins
    .filter(b => b.category === 'event')
    .map(b => ({ title: b.title, date: b.date, desc: b.content }));

  // Holiday list — from bulletins with category 'holiday'
  const holidayList = bulletins
    .filter(b => b.category === 'holiday')
    .map(b => ({ title: b.title, date: b.date, desc: b.content }));

  const filteredFeed = activeFilter === 'All'
    ? announcementFeed
    : announcementFeed.filter(ann => ann.category === activeFilter);

  const filterChips = [
    { label: 'All', value: 'All' },
    { label: 'Announcements', value: 'Announcement' },
    { label: 'Academics', value: 'Academics' },
    { label: 'Hostel', value: 'Hostel' },
    { label: 'Events', value: 'Event' },
    { label: 'Holidays', value: 'Holiday' },
    { label: 'Emergency', value: 'Emergency' }
  ];

  if (isLoading) {
    return (
      <div className="view-container" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <div style={{ width: 24, height: 24 }} className="shimmer-item" />
          <div style={{ width: 120, height: 24, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 24, height: 24 }} className="shimmer-item" />
        </header>

        <div style={styles.content}>
          <div style={{ height: 130, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} style={{ width: 80, height: 32, borderRadius: 16 }} className="shimmer-item" />
            ))}
          </div>

          <div style={{ height: 160, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="view-container" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          {onClose && (
            <button onClick={onClose} style={styles.backBtn} className="press-interactive">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          <h1 style={styles.title}>Updates</h1>
          <div style={{ width: 28 }} />
        </header>
        <div style={styles.content}>
          <ErrorState
            title="Failed to Load Announcements"
            message={fetchError}
            onRetry={() => { setFetchError(null); setIsLoading(true); fetchBulletins().then(d => { setBulletins(d); setIsLoading(false); }).catch(e => { setFetchError(e?.message || 'Retry failed'); setIsLoading(false); }); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view-container anim-slide-up" style={customBackgroundStyle}>
      {/* Sticky App Header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          {onClose ? (
            <button onClick={onClose} style={styles.backBtn} className="press-interactive">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            isMobile && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--dark-charcoal)',
                  cursor: 'pointer',
                  padding: '4px 12px 4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="press-interactive"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )
          )}
          <div>
            <h1 style={styles.title}>Updates</h1>
            <p style={styles.subtitle}>Stay informed with the latest announcements</p>
          </div>
          <div style={styles.headerActions}>
            <LiveConnectionIndicator compact />
            <button
              onClick={() => triggerToast('Search portal under construct.')}
              style={styles.headerIconBtn}
              className="press-interactive"
              aria-label="Search updates"
            >
              <SearchIcon />
            </button>
            <button
              onClick={() => triggerToast('Filter configurations loaded.')}
              style={styles.headerIconBtn}
              className="press-interactive"
              aria-label="Filter updates"
            >
              <FilterIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Main content body */}
      <main style={styles.content}>

        {/* Top Priority Alert (Hero Card) */}
        <GlassCard hoverable={false} style={styles.heroCard} className={`anim-scale-in ${livePulse ? 'anim-pulse-gold' : ''}`}>
          <div style={styles.heroDetails}>
            <div style={styles.alertBadgeRow}>
              <span style={styles.alertIcon}></span>
              <span style={styles.alertLabel}>Important Announcement</span>
            </div>
            <h2 style={styles.heroTitleText}>Parent-Teacher Meeting</h2>
            <p style={styles.heroDetailsText}>
              A mandatory meeting to evaluate the performance of Term 1.
            </p>
            <div style={styles.heroMetaGrid}>
              <div style={styles.heroMetaItem}>
                <span style={styles.heroMetaLabel}>Date:</span>
                <span style={styles.heroMetaVal}>15 July 2026</span>
              </div>
              <div style={styles.heroMetaItem}>
                <span style={styles.heroMetaLabel}>Venue:</span>
                <span style={styles.heroMetaVal}>Auditorium Block A</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* HORIZONTAL CATEGORY FILTER CHIPS */}
        <div style={styles.chipScrollerContainer}>
          <div style={styles.chipScroller}>
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => {
                  setActiveFilter(chip.value);
                  triggerToast(`Filter changed to ${chip.label}`);
                }}
                style={{
                  ...styles.filterChip,
                  backgroundColor: activeFilter === chip.value ? 'var(--dark-charcoal)' : 'rgba(255,255,255,0.45)',
                  color: activeFilter === chip.value ? '#fff' : 'var(--dark-charcoal)',
                  borderColor: activeFilter === chip.value ? 'var(--dark-charcoal)' : 'rgba(255,255,255,0.7)',
                }}
                className="press-interactive"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* CENTRAL CIRCULARS FEED CONTAINER */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>Circulars Notice Feed</h3>
            <button
              onClick={() => {
                setSimulateEmpty(!simulateEmpty);
                triggerToast(simulateEmpty ? 'List feed loaded.' : 'Empty state simulated.');
              }}
              style={styles.emptyStateToggleBtn}
              className="press-interactive"
            >
              {simulateEmpty ? 'Show notices' : 'Simulate Empty'}
            </button>
          </div>

          {simulateEmpty || filteredFeed.length === 0 ? (
            /* Premium Empty State Illustration Block */
            <GlassCard hoverable={false} style={styles.emptyStateCard}>
              <EmptyUpdatesIllustration />
              <h4 style={styles.emptyStateTitle}>No new updates available</h4>
              <p style={styles.emptyStateDesc}>
                There are no circulars in this category right now. Check back later for campus notices.
              </p>
            </GlassCard>
          ) : (
            <div style={styles.feedList} className={livePulse ? 'anim-pulse-gold' : ''}>
              {filteredFeed.map((ann) => {
                const CategoryIcon = ann.Icon;
                return (
                  <GlassCard
                    key={ann.id}
                    hoverable={false}
                    style={{
                      ...styles.announcementCard,
                      borderLeft: `5px solid ${ann.category === 'Emergency' ? '#D32F2F' : 'var(--royal-gold)'}`
                    }}
                  >
                    <div style={styles.annCardHeader}>
                      <div style={styles.annBadgeWrapper}>
                        <CategoryIcon />
                        <span
                          style={{
                            ...styles.categoryBadge,
                            color: ann.category === 'Emergency' ? '#D32F2F' : 'var(--royal-gold)',
                            backgroundColor: ann.category === 'Emergency' ? 'rgba(211,47,47,0.06)' : 'rgba(212,175,55,0.08)'
                          }}
                        >
                          {ann.category}
                        </span>
                      </div>
                      <span style={styles.annTimeText}>{ann.date} • {ann.time}</span>
                    </div>

                    <h4 style={styles.annTitleText}>{ann.title}</h4>
                    <p style={styles.annDescText}>{ann.desc}</p>

                    <div style={styles.annCardActions}>
                      <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 550 }}>Official circular verified</span>
                      <button
                        onClick={() => triggerToast(`Displaying details for circular #${ann.id}...`)}
                        style={styles.annActionBtn}
                        className="press-interactive"
                      >
                        View Notice
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </section>

        {/* UPCOMING EVENTS SCROLLER */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <h3 style={styles.sectionTitle}>Upcoming Events</h3>
          <div style={styles.eventsScroller}>
            {upcomingEvents.map((evt, idx) => (
              <GlassCard key={idx} hoverable={true} style={styles.eventCard}>
                <div style={styles.eventCardBadgeRow}>
                  <span style={styles.eventEmoji}></span>
                  <span style={styles.eventDateText}>{evt.date}</span>
                </div>
                <h4 style={styles.eventCardTitle}>{evt.title}</h4>
                <p style={styles.eventCardDesc}>{evt.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* HOLIDAY LIST TIMELINE */}
        <section style={{ ...styles.section, paddingBottom: '32px' }} className="anim-slide-up stagger-4">
          <h3 style={styles.sectionTitle}>Holiday Calendar</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineLine} />
            {holidayList.map((item, idx) => (
              <div key={idx} style={styles.timelineItem}>
                <div style={styles.timelineNode} className="glass-panel">
                  <span style={{ fontSize: '10px' }}></span>
                </div>
                <div style={styles.timelineCard} className="glass-panel">
                  <div style={styles.timelineCardMeta}>
                    <span style={styles.timelineTitle}>{item.title}</span>
                    <span style={styles.timelineSubtitle}>{item.desc}</span>
                  </div>
                  <span style={styles.timelineDateBadge}>{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Shared success toast snackbar */}
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
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
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
    padding: 'calc(24px + var(--safe-area-top)) 24px 16px 24px',
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
  headerActions: {
    display: 'flex',
    gap: '8px',
    marginLeft: 'auto',
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
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heroCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 24px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(212, 175, 55, 0.3)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '24px',
  },
  heroDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  alertBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  alertIcon: {
    fontSize: '14px',
  },
  alertLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#D32F2F',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  heroTitleText: {
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    marginTop: '6px',
  },
  heroDetailsText: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.4',
    marginTop: '4px',
    textAlign: 'left',
  },
  heroMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '12px',
    borderTop: '1px solid rgba(0,0,0,0.03)',
    paddingTop: '10px',
    width: '100%',
  },
  heroMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11.5px',
  },
  heroMetaLabel: {
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  heroMetaVal: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
  },

  /* CHIPS SCROLLER styles */
  chipScrollerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  chipScroller: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },
  filterChip: {
    scrollSnapAlign: 'start',
    flex: '0 0 auto',
    padding: '8px 16px',
    borderRadius: '16px',
    border: '1px solid',
    fontSize: '12px',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
    boxShadow: 'var(--shadow-sm)',
    outline: 'none',
  },

  /* PINNED ANNOUNCEMENTS section */
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
  emptyStateToggleBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '11.5px',
    fontWeight: 750,
    color: 'var(--royal-gold)',
    cursor: 'pointer',
  },
  emptyStateCard: {
    padding: '36px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyStateTitle: {
    fontSize: '14.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginTop: '12px',
  },
  emptyStateDesc: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    marginTop: '6px',
    lineHeight: '1.4',
    maxWidth: '240px',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  announcementCard: {
    padding: '16px 20px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  annCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annBadgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  categoryBadge: {
    fontSize: '9.5px',
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  annTimeText: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  annTitleText: {
    fontSize: '14.5px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    textAlign: 'left',
    lineHeight: '1.3',
  },
  annDescText: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.45',
    textAlign: 'left',
  },
  annCardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(0,0,0,0.03)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  annActionBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.04)',
    color: 'var(--dark-charcoal)',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  /* EVENTS GRID */
  eventsScroller: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  eventCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1.5px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '18px',
    textAlign: 'left',
  },
  eventCardBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  eventEmoji: {
    fontSize: '14px',
  },
  eventDateText: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  eventCardTitle: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  eventCardDesc: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.4',
    marginTop: '4px',
  },

  /* TIMELINE CONTAINER */
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    paddingLeft: '8px',
  },
  timelineLine: {
    position: 'absolute',
    left: '23px',
    top: '12px',
    bottom: '12px',
    width: '1.5px',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    position: 'relative',
  },
  timelineNode: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '1.5px solid rgba(212,175,55,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineCard: {
    flex: 1,
    padding: '14px 18px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  timelineTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  timelineSubtitle: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  timelineDateBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
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

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { LeaveGatePassView } from './LeaveGatePassView';
import { ContactUniversityView } from './ContactUniversityView';
import { HostelLifeView } from './HostelLifeView';
import { AcademicsView } from './AcademicsView';
import { UpdatesView } from './UpdatesView';
import { ProfileView } from './ProfileView';
import { InspireLogo } from '../components/common/InspireLogo';

// --- PREMIUM SVG ICONS ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const AnnouncementsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const AchievementsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const ExamResultsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const FeePaymentsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

const AttendanceIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="15" rx="2" />
    <line x1="16" y1="2" x2="16" y2="4" />
    <line x1="8" y1="2" x2="8" y2="4" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const OpinionPollIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const ParentConcernsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const WellnessIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const GatePassIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M9 5v14" />
    <path d="M15 5v14" />
  </svg>
);

const EventsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const BusTrackingIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="12" rx="2" />
    <circle cx="8" cy="20" r="2" />
    <circle cx="16" cy="20" r="2" />
  </svg>
);

const AssignmentsIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

const AlertTriangleSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" strokeWidth="2.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

type SubPageType = 'grid' | 'attendance' | 'marks' | 'fee' | 'assignments' | 'exams' | 'results' | 'achievements' | 'certificates' | 'leave' | 'contact' | 'hostel' | 'events' | 'announcements' | 'notifications' | 'poll' | 'bus' | 'profile';

export const DashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [annIndex, setAnnIndex] = useState(0);
  const [subPage, setSubPage] = useState<SubPageType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { setAcademicsTab, theme, setThemeMode, setIsDrawerOpen, isMobile } = useNavigation();

  // Poll state variables
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({
    'Excellent': 42,
    'Good': 35,
    'Average': 15,
    'Needs Improvement': 8
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const smartCards = [
    {
      id: 1,
      type: 'fee',
      icon: <AlertTriangleSvg />,
      title: 'Fee Pending',
      desc: '₹60,000 due before 15 August 2026.',
      actionLabel: 'View Fees',
      color: 'rgba(211,47,47,0.06)',
      borderColor: 'rgba(211,47,47,0.25)',
      onClick: () => {
        setAcademicsTab('fee');
        setSubPage('fee');
      }
    },
    {
      id: 2,
      type: 'exams',
      icon: <InfoSvg />,
      title: 'Upcoming Exam',
      desc: 'Unit Test begins in 3 Days.',
      actionLabel: 'View Schedule',
      color: 'rgba(212,175,55,0.06)',
      borderColor: 'rgba(212,175,55,0.3)',
      onClick: () => {
        setAcademicsTab('marks');
        setSubPage('marks');
      }
    },
    {
      id: 3,
      type: 'leave',
      icon: <InfoSvg />,
      title: 'Leave Approved',
      desc: 'Hostel Home Leave request has been approved.',
      actionLabel: 'View Gate Pass',
      color: 'rgba(46,125,50,0.06)',
      borderColor: 'rgba(46,125,50,0.25)',
      onClick: () => {
        setSubPage('leave');
      }
    },
    {
      id: 4,
      type: 'announcements',
      icon: <InfoSvg />,
      title: 'New Announcement',
      desc: 'Science Exhibition registration closes tomorrow.',
      actionLabel: 'Read notice',
      color: 'rgba(33,150,243,0.06)',
      borderColor: 'rgba(33,150,243,0.25)',
      onClick: () => {
        setSubPage('announcements');
      }
    }
  ];

  useEffect(() => {
    if (isLoading || subPage !== 'grid') return;
    const interval = setInterval(() => {
      setAnnIndex((prev) => (prev + 1) % smartCards.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isLoading, subPage, smartCards.length]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleVote = (option: string) => {
    if (hasVoted) return;
    setSelectedPollOption(option);
    setVotes(prev => ({
      ...prev,
      [option]: prev[option] + 1
    }));
    setHasVoted(true);
    triggerToast('Thank you for voting!');
  };

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  // EXPLICIT 3X4 (12 GRID ITEMS) LAYOUT
  const gridItems: Array<{
    type: SubPageType;
    label: string;
    sub: string;
    Icon: React.ComponentType;
    hasBadge?: boolean;
    bgColor: string;
    iconBg: string;
    iconColor: string;
  }> = [
    { type: 'announcements', label: 'Announcements', sub: 'Notice Board', Icon: AnnouncementsIconSvg, bgColor: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(96,165,250,0.04))', iconBg: 'rgba(59,130,246,0.16)', iconColor: '#2563EB' },
    { type: 'achievements', label: 'Achievements', sub: 'Awards & Honors', Icon: AchievementsIconSvg, bgColor: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.06))', iconBg: 'rgba(245,158,11,0.16)', iconColor: '#B45309' },
    { type: 'results', label: 'Exam Results', sub: 'Report Cards', Icon: ExamResultsIconSvg, bgColor: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(52,211,153,0.06))', iconBg: 'rgba(16,185,129,0.16)', iconColor: '#0F766E' },
    { type: 'fee', label: 'Fee Payments', sub: 'Payments & Receipts', Icon: FeePaymentsIconSvg, bgColor: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(251,113,133,0.06))', iconBg: 'rgba(239,68,68,0.16)', iconColor: '#B91C1C' },
    { type: 'attendance', label: 'Attendance', sub: 'Daily Report', Icon: AttendanceIconSvg, bgColor: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(93,173,238,0.06))', iconBg: 'rgba(59,130,246,0.16)', iconColor: '#1D4ED8' },
    { type: 'poll', label: 'Opinion Poll', sub: 'Share Feedback', Icon: OpinionPollIconSvg, bgColor: 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(192,132,252,0.06))', iconBg: 'rgba(168,85,247,0.16)', iconColor: '#7C3AED' },
    { type: 'contact', label: 'Campus Support', sub: 'Contact Helpdesk', Icon: ParentConcernsIconSvg, bgColor: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(56,189,248,0.06))', iconBg: 'rgba(14,165,233,0.16)', iconColor: '#0369A1' },
    { type: 'hostel', label: 'Wellness', sub: 'Boarding & Health', Icon: WellnessIconSvg, bgColor: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(134,239,172,0.06))', iconBg: 'rgba(34,197,94,0.16)', iconColor: '#15803D' },
    { type: 'leave', label: 'Gate Pass', sub: 'Apply Outing Pass', Icon: GatePassIconSvg, hasBadge: true, bgColor: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(251,191,36,0.08))', iconBg: 'rgba(234,179,8,0.18)', iconColor: '#B45309' },
    { type: 'events', label: 'Events & Gallery', sub: 'Campus Activities', Icon: EventsIconSvg, bgColor: 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(251,191,36,0.06))', iconBg: 'rgba(249,115,22,0.16)', iconColor: '#C2410C' },
    { type: 'bus', label: 'Bus Tracking', sub: 'Transit Routes', Icon: BusTrackingIconSvg, bgColor: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(59,130,246,0.06))', iconBg: 'rgba(14,165,233,0.14)', iconColor: '#0EA5E9' },
    { type: 'assignments', label: 'Assignments', sub: 'Pending Tasks', Icon: AssignmentsIconSvg, bgColor: 'linear-gradient(135deg, rgba(234,88,12,0.16), rgba(251,146,60,0.06))', iconBg: 'rgba(234,88,12,0.16)', iconColor: '#C2410C' }
  ];

  const searchSuggestions = [
    { name: 'Attendance Record', route: 'attendance', action: () => { setAcademicsTab('attendance'); setSubPage('attendance'); } },
    { name: 'Fees Details', route: 'fee', action: () => { setAcademicsTab('fee'); setSubPage('fee'); } },
    { name: 'Apply Leave Gate Pass', route: 'leave', action: () => setSubPage('leave') },
    { name: 'Results Card', route: 'results', action: () => { setAcademicsTab('results'); setSubPage('results'); } },
    { name: 'Hostel Mess Info', route: 'hostel', action: () => setSubPage('hostel') },
    { name: 'Contact Warden', route: 'contact', action: () => setSubPage('contact') },
    { name: 'Announcements Notice', route: 'announcements', action: () => setSubPage('announcements') }
  ];

  const filteredSuggestions = searchSuggestions.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="view-container" style={styles.container}>
        <div style={styles.appBar}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 24, height: 24, borderRadius: 12 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 42, borderRadius: 12 }} className="shimmer-item" />
          <div style={{ height: 140, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ height: 110, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Subpage intercepts
  if (subPage === 'leave') {
    return <LeaveGatePassView onClose={() => setSubPage('grid')} />;
  }
  if (subPage === 'contact') {
    return <ContactUniversityView onClose={() => setSubPage('grid')} />;
  }
  if (subPage === 'hostel') {
    return <HostelLifeView onClose={() => setSubPage('grid')} />;
  }
  if (subPage === 'attendance' || subPage === 'marks' || subPage === 'fee' || subPage === 'results' || subPage === 'achievements') {
    return <AcademicsView onClose={() => setSubPage('grid')} />;
  }
  if (subPage === 'announcements' || subPage === 'notifications') {
    return <UpdatesView onClose={() => setSubPage('grid')} />;
  }
  if (subPage === 'profile') {
    return <ProfileView onClose={() => setSubPage('grid')} />;
  }

  // Opinion Poll Modal page
  if (subPage === 'poll') {
    return (
      <div className="view-container anim-slide-up" style={styles.container}>
        <header style={styles.appBar}>
          <button onClick={() => setSubPage('grid')} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '17px', fontWeight: 800 }}>Campus Opinion Poll</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={{ ...styles.content, paddingBottom: '40px' }}>
          <GlassCard hoverable={false} style={styles.pollCard}>
            <span style={styles.pollTag}>Live Survey</span>
            <h3 style={styles.pollQuestion}>Rate the Quality of Campus Dining & Mess Facilities</h3>
            <p style={styles.pollSub}>Your responses are anonymous and help us improve campus dining.</p>

            <div style={styles.pollOptionsContainer}>
              {Object.keys(votes).map((opt) => {
                const optVotes = votes[opt];
                const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                return (
                  <button
                    key={opt}
                    onClick={() => handleVote(opt)}
                    style={{
                      ...styles.pollOptionBtn,
                      borderColor: selectedPollOption === opt ? 'var(--royal-gold)' : 'rgba(0,0,0,0.06)',
                      background: selectedPollOption === opt ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.5)'
                    }}
                    disabled={hasVoted}
                    className="press-interactive"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                      <span style={{ fontWeight: 700 }}>{opt}</span>
                      {hasVoted && <span style={{ fontWeight: 800 }}>{percentage}%</span>}
                    </div>
                    {hasVoted && (
                      <div
                        style={{
                          ...styles.pollProgressFill,
                          width: `${percentage}%`
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {hasVoted && (
              <p style={styles.pollTotalText}>Total responses logged: {totalVotes}</p>
            )}

            <button onClick={() => setSubPage('grid')} style={styles.pollCloseBtn} className="press-interactive">
              Back to Home
            </button>
          </GlassCard>
        </main>
      </div>
    );
  }

  // Bus Tracking details page
  if (subPage === 'bus') {
    return (
      <div className="view-container anim-slide-up" style={styles.container}>
        <header style={styles.appBar}>
          <button onClick={() => setSubPage('grid')} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '17px', fontWeight: 800 }}>Live Bus Tracking</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={{ ...styles.content, paddingBottom: '40px' }}>
          <GlassCard hoverable={false} style={styles.pollCard}>
            <span style={styles.pollTag}>Live GPS Tracking</span>
            <h3 style={styles.pollQuestion}>Bus Route: Campus to City Hub</h3>
            <p style={styles.pollSub}>Current Transit Route Status: On Time</p>

            <div style={styles.timelineContainer}>
              <div style={styles.timelineRow}>
                <span style={styles.timeDotActive}>●</span>
                <div style={styles.timeDetails}>
                  <strong>Campus Terminal</strong>
                  <p>Departed at 08:30 AM</p>
                </div>
              </div>
              <div style={styles.timelineRow}>
                <span style={styles.timeDotActive}>●</span>
                <div style={styles.timeDetails}>
                  <strong>Highway Junction</strong>
                  <p>Passed at 08:50 AM</p>
                </div>
              </div>
              <div style={styles.timelineRow}>
                <span style={styles.timeDotActive} className="anim-pulse-gold">●</span>
                <div style={styles.timeDetails}>
                  <strong>Sector 4 Circle</strong>
                  <p style={{ color: 'var(--royal-gold)' }}>Arriving in 4 Min</p>
                </div>
              </div>
              <div style={{ ...styles.timelineRow, border: 'none' }}>
                <span style={styles.timeDot}>○</span>
                <div style={styles.timeDetails}>
                  <strong>City Hub Terminal</strong>
                  <p>Scheduled arrival: 09:15 AM</p>
                </div>
              </div>
            </div>

            <div style={styles.driverInfoCard}>
              <span>Driver Contact:</span>
              <strong>Mr. Prasad (+91 98765 43210)</strong>
            </div>

            <button onClick={() => setSubPage('grid')} style={styles.pollCloseBtn} className="press-interactive">
              Back to Home
            </button>
          </GlassCard>
        </main>
      </div>
    );
  }

  // Fallback for other mock modules
  if (subPage !== 'grid') {
    const activeItem = gridItems.find((item) => item.type === subPage) || {
      label: 'Notifications',
      Icon: AnnouncementsIconSvg
    };

    return (
      <div className="view-container anim-slide-up" style={styles.container}>
        <header style={styles.appBar}>
          <button onClick={() => setSubPage('grid')} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 750 }}>{activeItem.label}</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={styles.placeholderContent}>
          <div style={styles.largeIconWrapper} className="glass-panel anim-scale-in">
            <div style={styles.largeIconGold} className="glass-gold-ring">
              <activeItem.Icon />
            </div>
          </div>
          <h3 style={styles.placeholderTitle}>{activeItem.label} Module</h3>
          <p style={styles.placeholderText}>
            The detailed portal for {activeItem.label.toLowerCase()} reports is currently running in prototype simulation mode.
          </p>
          <button onClick={() => setSubPage('grid')} style={styles.closeBtn} className="press-interactive">
            Go Back
          </button>
        </main>
      </div>
    );
  }

  // Search sheet
  if (showGlobalSearch) {
    return (
      <div className="view-container anim-fade-in" style={styles.container}>
        <header style={styles.searchHeader}>
          <button
            onClick={() => {
              setShowGlobalSearch(false);
              setSearchQuery('');
            }}
            style={styles.backBtn}
            className="press-interactive"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <input
            type="text"
            placeholder="Search anything..."
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearBtn} className="press-interactive">
              ✕
            </button>
          )}
        </header>

        <main style={styles.content}>
          {searchQuery === '' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={styles.searchSubtitle}>Recent Searches</h4>
                <div style={styles.recentSearchesList}>
                  {['Attendance', 'Results', 'Fees', 'Hostel'].map((term, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(term);
                      }}
                      style={styles.searchTag}
                      className="press-interactive"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={styles.searchSubtitle}>Suggested Shortcuts</h4>
                <div style={styles.suggestedShortcutsGrid}>
                  {searchSuggestions.map((item, idx) => (
                    <GlassCard
                      key={idx}
                      hoverable={true}
                      onClick={() => {
                        item.action();
                        setShowGlobalSearch(false);
                      }}
                      style={styles.shortcutItemCard}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>{item.name}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-gray)" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.feedList}>
              <h4 style={styles.searchSubtitle}>Search Results ({filteredSuggestions.length})</h4>
              {filteredSuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-gray)' }}>
                  No dashboard modules match your search.
                </div>
              ) : (
                filteredSuggestions.map((item, idx) => (
                  <GlassCard
                    key={idx}
                    hoverable={true}
                    onClick={() => {
                      item.action();
                      setShowGlobalSearch(false);
                    }}
                    style={styles.shortcutItemCard}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--dark-charcoal)' }}>{item.name}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  const activeSmartCard = smartCards[annIndex];

  return (
    <div className="view-container anim-slide-up" style={styles.container}>
      <div style={styles.backgroundVisual} className="anim-float" />
      {/* Top Glass App Bar with Centered Inspire Logo */}
      <header style={styles.appBar}>
        {/* Left Side: Hamburger Menu Button */}
        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-start' }}>
          {isMobile && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={styles.menuBurgerBtn}
              className="press-interactive"
              aria-label="Open navigation menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--dark-charcoal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Centered Logo */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <InspireLogo size="md" />
        </div>

        {/* Right Side: Bell Icon & Desktop Theme Toggle */}
        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          {!isMobile && (
            <button
              onClick={() => setThemeMode(theme === 'light' ? 'Dark' : 'Light')}
              style={styles.appBarBtn}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="press-interactive"
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
          )}

          <button onClick={() => setSubPage('notifications')} style={styles.appBarBtn} className="press-interactive" aria-label="Notifications">
            {/* Flat yellow bell icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div style={styles.badge} className="pulse-badge">3</div>
          </button>
        </div>
      </header>

      {/* Main Scroll Content */}
      <main style={styles.content}>

        {/* PREMIUM GLOBAL SEARCH BAR TRIGGER */}
        <div
          onClick={() => setShowGlobalSearch(true)}
          style={styles.searchBarTrigger}
          className="glass-panel press-interactive"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SearchIcon />
            <span style={styles.searchPlaceholderText}>Search anything...</span>
          </div>
          <span style={styles.searchShortcutBadge}>Search</span>
        </div>

        {/* WELCOME GOLD AVATAR CARD */}
        <GlassCard hoverable={false} style={styles.welcomeCard}>
          <div style={styles.welcomeLeft}>
            <div style={styles.userAvatarContainer} className="glass-gold-ring" onClick={() => setSubPage('profile')}>
              <div style={styles.userAvatar}>PM</div>
            </div>
            <div style={styles.welcomeDetails} onClick={() => setSubPage('profile')}>
              <span style={styles.greetingText}>Good Evening,</span>
              <h2 style={styles.studentName}>Polsani Manoneeth Rao</h2>
              <div style={styles.detailsRow}>
                <span style={styles.detailLabel}>ID:</span>
                <span style={styles.detailVal}>2421604</span>
              </div>
            </div>
          </div>
          <div style={styles.qrContainer} className="press-interactive" onClick={() => setSubPage('profile')}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="url(#goldGradientQR)" strokeWidth="1.5">
              <defs>
                <linearGradient id="goldGradientQR" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5C158" />
                  <stop offset="100%" stopColor="#C5A880" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="6" height="6" rx="1" />
              <rect x="15" y="3" width="6" height="6" rx="1" />
              <rect x="3" y="15" width="6" height="6" rx="1" />
              <path d="M19 19v-4h-4v4h4zm-4-4h-2M15 11h2M11 15h2" />
            </svg>
          </div>
        </GlassCard>

        {/* SMART DASHBOARD SYSTEM (ROTATING CAROUSEL) */}
        <section style={styles.section} className="anim-scale-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>Smart Alert Updates</h3>
            <div style={styles.carouselIndicators}>
              {smartCards.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.indicatorDot,
                    backgroundColor: idx === annIndex ? 'var(--royal-gold)' : 'rgba(0,0,0,0.1)',
                    width: idx === annIndex ? '16px' : '6px'
                  }}
                />
              ))}
            </div>
          </div>

          <GlassCard
            hoverable={false}
            style={{
              ...styles.smartCard,
              backgroundColor: activeSmartCard.color,
              borderColor: activeSmartCard.borderColor
            }}
            className="anim-fade-in"
          >
            <div style={styles.smartCardHeader}>
              <div style={styles.smartEmojiWrapper}>
                {activeSmartCard.icon}
              </div>
              <div style={styles.smartCardTitleCol}>
                <h4 style={styles.smartCardTitleText}>{activeSmartCard.title}</h4>
                <p style={styles.smartCardDescText}>{activeSmartCard.desc}</p>
              </div>
            </div>
            {activeSmartCard.actionLabel && (
              <button
                onClick={activeSmartCard.onClick}
                style={styles.smartCardBtn}
                className="press-interactive"
              >
                {activeSmartCard.actionLabel}
              </button>
            )}
          </GlassCard>
        </section>

        {/* 12 GRID ITEMS LAYOUT (3 columns x 4 rows) */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Academic Portal</h3>
          <div style={styles.grid}>
            {gridItems.map((item, idx) => (
              <GlassCard
                key={item.type}
                onClick={() => {
                  if (item.type === 'attendance') {
                    setAcademicsTab('attendance');
                    setSubPage('attendance');
                  } else if (item.type === 'marks') {
                    setAcademicsTab('marks');
                    setSubPage('marks');
                  } else if (item.type === 'fee') {
                    setAcademicsTab('fee');
                    setSubPage('fee');
                  } else if (item.type === 'results') {
                    setAcademicsTab('results');
                    setSubPage('results');
                  } else if (item.type === 'achievements') {
                    setAcademicsTab('achievements');
                    setSubPage('achievements');
                  } else {
                    setSubPage(item.type);
                  }
                }}
                style={{
                  ...styles.gridCard,
                  background: item.bgColor,
                  borderColor: item.iconBg,
                  animationDelay: `${idx * 40}ms`
                }}
                className="stagger-anim"
              >
                {item.hasBadge && (
                  <div style={styles.newBadge}>New</div>
                )}
                <div
                  style={{
                    ...styles.gridIcon,
                    backgroundColor: item.iconBg,
                    color: item.iconColor,
                    boxShadow: `0 8px 16px ${item.iconBg.replace('0.16', '0.08')}`
                  }}
                  className="glass-gold-ring"
                >
                  <item.Icon />
                </div>
                <h3 style={{ ...styles.gridTitle, color: item.iconColor }}>{item.label}</h3>
                <span style={{ ...styles.gridSubtitle, color: 'var(--muted-gray)' }}>{item.sub}</span>
              </GlassCard>
            ))}
          </div>
        </section>

      </main>

      {/* Shared success toast banner */}
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
    position: 'relative',
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
    backgroundImage: `var(--bg-gradient-overlay)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflowY: 'auto',
  },
  backgroundVisual: {
    position: 'absolute',
    inset: 0,
    background: 'none',
    pointerEvents: 'none',
    zIndex: 0,
  },
  appBar: {
    height: 'calc(72px + var(--safe-area-top))',
    paddingTop: 'var(--safe-area-top)',
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
  menuBurgerBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    paddingBottom: '40px',
  },
  searchBarTrigger: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'var(--card-bg)',
    border: '1.5px solid var(--card-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  searchPlaceholderText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  searchShortcutBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
  },
  welcomeCard: {
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--card-bg)',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: 'var(--radius-lg)',
  },
  welcomeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  userAvatarContainer: {
    padding: '2px',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
  },
  welcomeDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  greetingText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  studentName: {
    fontSize: '15.5px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  detailsRow: {
    display: 'flex',
    gap: '4px',
    marginTop: '2px',
  },
  detailLabel: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
  },
  detailVal: {
    fontSize: '9.5px',
    color: 'var(--dark-charcoal)',
    fontWeight: 770,
  },
  qrContainer: {
    padding: '8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.03)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
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
  carouselIndicators: {
    display: 'flex',
    gap: '4px',
  },
  indicatorDot: {
    height: '6px',
    borderRadius: '3px',
    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  smartCard: {
    padding: '16px 20px',
    borderRadius: '20px',
    border: '1.5px solid transparent',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  smartCardHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  smartEmojiWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  smartCardTitleCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  smartCardTitleText: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  smartCardDescText: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.4',
    textAlign: 'left',
  },
  smartCardBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  gridCard: {
    padding: '20px 12px',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: 'var(--card-bg)',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '152px',
  },
  gridIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
    marginBottom: '12px',
    border: '1px solid rgba(255,255,255,0.8)',
  },
  gridTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    lineHeight: '1.2',
  },
  gridSubtitle: {
    fontSize: '8.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '3px',
  },
  newBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: '#D4AF37',
    color: '#fff',
    fontSize: '7.5px',
    fontWeight: 800,
    padding: '1.5px 5px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#D32F2F',
    color: '#fff',
    fontSize: '8.5px',
    fontWeight: 800,
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  searchHeader: {
    height: '64px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'none',
    fontSize: '15px',
    fontFamily: 'var(--font-family)',
    color: 'var(--dark-charcoal)',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-gray)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  searchSubtitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '12px',
  },
  recentSearchesList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  searchTag: {
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    fontWeight: 650,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
  suggestedShortcutsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  shortcutItemCard: {
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '16px',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  placeholderContent: {
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  largeIconWrapper: {
    padding: '16px',
    borderRadius: '30px',
    marginBottom: '20px',
  },
  largeIconGold: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
  },
  placeholderTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginBottom: '8px',
  },
  placeholderText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
    marginBottom: '24px',
    maxWidth: '280px',
  },
  closeBtn: {
    padding: '12px 24px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 750,
    cursor: 'pointer',
  },

  /* POLL STYLING */
  pollCard: {
    padding: '24px 20px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
  },
  pollTag: {
    fontSize: '8px',
    fontWeight: 850,
    color: '#fff',
    backgroundColor: '#D4AF37',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    alignSelf: 'flex-start',
    display: 'inline-block',
  },
  pollQuestion: {
    fontSize: '16px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '10px',
  },
  pollSub: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  pollOptionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px',
  },
  pollOptionBtn: {
    position: 'relative',
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1.5px solid transparent',
    fontSize: '12.5px',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  pollProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(212,175,55,0.15)',
    zIndex: 1,
    transition: 'width 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  pollTotalText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    marginTop: '12px',
    textAlign: 'center',
  },
  pollCloseBtn: {
    marginTop: '20px',
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    border: 'none',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
  },

  /* TIMELINE TRACKING */
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    margin: '20px 0',
    paddingLeft: '10px',
  },
  timelineRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    borderLeft: '1.5px solid rgba(0,0,0,0.06)',
    paddingLeft: '16px',
    position: 'relative',
  },
  timeDotActive: {
    position: 'absolute',
    left: '-5px',
    top: '2px',
    color: 'var(--royal-gold)',
    fontSize: '11px',
    backgroundColor: '#FAFAFA',
  },
  timeDot: {
    position: 'absolute',
    left: '-5px',
    top: '2px',
    color: 'var(--muted-gray)',
    fontSize: '11px',
    backgroundColor: '#FAFAFA',
  },
  timeDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
  },
  driverInfoCard: {
    padding: '12px 16px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: '12px',
    fontSize: '11.5px',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
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

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// --- SHARED PARENT PORTAL COMPONENTS & ICONS ---
const CallIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
  </svg>
);

// --- PARENT DASHBOARD VIEW ---
export const ParentDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGatePass, setShowGatePass] = useState(false);
  const { setAcademicsTab, setActiveTab } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const pendingActions = [
    { title: 'Leave Approval Needed', desc: 'Home Leave Outing Pass requires consent.', action: () => triggerToast('Consent request updated.') },
    { title: 'Parent Meeting RSVP', desc: 'Confirm attendance for July 15 meeting.', action: () => triggerToast('RSVP submitted successfully.') },
    { title: 'Exam Begins in 3 Days', desc: 'Review unit test schedule details.', action: () => { setAcademicsTab('marks'); setActiveTab('academics'); } }
  ];

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 140, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ height: 100, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {/* Top Banner Parent Login Details */}
      <header style={styles.header}>
        <div style={styles.parentWelcomeRow}>
          <div style={styles.avatarMini}>SR</div>
          <div>
            <span style={styles.greetingText}>Good Morning,</span>
            <h2 style={styles.parentWelcomeTitle}>Mr. Sridhar Rao</h2>
            <p style={styles.childMetaText}>Parent of <strong>Polsani Manoneeth Rao</strong> (ID: 2421604)</p>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        
        {/* TOP SUMMARY COMPREHENSIVE STATUS CARD */}
        <GlassCard hoverable={false} style={styles.summaryCard} className="anim-scale-in">
          <div style={styles.summaryHeader}>
            <span style={styles.statusSafeDot}>Safe inside Campus</span>
            <h3 style={styles.sectionTitle}>Child Status Summary</h3>
          </div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Hostel Attendance</span>
              <span style={styles.summaryValue}>Present</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Today Attendance</span>
              <span style={styles.summaryValue}>Present</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Health Status</span>
              <span style={styles.summaryValue}>Normal</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Pending Fees</span>
              <span style={{ ...styles.summaryValue, color: '#2E7D32' }}>No Due</span>
            </div>
          </div>
        </GlassCard>

        {/* ACADEMIC SNAPSHOTS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Academic Snapshot</h3>
          <div style={styles.snapshotGrid}>
            <GlassCard hoverable={false} style={styles.snapshotCard}>
              <span style={styles.snapshotLabel}>Attendance</span>
              <span style={styles.snapshotVal}>95%</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.snapshotCard}>
              <span style={styles.snapshotLabel}>Overall Marks</span>
              <span style={styles.snapshotVal}>92%</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.snapshotCard}>
              <span style={styles.snapshotLabel}>Latest Result</span>
              <span style={{ ...styles.snapshotVal, color: '#2E7D32' }}>PASS</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.snapshotCard}>
              <span style={styles.snapshotLabel}>Class Rank</span>
              <span style={styles.snapshotVal}>#8</span>
            </GlassCard>
          </div>
        </section>

        {/* LEAVE STATUS OUTING PASS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Active Leave Pass</h3>
          <GlassCard hoverable={false} style={styles.leaveStatusCard}>
            <div style={styles.leaveHeader}>
              <div>
                <h4 style={styles.leaveTypeTitle}> Home Leave Request</h4>
                <span style={styles.leaveDateText}>Scheduled: 12 July 2026</span>
              </div>
              <span style={styles.leaveStatusBadge}>Approved</span>
            </div>
            
            {/* Timeline */}
            <div style={styles.leaveTimelineRow}>
              <div style={styles.timelineNodeActive}> Submitted</div>
              <div style={styles.timelineLineActive} />
              <div style={styles.timelineNodeActive}> Approved</div>
              <div style={styles.timelineLineActive} />
              <div style={styles.timelineNodeActive}> QR Ready</div>
            </div>

            <button
              onClick={() => setShowGatePass(true)}
              style={styles.actionBtnPrimary}
              className="press-interactive"
            >
              View Gate Pass
            </button>
          </GlassCard>
        </section>

        {/* PENDING PARENT ACTIONS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Pending Actions</h3>
          <div style={styles.feedList}>
            {pendingActions.map((act, i) => (
              <GlassCard key={i} hoverable={false} style={styles.actionItemCard}>
                <div>
                  <h4 style={styles.actionItemTitle}>{act.title}</h4>
                  <p style={styles.actionItemDesc}>{act.desc}</p>
                </div>
                <button
                  onClick={act.action}
                  style={styles.actionItemBtn}
                  className="press-interactive"
                >
                  View
                </button>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* LATEST RESULTS BANNER */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Latest Examination Results</h3>
          <GlassCard hoverable={false} style={styles.resultSummaryCard}>
            <div>
              <span style={styles.resultExamLabel}>Latest Exam: Unit Test 2</span>
              <h4 style={styles.resultMarksValue}>Overall Percentage: 94%</h4>
              <span style={styles.resultGradeText}>Grade: A+ (Pass)</span>
            </div>
            <button
              onClick={() => { setAcademicsTab('results'); setActiveTab('academics'); }}
              style={styles.actionBtnOutline}
              className="press-interactive"
            >
              View Result
            </button>
          </GlassCard>
        </section>

        {/* RECENT ACTIVITY TIMELINE */}
        <section style={{ ...styles.section, paddingBottom: '32px' }}>
          <h3 style={styles.sectionTitle}>Child Activity Timeline</h3>
          <GlassCard hoverable={false} style={styles.activityCard}>
            <div style={styles.activityTimeline}>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>Today</span>
                <span style={styles.activityDescText}>Present in College (08:50 AM)</span>
              </div>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Hostel Study Hours Completed</span>
              </div>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Mess Lunch & Dinner Verified</span>
              </div>
              <div style={{ ...styles.activityRow, border: 'none', paddingBottom: 0 }}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Hostel Attendance Logged Present</span>
              </div>
            </div>
          </GlassCard>
        </section>

      </main>

      {/* Gate Pass Modal Overlay */}
      {showGatePass && (
        <div style={styles.modalOverlay} onClick={() => setShowGatePass(false)} className="anim-fade-in">
          <div style={styles.gatePassSheet} onClick={(e) => e.stopPropagation()} className="glass-panel-heavy">
            <h3 style={styles.modalTitle}>Hostel Leave Outing Pass</h3>
            <span style={styles.childMetaText}>Student ID: 2421604</span>
            <div style={{ margin: '20px 0' }} className="anim-pulse-gold">
              <QrCodeIllustration />
            </div>
            <div style={styles.gateDetails}>
              <div style={styles.gateRow}>
                <span>Student:</span>
                <strong>Polsani Manoneeth Rao</strong>
              </div>
              <div style={styles.gateRow}>
                <span>Approved Leave:</span>
                <strong>Home Outing</strong>
              </div>
              <div style={styles.gateRow}>
                <span>Valid Date:</span>
                <strong>12 July - 15 July 2026</strong>
              </div>
            </div>
            <button
              onClick={() => setShowGatePass(false)}
              style={{ ...styles.actionBtnOutline, width: '100%', marginTop: '16px', padding: '12px' }}
              className="press-interactive"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Shared success toast notification banner */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// --- PARENT ACADEMICS VIEW ---
export const ParentAcademicsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'academics' | 'hostel'>('academics');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </header>
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      <header style={styles.header}>
        <h1 style={styles.title}>Child Progress</h1>
        <p style={styles.subtitle}>Track child academic performance & hostel wellness</p>
        
        {/* Toggle Segments */}
        <div style={styles.segmentContainer}>
          <button
            onClick={() => setActiveSegment('academics')}
            style={{
              ...styles.segmentBtn,
              backgroundColor: activeSegment === 'academics' ? 'var(--white)' : 'transparent',
              color: activeSegment === 'academics' ? 'var(--royal-gold)' : 'var(--muted-gray)'
            }}
          >
            Academic Performance
          </button>
          <button
            onClick={() => setActiveSegment('hostel')}
            style={{
              ...styles.segmentBtn,
              backgroundColor: activeSegment === 'hostel' ? 'var(--white)' : 'transparent',
              color: activeSegment === 'hostel' ? 'var(--royal-gold)' : 'var(--muted-gray)'
            }}
          >
            Hostel Log & Health
          </button>
        </div>
      </header>

      <main style={styles.content}>
        
        {activeSegment === 'academics' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* PERFORMANCE METRICS */}
            <GlassCard hoverable={false} style={styles.infoSheetCard}>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Overall Academic GPA</span>
                <span style={styles.sheetVal}>A+ (92%)</span>
              </div>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Unit Test 1 Marks</span>
                <span style={styles.sheetVal}>91%</span>
              </div>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Unit Test 2 Marks</span>
                <span style={styles.sheetVal}>94%</span>
              </div>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Term Examinations</span>
                <span style={styles.sheetVal}>92%</span>
              </div>
              <div style={{ ...styles.infoSheetItem, borderBottom: 'none', paddingBottom: 0 }}>
                <span style={styles.sheetLabel}>Class Position</span>
                <span style={styles.sheetVal}>8th Rank in Branch</span>
              </div>
            </GlassCard>

            {/* SYLLABUS STATUS INFO */}
            <section style={{ ...styles.section, paddingBottom: '32px' }}>
              <h3 style={styles.sectionTitle}>Curriculum Progression</h3>
              <GlassCard hoverable={false} style={styles.infoSheetCard}>
                <div style={styles.infoSheetItem}>
                  <span style={styles.sheetLabel}>Mathematics</span>
                  <span style={styles.sheetVal}>88% Syllabus Covered</span>
                </div>
                <div style={styles.infoSheetItem}>
                  <span style={styles.sheetLabel}>Physics</span>
                  <span style={styles.sheetVal}>85% Syllabus Covered</span>
                </div>
                <div style={{ ...styles.infoSheetItem, borderBottom: 'none', paddingBottom: 0 }}>
                  <span style={styles.sheetLabel}>Chemistry</span>
                  <span style={styles.sheetVal}>90% Syllabus Covered</span>
                </div>
              </GlassCard>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* HOSTEL BOARDING DETAILS */}
            <GlassCard hoverable={false} style={styles.infoSheetCard}>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Boarding Location</span>
                <span style={styles.sheetVal}>Block A • Room A-203</span>
              </div>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Study Hours Attendance</span>
                <span style={styles.sheetVal}>Completed (Morning & Evening)</span>
              </div>
              <div style={styles.infoSheetItem}>
                <span style={styles.sheetLabel}>Mess Intake</span>
                <span style={styles.sheetVal}>Breakfast, Lunch and Dinner taken</span>
              </div>
              <div style={{ ...styles.infoSheetItem, borderBottom: 'none', paddingBottom: 0 }}>
                <span style={styles.sheetLabel}>Health Status</span>
                <span style={{ ...styles.sheetVal, color: '#2E7D32', fontWeight: 800 }}>Normal & Fit</span>
              </div>
            </GlassCard>

            {/* WORKING OFFICE HOURS FOR CONTACT */}
            <section style={{ ...styles.section, paddingBottom: '32px' }}>
              <GlassCard hoverable={false} style={styles.infoSheetCard}>
                <h4 style={styles.sectionTitle}>Office Timings</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <div style={styles.aboutMetaRow}>
                    <span>Monday - Friday</span>
                    <span>9:00 AM - 5:00 PM</span>
                  </div>
                  <div style={styles.aboutMetaRow}>
                    <span>Saturday</span>
                    <span>9:00 AM - 1:00 PM</span>
                  </div>
                </div>
              </GlassCard>
            </section>
          </div>
        )}

      </main>
    </div>
  );
};

// --- PARENT UPDATES VIEW ---
export const ParentUpdatesView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const notices = [
    { title: 'Parent-Teacher Meeting RSVP', date: 'Tomorrow (15 July 2026)', desc: 'PTM schedules are active from 10:00 AM in the Seminar Hall Block-A.', priority: 'HIGH PRIORITY' },
    { title: 'Holiday Notice (Independence Day)', date: '15 August 2026', desc: 'Campus outing permits are active on 15 August after PTM flags assemblies.', priority: 'INFO' },
    { title: 'Unit Examination Schedules', date: '12 July 2026', desc: 'UT-3 examinations begin from Monday 12 July.', priority: 'INFO' },
    { title: 'Science Exhibition Registration', date: 'Deadline Today', desc: 'Science models submissions portals close by midnight.', priority: 'DEADLINE' }
  ];

  if (isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </header>
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      <header style={styles.header}>
        <h1 style={styles.title}>Campus Notices</h1>
        <p style={styles.subtitle}>Stay updated with student circulars & guidelines</p>
      </header>

      <main style={{ ...styles.content, paddingBottom: '40px' }}>
        <div style={styles.feedList}>
          {notices.map((note, idx) => (
            <GlassCard key={idx} hoverable={true} style={styles.noticeCard}>
              <div style={styles.noticeHeader}>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: note.priority === 'HIGH PRIORITY' ? 'rgba(211,47,47,0.08)' : 'rgba(212,175,55,0.08)',
                    color: note.priority === 'HIGH PRIORITY' ? '#D32F2F' : 'var(--royal-gold)',
                  }}
                >
                  {note.priority}
                </span>
                <span style={styles.noticeDateText}>{note.date}</span>
              </div>
              <h4 style={styles.noticeTitleText}>{note.title}</h4>
              <p style={styles.noticeDescText}>{note.desc}</p>
              <button
                onClick={() => triggerToast(`Feedback logged for: ${note.title}`)}
                style={{ ...styles.actionBtnOutline, marginTop: '12px', padding: '6px 12px', alignSelf: 'flex-start' }}
                className="press-interactive"
              >
                Acknowledge
              </button>
            </GlassCard>
          ))}
        </div>
      </main>

      {/* Shared success toast notification banner */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// --- PARENT PROFILE VIEW ---
export const ParentProfileView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    const globalLogout = (window as any).logoutUser;
    if (globalLogout) {
      globalLogout();
    } else {
      triggerToast('Redirecting back to PIN authentication...');
    }
  };

  const collegeContacts = [
    { name: 'Hostel Warden', number: '+91 90123 45678' },
    { name: 'Academic Coordinator', number: '+91 90123 45679' },
    { name: 'Principal Office', number: '+91 90123 45680' },
    { name: 'Accounts Office', number: '+91 90123 45606' },
    { name: 'Medical Room', number: '+91 90123 45682' }
  ];

  if (isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </header>
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      <header style={styles.header}>
        <h1 style={styles.title}>Parent Account</h1>
        <p style={styles.subtitle}>Parent configuration and college communications</p>
      </header>

      <main style={{ ...styles.content, paddingBottom: '40px' }}>
        
        {/* PARENT PROFILE CARD */}
        <GlassCard hoverable={false} style={styles.heroCard}>
          <div style={styles.heroHeaderRow}>
            <div style={styles.heroAvatar}>RR</div>
            <div>
              <h2 style={styles.studentName}>Mr. Rajesh Rao</h2>
              <span style={styles.studentID}>Relationship: Father</span>
              <span style={styles.statusBadge}>Connected</span>
            </div>
          </div>
          <div style={styles.heroLineDivider} />
          <div style={styles.heroMetaGrid}>
            <div style={styles.metaRow}>
              <span>Mobile Contact:</span>
              <strong>+91 98480 22338</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Email:</span>
              <strong>sridhar.rao@gmail.com</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Linked Student:</span>
              <strong>Polsani Manoneeth Rao (MPC Section A)</strong>
            </div>
          </div>
        </GlassCard>

        {/* QUICK ACTION COLLEGE CONTACT PANEL */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Contact College Offices</h3>
          <GlassCard hoverable={false} style={styles.infoSheetCard}>
            {collegeContacts.map((contact, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.infoSheetItem,
                  borderBottom: idx === collegeContacts.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.03)',
                  paddingBottom: idx === collegeContacts.length - 1 ? 0 : '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--dark-charcoal)' }}>{contact.name}</span>
                  <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{contact.number}</p>
                </div>
                <button
                  onClick={() => triggerToast(`Dialing voice call to ${contact.name}...`)}
                  style={styles.contactBtnRound}
                  className="press-interactive"
                >
                  <CallIcon />
                </button>
              </div>
            ))}
          </GlassCard>
        </section>

        {/* SYSTEM HELP SETTINGS LINK LIST */}
        <section style={styles.section}>
          <GlassCard hoverable={false} style={styles.infoSheetCard}>
            <div
              onClick={() => triggerToast('Notification settings options are prototype only.')}
              style={styles.settingRowItem}
              className="press-interactive"
            >
              <span>Notifications Preferences</span>
              <span>Enabled</span>
            </div>
            <div
              onClick={() => triggerToast('Appearance toggles are student options.')}
              style={styles.settingRowItem}
              className="press-interactive"
            >
              <span>Appearance Mode</span>
              <span>Light Accent</span>
            </div>
            <div
              onClick={() => triggerToast('Opening Parent Help & FAQ center...')}
              style={{ ...styles.settingRowItem, border: 'none', paddingBottom: 0 }}
              className="press-interactive"
            >
              <span>Help Center & FAQs</span>
              <span>View</span>
            </div>
          </GlassCard>
        </section>

        {/* LOGOUT BUTTON */}
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={styles.logoutBtn}
            className="press-interactive"
          >
            Logout
          </button>
        </div>

      </main>

      {/* Logout confirmation Bottom Sheet overlay */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowLogoutConfirm(false)} className="anim-fade-in">
          <div style={styles.gatePassSheet} onClick={(e) => e.stopPropagation()} className="glass-panel-heavy">
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.gatewayText}>Are you sure you want to log out of your parent companion portal?</p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ ...styles.sheetBtn, backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--dark-charcoal)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{ ...styles.sheetBtn, backgroundColor: '#D32F2F', color: '#fff', fontWeight: 800 }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared success toast notification banner */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
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
  header: {
    padding: 'calc(24px + var(--safe-area-top)) 24px 16px 24px',
    background: 'var(--glass-bg)',
    borderBottom: '1.5px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: '24px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
  },
  subtitle: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '3px',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  /* PARENT BANNER WELCOME */
  parentWelcomeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatarMini: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212,175,55,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(212,175,55,0.2)',
  },
  parentWelcomeTitle: {
    fontSize: '16.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  greetingText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  childMetaText: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },

  /* SUMMARY SUMMARY CARD */
  summaryCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '24px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    paddingBottom: '10px',
    marginBottom: '14px',
  },
  statusSafeDot: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#2E7D32',
    backgroundColor: 'rgba(46,125,50,0.08)',
    padding: '3px 10px',
    borderRadius: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 20px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  summaryLabel: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 655,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },

  /* ACADEMIC SNAPSHOT CARDS */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  snapshotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  snapshotCard: {
    padding: '12px 6px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  snapshotLabel: {
    fontSize: '8.5px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  snapshotVal: {
    fontSize: '15px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },

  /* LEAVE ACTIVE COMPONENT */
  leaveStatusCard: {
    padding: '20px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.2px solid rgba(255,255,255,0.5)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  leaveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leaveTypeTitle: {
    fontSize: '13.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  leaveDateText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
  },
  leaveStatusBadge: {
    fontSize: '8.5px',
    fontWeight: 800,
    color: '#2E7D32',
    backgroundColor: 'rgba(46,125,50,0.08)',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  leaveTimelineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  timelineNodeActive: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#2E7D32',
  },
  timelineLineActive: {
    flex: 1,
    height: '1.5px',
    backgroundColor: '#2E7D32',
    margin: '0 8px',
  },
  actionBtnPrimary: {
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--royal-gold)',
    color: '#fff',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },

  /* FEED ACTIONS ITEM */
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionItemCard: {
    padding: '14px 20px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionItemTitle: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  actionItemDesc: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '1px',
  },
  actionItemBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },

  /* RESULT SNAP CARD */
  resultSummaryCard: {
    padding: '18px 20px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultExamLabel: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 650,
    textTransform: 'uppercase',
  },
  resultMarksValue: {
    fontSize: '14.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginTop: '2px',
  },
  resultGradeText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  actionBtnOutline: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    fontSize: '11px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },

  /* TIMELINE TIMELINE */
  activityCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '20px',
  },
  activityTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    paddingBottom: '10px',
  },
  activityTimeText: {
    color: 'var(--muted-gray)',
    fontWeight: 550,
  },
  activityDescText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
    textAlign: 'right',
  },

  /* INFO SHEETS */
  infoSheetCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  infoSheetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
  },
  sheetLabel: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  sheetVal: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },

  /* SEGMENT CONTROLS */
  segmentContainer: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: '12px',
    padding: '2px',
    marginTop: '12px',
    border: '1px solid rgba(0, 0, 0, 0.03)',
  },
  segmentBtn: {
    flex: 1,
    padding: '8px 0',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'var(--font-family)',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  /* NOTICE CARD */
  noticeCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  noticeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  noticeTitleText: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  noticeDescText: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
    marginTop: '3px',
  },

  /* PARENT PROFILE SPECIFICS */
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
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(212,175,55,0.2)',
  },
  contactBtnRound: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(212,175,55,0.08)',
    color: 'var(--royal-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  settingRowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },

  /* LOGOUT LOGOUT */
  logoutBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    border: '1.5px solid rgba(211, 47, 47, 0.25)',
    color: '#D32F2F',
    fontFamily: 'var(--font-family)',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
    outline: 'none',
  },

  /* MODAL OVERLAY STYLES */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 16, 0.5)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  gatePassSheet: {
    width: '90%',
    maxWidth: '340px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: 'var(--shadow-md)',
    border: '1.5px solid var(--card-border)',
    textAlign: 'center',
  },
  modalActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    width: '100%',
  },
  sheetBtn: {
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

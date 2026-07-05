import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { PremiumButton } from '../components/common/PremiumButton';
import { useNavigation } from '../context/NavigationContext';

// --- SHARED ACADEMICS PORTAL ICONS ---
const PresentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AbsentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const LeaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SubjectIcon = ({ color = 'var(--royal-gold)' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

// --- MARKS PORTAL ICONS ---
const ExamCompletedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ExamUpcomingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// --- FEE PORTAL ICONS ---
const CardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const BankIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M2 11l10-9 10 9H2z" />
  </svg>
);

const OfficeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="9" y1="22" x2="15" y2="22" />
    <path d="M8 6h8M8 10h8M8 14h8" />
  </svg>
);

// --- RESULTS PORTAL ICONS ---
const TrophyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
  </svg>
);

// --- ACHIEVEMENTS ICONS ---
const AcademicCategoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

const SportsCategoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <path d="M6 12c3 0 6 3 6 6M12 6c0 3 3 6 6 6" />
  </svg>
);

const CulturalCategoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const LeadershipCategoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CertificateSealIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="21" y1="9" x2="3" y2="9" />
    <circle cx="12" cy="15" r="3" fill="rgba(212,175,55,0.1)" stroke="var(--royal-gold)" strokeWidth="1.5" />
  </svg>
);

const EmptyCertificatesIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ opacity: 0.85, margin: '20px 0' }}>
    <circle cx="60" cy="60" r="35" fill="rgba(212, 175, 55, 0.08)" filter="blur(8px)" />
    <rect x="25" y="25" width="70" height="70" rx="16" stroke="rgba(212, 175, 55, 0.2)" strokeWidth="2" strokeDasharray="6 6" />
    <rect x="35" y="35" width="50" height="50" rx="8" fill="#FFF" stroke="rgba(0, 0, 0, 0.06)" strokeWidth="1.5" />
    <line x1="45" y1="48" x2="75" y2="48" stroke="rgba(0, 0, 0, 0.08)" strokeWidth="2" strokeLinecap="round" />
    <line x1="45" y1="56" x2="65" y2="56" stroke="rgba(0, 0, 0, 0.08)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="60" cy="70" r="8" fill="rgba(212, 175, 55, 0.15)" stroke="var(--royal-gold)" strokeWidth="1.2" />
  </svg>
);

interface AcademicsViewProps {
  onClose?: () => void;
}

export const AcademicsView: React.FC<AcademicsViewProps> = ({ onClose }) => {
  const { academicsTab, setActiveTab } = useNavigation();

  // --- Animation States ---
  const [attendanceOffset, setAttendanceOffset] = useState(283);
  const [marksOffset, setMarksOffset] = useState(283);
  const [resultsOffset, setResultsOffset] = useState(283);
  const [barsAnimated, setBarsAnimated] = useState(false);
  
  // --- Shimmer Loading states ---

  
  // --- Interactive Empty State Simulator for Certificates ---
  const [simulateEmptyState, setSimulateEmptyState] = useState(false);

  // --- Payment Bottom Sheet Modal trigger ---
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // --- Success Toast states ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger animations and loaders on tab change
  useEffect(() => {
    setAttendanceOffset(283);
    setMarksOffset(283);
    setResultsOffset(283);
    setBarsAnimated(false);

    if (academicsTab === 'fee') {
      setBarsAnimated(true);
      return;
    }


    if (academicsTab === 'results') {
      setBarsAnimated(true);

      const offsetTimer = setTimeout(() => {
        setResultsOffset(16.96); // 94% overall results
      }, 150);

      return () => {
        clearTimeout(offsetTimer);
      };
    }



    if (academicsTab === 'achievements') {
      setBarsAnimated(false);
      const timer = setTimeout(() => {
        setBarsAnimated(true);
      }, 600);
      return () => clearTimeout(timer);
    }


    const timer1 = setTimeout(() => {
      setAttendanceOffset(14.15); // 95% overall attendance
      setMarksOffset(22.6); // 92% performance marks
    }, 150);

    const timer2 = setTimeout(() => {
      setBarsAnimated(true);
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [academicsTab]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      setActiveTab('dashboard');
    }
  };

  // --- ATTENDANCE METRICS DATA ---
  const monthlyStats = [
    { month: 'January', pct: 96 },
    { month: 'February', pct: 94 },
    { month: 'March', pct: 98 },
    { month: 'April', pct: 91 },
    { month: 'May', pct: 95 },
    { month: 'June', pct: 97 }
  ];

  const subjectsAttendance = [
    { name: 'Mathematics', pct: 96 },
    { name: 'Physics', pct: 94 },
    { name: 'Chemistry', pct: 97 },
    { name: 'English', pct: 92 },
    { name: 'Sanskrit', pct: 99 },
    { name: 'Computer Science', pct: 100 }
  ];

  const attendanceHistory = [
    { day: 'Today', status: 'Present', color: '#2E7D32', isIcon: PresentIcon },
    { day: 'Yesterday', status: 'Present', color: '#2E7D32', isIcon: PresentIcon },
    { day: 'Monday', status: 'Absent', color: '#D32F2F', isIcon: AbsentIcon },
    { day: 'Sunday', status: 'Holiday', color: '#6E6E73', isIcon: LeaveIcon },
    { day: 'Saturday', status: 'Present', color: '#2E7D32', isIcon: PresentIcon }
  ];

  // --- MARKS METRICS DATA ---
  const examStats = [
    { name: 'Unit Test - 1', status: 'Completed', avg: '91%', date: '10 July', upcoming: false },
    { name: 'Unit Test - 2', status: 'Completed', avg: '94%', date: '28 July', upcoming: false },
    { name: 'Monthly Test', status: 'Completed', avg: '93%', date: '15 Aug', upcoming: false },
    { name: 'Quarterly Exam', status: 'Upcoming', avg: '--', date: '20 Sept', upcoming: true }
  ];

  const subjectsMarks = [
    { name: 'Mathematics', score: '95', max: '100', pct: 95 },
    { name: 'Physics', score: '92', max: '100', pct: 92 },
    { name: 'Chemistry', score: '96', max: '100', pct: 96 },
    { name: 'English', score: '88', max: '100', pct: 88 },
    { name: 'Computer Science', score: '99', max: '100', pct: 99 }
  ];

  const marksHistory = [
    { exam: 'Unit Test 1', score: '91%', isIcon: ExamCompletedIcon },
    { exam: 'Monthly Exam', score: '93%', isIcon: ExamCompletedIcon },
    { exam: 'Half Yearly', score: '95%', isIcon: ExamCompletedIcon },
    { exam: 'Pre Final', score: 'Upcoming', isIcon: ExamUpcomingIcon }
  ];

  // --- FEE PORTAL DATA ---
  const installmentHistory = [
    { name: 'Installment 1', amount: '₹60,000', status: 'Paid', date: '10 Jun 2026', badgeColor: 'rgba(46, 125, 50, 0.1)', textColor: '#2E7D32' },
    { name: 'Installment 2', amount: '₹60,000', status: 'Paid', date: '10 Jul 2026', badgeColor: 'rgba(46, 125, 50, 0.1)', textColor: '#2E7D32' },
    { name: 'Installment 3', amount: '₹60,000', status: 'Pending', date: '15 Aug 2026', badgeColor: 'rgba(212, 175, 55, 0.1)', textColor: 'var(--royal-gold)' }
  ];

  const feeTimeline = [
    { category: 'Admission Fee', status: 'Paid', color: '#2E7D32', isIcon: ExamCompletedIcon },
    { category: 'Hostel Fee', status: 'Paid', color: '#2E7D32', isIcon: ExamCompletedIcon },
    { category: 'Academic Fee', status: 'Pending', color: 'var(--royal-gold)', isIcon: ExamUpcomingIcon }
  ];

  const paymentOptions = [
    { name: 'Online Payment', sub: 'Coming Soon', status: 'Disabled', Icon: CardIcon },
    { name: 'Bank Transfer', sub: 'Available', status: 'Enabled', Icon: BankIcon },
    { name: 'College Office', sub: 'Available', status: 'Enabled', Icon: OfficeIcon }
  ];

  // --- RESULTS PORTAL DATA (JEE MAINS — MPC) ---
  const mpcCumulative = [
    { name: 'Maths', score: 86, max: 100, color: '#4A90D9' },
    { name: 'Physics', score: 82, max: 100, color: 'var(--royal-gold)' },
    { name: 'Chemistry', score: 79, max: 100, color: '#7E57C2' },
  ];
  const cumulativeTotal = mpcCumulative.reduce((a, b) => a + b.score, 0); // 247

  const lastExamData = [
    { name: 'Mathematics', score: 86, max: 100 },
    { name: 'Physics', score: 82, max: 100 },
    { name: 'Chemistry', score: 79, max: 100 },
  ];

  // --- ACHIEVEMENTS & CERTIFICATES DATA ---
  const categoryCounts = [
    { name: 'Academic', count: 8, Icon: AcademicCategoryIcon },
    { name: 'Sports', count: 3, Icon: SportsCategoryIcon },
    { name: 'Cultural', count: 4, Icon: CulturalCategoryIcon },
    { name: 'Leadership', count: 3, Icon: LeadershipCategoryIcon }
  ];

  const recentAchievements = [
    { title: 'Top Performer', desc: 'Scored above 95% in Unit Test', date: '12 July 2026', badge: 'Academic' },
    { title: 'Science Quiz Winner', desc: 'First Prize Winner', date: '28 June 2026', badge: 'Competition' },
    { title: 'Debate Competition', desc: 'Second Prize Winner', date: '15 June 2026', badge: 'Cultural' }
  ];

  const verifiedCertificates = [
    { name: 'Academic Excellence', issuer: 'Inspire Academic Council', date: '10 June 2026' },
    { name: 'Science Quiz', issuer: 'National Science Association', date: '28 June 2026' },
    { name: 'Perfect Attendance', issuer: 'Warden Office B Block', date: '30 June 2026' },
    { name: 'Leadership Camp', issuer: 'Inspire Youth Leadership', date: '02 July 2026' },
    { name: 'National Science Day', issuer: 'State Science Forum', date: '28 Feb 2026' },
    { name: 'Participation Certificate', issuer: 'Inter-College Cultural Meet', date: '15 Jan 2026' }
  ];

  // Special badges data (unused in current render, kept for future use)
  // const specialBadges = ['Academic Excellence', 'Perfect Attendance', 'Discipline Star', 'Study Champion', 'Consistency Award'];

  const academicMilestones = [
    { milestone: 'Admission', status: 'Completed', color: '#2E7D32' },
    { milestone: 'First Rank', status: 'Achieved', color: 'var(--royal-gold)' },
    { milestone: 'Quiz Winner', status: 'Completed', color: '#2E7D32' },
    { milestone: 'Final Examination', status: 'Completed', color: '#2E7D32' }
  ];

  // --- SUB-VIEW RENDERS ---

  // 1. Attendance View
  const renderAttendanceView = () => {
    return (
      <>
        {/* Overall summary glass card */}
        <GlassCard hoverable={false} style={styles.summaryCard} className="anim-scale-in">
          <div style={styles.summaryDetails}>
            <span style={styles.summaryLabel}>Overall Attendance</span>
            <h2 style={styles.summaryPct}>95%</h2>
            <span style={styles.summaryText}>Excellent Attendance</span>
            <p style={styles.motivationalQuote}>Keep maintaining above 90% attendance.</p>
          </div>

          <div style={styles.ringWrapper}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="7" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="url(#goldGradientAcademics)"
                strokeWidth="7.5"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset={attendanceOffset}
                style={{
                  transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)',
                  filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.35))'
                }}
              />
            </svg>
          </div>
        </GlassCard>

        {/* Statistics numeric boxes */}
        <section style={styles.statsRow} className="anim-slide-up stagger-1">
          <GlassCard hoverable={false} style={styles.statBox}>
            <div style={{ ...styles.statIconCircle, backgroundColor: 'rgba(46, 125, 50, 0.1)' }}>
              <PresentIcon />
            </div>
            <span style={styles.statVal}>210</span>
            <span style={styles.statLabel}>Present</span>
          </GlassCard>

          <GlassCard hoverable={false} style={styles.statBox}>
            <div style={{ ...styles.statIconCircle, backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
              <AbsentIcon />
            </div>
            <span style={styles.statVal}>12</span>
            <span style={styles.statLabel}>Absent</span>
          </GlassCard>

          <GlassCard hoverable={false} style={styles.statBox}>
            <div style={{ ...styles.statIconCircle, backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
              <LeaveIcon />
            </div>
            <span style={styles.statVal}>8</span>
            <span style={styles.statLabel}>Leave</span>
          </GlassCard>
        </section>

        {/* Monthly Attendance horizontal scroller */}
        <section style={styles.section} className="anim-slide-up stagger-2">
          <h3 style={styles.sectionTitle}>Monthly Attendance</h3>
          <div style={styles.monthlyScroller}>
            {monthlyStats.map((item, idx) => (
              <GlassCard key={idx} hoverable={true} style={styles.monthlyCard}>
                <span style={styles.monthLabel}>{item.month}</span>
                <span style={styles.monthPct}>{item.pct}%</span>
                <div style={styles.miniProgressTrack}>
                  <div style={{ ...styles.miniProgressBar, width: `${item.pct}%` }} />
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Subject-Wise Attendance list */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <h3 style={styles.sectionTitle}>Subject Attendance</h3>
          <div style={styles.subjectList}>
            {subjectsAttendance.map((subj, idx) => (
              <GlassCard key={idx} hoverable={false} style={styles.subjectCard}>
                <div style={styles.subjectCardHeader}>
                  <div style={styles.subjectCardLeft}>
                    <SubjectIcon />
                    <span style={styles.subjectName}>{subj.name}</span>
                  </div>
                  <span style={styles.subjectPct}>{subj.pct}%</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barProgress,
                      width: barsAnimated ? `${subj.pct}%` : '0%',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {barsAnimated && (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', opacity: 0.92, whiteSpace: 'nowrap' }}>
                        {subj.pct}%
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Attendance Timeline History */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <h3 style={styles.sectionTitle}>Attendance History</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineLine} />
            {attendanceHistory.map((hist, idx) => {
              const IconComp = hist.isIcon;
              return (
                <div key={idx} style={styles.timelineItem}>
                  <div style={styles.timelineNode} className="glass-panel">
                    <IconComp />
                  </div>
                  <div style={styles.timelineCard} className="glass-panel">
                    <span style={styles.timelineDay}>{hist.day}</span>
                    <span style={{ ...styles.timelineStatus, color: hist.color }}>{hist.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Rules & Policy Card */}
        <section style={styles.section} className="anim-slide-up stagger-5">
          <GlassCard hoverable={false} style={styles.policyCard}>
            <h3 style={styles.policyTitle}>Attendance Rules</h3>
            <ul style={styles.policyList}>
              <li style={styles.policyItem}>Minimum attendance required: <strong style={{ color: 'var(--royal-gold)' }}>75%</strong></li>
              <li style={styles.policyItem}>Students below the limit may require special permission.</li>
              <li style={styles.policyItem}>Maintain regular attendance for academic excellence.</li>
            </ul>
          </GlassCard>
        </section>
      </>
    );
  };

  // 2. Marks View
  const renderMarksView = () => {
    return (
      <>
        {/* Overall Marks status circular ring card */}
        <GlassCard hoverable={false} style={styles.summaryCard} className="anim-scale-in">
          <div style={styles.summaryDetails}>
            <span style={styles.summaryLabel}>Term 1 Average</span>
            <h2 style={styles.summaryPct}>92%</h2>
            <span style={{ ...styles.summaryText, color: 'var(--royal-gold)' }}>Grade A+ (Distinction)</span>
            <p style={styles.motivationalQuote}>Highest score in Computer Science.</p>
          </div>

          <div style={styles.ringWrapper}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="7" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="url(#goldGradientAcademics)"
                strokeWidth="7.5"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset={marksOffset}
                style={{
                  transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)',
                  filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.35))'
                }}
              />
            </svg>
          </div>
        </GlassCard>

        {/* Vertical list of unit/term test entries */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Exam Schedules</h3>
          <div style={styles.subjectList}>
            {examStats.map((item, idx) => (
              <GlassCard key={idx} hoverable={true} style={styles.examRowCard}>
                <div style={styles.examLeftCol}>
                  <h4 style={styles.examCardTitle}>{item.name}</h4>
                  <span style={styles.examDateText}>Scheduled: {item.date}</span>
                </div>
                <div style={styles.examRightCol}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: item.upcoming ? 'rgba(212,175,55,0.1)' : 'rgba(46,125,50,0.1)',
                      color: item.upcoming ? 'var(--royal-gold)' : '#2E7D32'
                    }}
                  >
                    {item.status}
                  </span>
                  {!item.upcoming && <span style={styles.examAvgScore}>Avg: {item.avg}</span>}
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Subject-Wise Score List */}
        <section style={styles.section} className="anim-slide-up stagger-2">
          <h3 style={styles.sectionTitle}>Subject Scores</h3>
          <div style={styles.subjectList}>
            {subjectsMarks.map((subj, idx) => (
              <GlassCard key={idx} hoverable={false} style={styles.subjectCard}>
                <div style={styles.subjectCardHeader}>
                  <div style={styles.subjectCardLeft}>
                    <SubjectIcon />
                    <span style={styles.subjectName}>{subj.name}</span>
                  </div>
                  <span style={styles.subjectPct}>{subj.score} / {subj.max}</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barProgress,
                      width: barsAnimated ? `${subj.pct}%` : '0%',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {barsAnimated && (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', opacity: 0.92, whiteSpace: 'nowrap' }}>
                        {subj.pct}%
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Cumulative performance charts */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <h3 style={styles.sectionTitle}>Test History</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineLine} />
            {marksHistory.map((item, idx) => {
              const IconComp = item.isIcon;
              return (
                <div key={idx} style={styles.timelineItem}>
                  <div style={styles.timelineNode} className="glass-panel">
                    <IconComp />
                  </div>
                  <div style={styles.timelineCard} className="glass-panel">
                    <span style={styles.timelineDay}>{item.exam}</span>
                    <span style={{ ...styles.timelineStatus, color: 'var(--royal-gold)', fontWeight: 800 }}>{item.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>
    );
  };

  // 3. Fee Ledgers View
  const renderFeeView = () => {
    return (
      <>


            {/* Outstandings hero card */}
            <GlassCard hoverable={false} style={styles.summaryCard} className="anim-scale-in">
              <div style={styles.summaryDetails}>
                <span style={styles.summaryLabel}>Outstanding Fee</span>
                <h2 style={styles.summaryPct}>₹60,000</h2>
                <span style={{ ...styles.summaryText, color: '#D32F2F' }}>Due Date: 15 August 2026</span>
                <p style={styles.motivationalQuote}>A late penalty of 2% applies post-due.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setShowBottomSheet(true)}
                  style={styles.payBtn}
                  className="press-interactive"
                >
                  Pay Now
                </button>
              </div>
            </GlassCard>

            {/* Installment ledger blocks */}
            <section style={styles.section} className="anim-slide-up stagger-1">
              <h3 style={styles.sectionTitle}>Ledger Installments</h3>
              <div style={styles.subjectList}>
                {installmentHistory.map((inst, idx) => (
                  <GlassCard key={idx} hoverable={true} style={styles.examRowCard}>
                    <div style={styles.examLeftCol}>
                      <h4 style={styles.examCardTitle}>{inst.name}</h4>
                      <span style={styles.examDateText}>Payment Date: {inst.date}</span>
                    </div>
                    <div style={styles.examRightCol}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: inst.badgeColor,
                          color: inst.textColor
                        }}
                      >
                        {inst.status}
                      </span>
                      <span style={styles.examAvgScore}>{inst.amount}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* Fee category classifications */}
            <section style={styles.section} className="anim-slide-up stagger-2">
              <h3 style={styles.sectionTitle}>Fee Classifications</h3>
              <div style={styles.timelineContainer}>
                <div style={styles.timelineLine} />
                {feeTimeline.map((item, idx) => {
                  const IconComp = item.isIcon;
                  return (
                    <div key={idx} style={styles.timelineItem}>
                      <div style={styles.timelineNode} className="glass-panel">
                        <IconComp />
                      </div>
                      <div style={styles.timelineCard} className="glass-panel">
                        <span style={styles.timelineDay}>{item.category}</span>
                        <span style={{ ...styles.timelineStatus, color: item.color }}>{item.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Premium channels information card */}
            <section style={styles.section} className="anim-slide-up stagger-3">
              <h3 style={styles.sectionTitle}>Payment Channels</h3>
              <div style={styles.paymentChannelsGrid}>
                {paymentOptions.map((opt, idx) => {
                  const IconSvg = opt.Icon;
                  return (
                    <GlassCard key={idx} hoverable={false} style={styles.channelCard}>
                      <div style={styles.channelIcon} className="glass-gold-ring">
                        <IconSvg />
                      </div>
                      <h4 style={styles.channelName}>{opt.name}</h4>
                      <span style={styles.channelStatus}>{opt.sub}</span>
                    </GlassCard>
                  );
                })}
              </div>
            </section>
      </>
    );
  };

  // 4. Report Results Card View — MPC / JEE Mains Pattern
  const renderResultsView = () => {
    return (
      <>
        {/* Hero: Cumulative Score */}
        <GlassCard hoverable={false} style={{ ...styles.summaryCard, flexDirection: 'column', alignItems: 'stretch', gap: 0 }} className="anim-scale-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={styles.summaryDetails}>
              <span style={styles.summaryLabel}>Cumulative Score — JEE Mains</span>
              <h2 style={{ ...styles.summaryPct, fontSize: '38px' }}>
                {cumulativeTotal} <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--muted-gray)' }}>/ 300</span>
              </h2>
              <span style={{ ...styles.summaryText, color: '#2E7D32', fontWeight: 800 }}>Top 5% of Batch</span>
              <p style={styles.motivationalQuote}>Consistent improvement across all three subjects.</p>
            </div>
            <div style={styles.ringWrapper}>
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="7" fill="transparent" />
                <circle
                  cx="50" cy="50" r="45"
                  stroke="url(#goldGradientAcademics)"
                  strokeWidth="7.5"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray="282.7"
                  strokeDashoffset={resultsOffset}
                  style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)', filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.35))' }}
                />
                <text x="50" y="46" textAnchor="middle" fill="var(--dark-charcoal)" fontSize="13" fontWeight="800">{cumulativeTotal}</text>
                <text x="50" y="60" textAnchor="middle" fill="var(--muted-gray)" fontSize="9" fontWeight="600">out of 300</text>
              </svg>
            </div>
          </div>

          {/* M / P / C bar chart */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject-wise Breakdown</span>
            {mpcCumulative.map((subj, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>{subj.name}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: subj.color }}>{subj.score} / {subj.max}</span>
                </div>
                <div style={{ ...styles.barTrack, height: '28px', borderRadius: '10px' }}>
                  <div style={{
                    ...styles.barProgress,
                    width: barsAnimated ? `${subj.score}%` : '0%',
                    background: `linear-gradient(90deg, ${subj.color}99 0%, ${subj.color} 100%)`,
                    borderRadius: '10px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {barsAnimated && (
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap' }}>
                        {subj.score}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Last Exam Scorecard */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Last Exam — Unit Test 3</h3>
          <GlassCard hoverable={false} style={{ padding: '20px 22px', border: '1.5px solid rgba(212,175,55,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {lastExamData.map((subj, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>{subj.name}</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--dark-charcoal)' }}>
                    {subj.score} <span style={{ color: 'var(--muted-gray)', fontWeight: 500, fontSize: '13px' }}>/ {subj.max}</span>
                  </span>
                </div>
                <div style={{ ...styles.barTrack, height: '24px', borderRadius: '8px' }}>
                  <div style={{
                    ...styles.barProgress,
                    width: barsAnimated ? `${subj.score}%` : '0%',
                    height: '24px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {barsAnimated && (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                        {subj.score}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Rank row */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <div style={{ flex: 1, background: 'rgba(212,175,55,0.07)', border: '1.5px solid rgba(212,175,55,0.25)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class Rank</span>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--royal-gold)', lineHeight: 1.2 }}>#7</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(74,144,217,0.07)', border: '1.5px solid rgba(74,144,217,0.25)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch Rank</span>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#4A90D9', lineHeight: 1.2 }}>#12</div>
              </div>
            </div>

            {/* Pass mark strip */}
            <div style={{ background: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#2E7D32' }}>Pass Mark: 40 / 100 per subject — All Passed</span>
            </div>
          </GlassCard>
        </section>
      </>
    );
  };

  // 5. Honors Achievements & Certificates View
  const renderAchievementsView = () => {
    return (
      <>
        {/* Top summary card */}
        <GlassCard hoverable={false} style={styles.summaryCard} className="anim-scale-in">
          <div style={styles.summaryDetails}>
            <span style={styles.summaryLabel}>Student Excellence</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 600 }}>ACADEMIC SCORE</span>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>94%</h4>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 600 }}>CLASS RANK</span>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>#8</h4>
              </div>
            </div>
          </div>
          <TrophyIcon />
        </GlassCard>

        {/* Achievement counts grids */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <div style={styles.categoryCountsGrid}>
            {categoryCounts.map((item, idx) => {
              const CategoryIconSvg = item.Icon;
              return (
                <GlassCard key={idx} hoverable={true} style={styles.categoryCountCard}>
                  <div style={styles.categoryCountIconCircle} className="glass-gold-ring">
                    <CategoryIconSvg />
                  </div>
                  <span style={styles.categoryCountVal}>{item.count}</span>
                  <span style={styles.categoryCountLabel}>{item.name}</span>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* Recent Achievements Vertical list */}
        <section style={styles.section} className="anim-slide-up stagger-2">
          <h3 style={styles.sectionTitle}>Recent Achievements</h3>
          <div style={styles.subjectList}>
            {recentAchievements.map((item, idx) => (
              <GlassCard key={idx} hoverable={false} style={{ ...styles.subjectCard, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{item.title}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>{item.desc}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '4px' }}>{item.date}</span>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      color: 'var(--royal-gold)',
                      fontWeight: 800
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Academic Milestones Timeline */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <h3 style={styles.sectionTitle}>Academic Milestones</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineLine} />
            {academicMilestones.map((item, idx) => {
              const isAchieved = item.status === 'Achieved';
              return (
                <div key={idx} style={styles.timelineItem}>
                  <div
                    style={{
                      ...styles.timelineNode,
                      backgroundColor: isAchieved ? 'rgba(212,175,55,0.1)' : 'rgba(46,125,50,0.1)',
                      color: isAchieved ? 'var(--royal-gold)' : '#2E7D32',
                      borderColor: isAchieved ? 'var(--royal-gold)' : '#2E7D32',
                      borderWidth: '1.5px',
                      borderStyle: 'solid'
                    }}
                    className="glass-panel"
                  />
                  <div style={styles.timelineCard} className="glass-panel">
                    <span style={styles.timelineDay}>{item.milestone}</span>
                    <span
                      style={{
                        ...styles.timelineStatus,
                        color: isAchieved ? 'var(--royal-gold)' : '#2E7D32'
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Certificates Section */}
        <section style={{ ...styles.section, paddingBottom: '32px' }} className="anim-slide-up stagger-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={styles.sectionTitle}>Verified Certificates</h3>
            <button
              onClick={() => {
                setSimulateEmptyState(!simulateEmptyState);
                triggerToast(simulateEmptyState ? 'Verified list loaded.' : 'Empty state simulated.');
              }}
              style={{
                fontSize: '11px',
                fontWeight: 750,
                color: 'var(--royal-gold)',
                background: 'none',
                border: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
              className="press-interactive"
            >
              {simulateEmptyState ? 'Show Certificates' : 'Simulate Empty'}
            </button>
          </div>

          {simulateEmptyState ? (
            <GlassCard hoverable={false} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '36px 20px' }}>
              <EmptyCertificatesIllustration />
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>No certificates available yet</h4>
              <p style={{ fontSize: '12px', color: 'var(--muted-gray)', maxWidth: '240px', marginTop: '6px', lineHeight: '1.4' }}>
                Certificates are generated and verified at the completion of terms or quiz events.
              </p>
            </GlassCard>
          ) : (
            <div style={styles.subjectList}>
              {verifiedCertificates.map((cert, idx) => (
                <GlassCard key={idx} hoverable={false} style={{ ...styles.subjectCard, padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      <CertificateSealIcon />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 850, color: 'var(--dark-charcoal)' }}>{cert.name}</h4>
                      <span style={{ fontSize: '10.5px', color: 'var(--muted-gray)' }}>Issued By: {cert.issuer}</span>
                      <span style={{ fontSize: '9.5px', color: 'var(--muted-gray)' }}>Date: {cert.date}</span>
                    </div>
                    <span style={{ ...styles.statusBadge, backgroundColor: 'rgba(46, 125, 50, 0.1)', color: '#2E7D32', fontSize: '8px', padding: '1px 6px', borderRadius: '6px' }}>
                      Verified
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                    <button
                      onClick={() => triggerToast(`Opening certificate viewer for ${cert.name}...`)}
                      style={styles.channelBtn}
                      className="press-interactive"
                    >
                      View
                    </button>
                    <button
                      onClick={() => triggerToast(`Initiating secure verification query...`)}
                      style={styles.channelBtn}
                      className="press-interactive"
                    >
                      Verify
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="view-container anim-slide-up" style={styles.container}>
      {/* Sticky App Header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <button onClick={handleBack} style={styles.backBtn} className="press-interactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={styles.title}>
              {academicsTab === 'attendance' 
                ? 'Attendance' 
                : academicsTab === 'marks' 
                ? 'Performance Marks' 
                : academicsTab === 'fee' 
                ? 'Tuition Ledger' 
                : academicsTab === 'results' 
                ? 'Report Card' 
                : 'Honors & Certificates'}
            </h1>
            <p style={styles.subtitle}>
              {academicsTab === 'attendance' 
                ? 'Track your daily and subject-wise logs' 
                : academicsTab === 'marks' 
                ? 'Subject scores and exam schedules' 
                : academicsTab === 'fee' 
                ? 'Fee schedules, installment logs and bills' 
                : academicsTab === 'results' 
                ? 'Term report cards and grade matrices' 
                : 'Verified student badges and award certificates'}
            </p>
          </div>
          <button
            onClick={() => triggerToast('Generating academic print report pdf...')}
            style={styles.downloadIconBtn}
            className="press-interactive"
            aria-label="Download Report"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Conditional Portal Rendering */}
      <main style={styles.content}>
        {academicsTab === 'attendance' 
          ? renderAttendanceView() 
          : academicsTab === 'marks' 
          ? renderMarksView() 
          : academicsTab === 'fee'
          ? renderFeeView()
          : academicsTab === 'results'
          ? renderResultsView()
          : renderAchievementsView()}
      </main>

      {/* Shared success toast */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}

      {/* Pay Now Bottom Sheet Modal */}
      {showBottomSheet && (
        <div style={styles.modalOverlay} onClick={() => setShowBottomSheet(false)} className="anim-fade-in">
          <div
            style={styles.bottomSheet}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-heavy anim-slide-up"
          >
            {/* Pill grab handle */}
            <div style={styles.modalGrabHandle} />
            
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Online Payment Gateway</h3>
              <button onClick={() => setShowBottomSheet(false)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.largeIconWrapper} className="glass-panel">
                <div style={styles.largeIconGold} className="glass-gold-ring">
                  <CardIcon />
                </div>
              </div>
              <h4 style={styles.gatewayHeading}>Production Gateway Notice</h4>
              <p style={styles.gatewayText}>
                Online payment integration will be available in the production version of the Inspire Student Portal.
              </p>
              
              <PremiumButton
                fullWidth={true}
                variant="primary"
                size="md"
                onClick={() => {
                  setShowBottomSheet(false);
                  triggerToast('Fee receipt generated successfully.');
                }}
                style={{ marginTop: '12px' }}
              >
                Acknowledge & Continue
              </PremiumButton>
            </div>
          </div>
        </div>
      )}

      {/* Shared SVG Defs Gradient */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="goldGradientAcademics" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5C158" />
            <stop offset="50%" stopColor="#C5A880" />
            <stop offset="100%" stopColor="#B38F4D" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 'calc(24px + var(--safe-area-top)) 24px 16px 24px',
    background: 'rgba(250, 250, 250, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
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
  downloadIconBtn: {
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

  /* SUMMARY CARD styles */
  summaryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '22px 24px',
    backgroundColor: 'rgba(255,255,255,0.55)',
    border: '1.5px solid rgba(255,255,255,0.7)',
    borderRadius: '24px',
    boxShadow: 'var(--shadow-md)',
  },
  summaryDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: 750,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
  },
  summaryPct: {
    fontSize: '28px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
  },
  summaryText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#2E7D32',
    marginTop: '4px',
  },
  motivationalQuote: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    marginTop: '2px',
  },
  ringWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* STATS BOXES styles */
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statBox: {
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: '20px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: 'var(--shadow-sm)',
  },
  statIconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  statVal: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  statLabel: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    marginTop: '2px',
  },

  /* SCROLLER styles */
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
  monthlyScroller: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  monthlyCard: {
    flex: '0 0 100px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.6)',
    boxShadow: 'var(--shadow-sm)',
    alignItems: 'flex-start',
  },
  monthLabel: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  monthPct: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },
  miniProgressTrack: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '2px',
  },

  /* LIST DATA styles */
  subjectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  subjectCard: {
    padding: '14px 18px',
    borderRadius: '18px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: 'var(--shadow-sm)',
  },
  subjectCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  subjectCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  subjectName: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  subjectPct: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  barTrack: {
    width: '100%',
    height: '5px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '2.5px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '2.5px',
    transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1)',
  },

  /* TIMELINE TIMING SYSTEM */
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
    border: '1.5px solid rgba(255,255,255,0.6)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDay: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  timelineStatus: {
    fontSize: '12px',
    fontWeight: 700,
  },

  /* EXAM CARD styles */
  examRowCard: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    borderRadius: '18px',
  },
  examLeftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
  },
  examCardTitle: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  examDateText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  examRightCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  examAvgScore: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },

  /* LEDGER BUTTONS */
  payBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  /* PAYMENT CHANNELS styles */
  paymentChannelsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  channelCard: {
    padding: '16px 8px',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: 'var(--shadow-sm)',
  },
  channelIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
    marginBottom: '8px',
  },
  channelName: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    lineHeight: '1.2',
  },
  channelStatus: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
  },

  /* POLICY CARD styles */
  policyCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255,255,255,0.55)',
    border: '1.5px solid rgba(255,255,255,0.7)',
    borderRadius: '20px',
    textAlign: 'left',
  },
  policyTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  policyList: {
    marginTop: '10px',
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  policyItem: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
  },

  /* RESULTS GRADE BADGE */
  gradeBadge: {
    fontSize: '10px',
    fontWeight: 850,
    color: '#fff',
    backgroundColor: 'var(--royal-gold)',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  semesterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  semesterCard: {
    padding: '16px',
    borderRadius: '18px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  semLabel: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  semPct: {
    fontSize: '20px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },
  semGrade: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    marginTop: '2px',
  },

  /* HONORS & CATEGORIES counts styles */
  categoryCountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  categoryCountCard: {
    padding: '12px 4px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: 'var(--shadow-sm)',
  },
  categoryCountIconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
    marginBottom: '6px',
  },
  categoryCountVal: {
    fontSize: '14px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
  },
  categoryCountLabel: {
    fontSize: '9px',
    color: 'var(--muted-gray)',
    fontWeight: 650,
    marginTop: '2px',
  },

  /* CERTIFICATES BUTTONS */
  channelBtn: {
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.04)',
    color: 'var(--dark-charcoal)',
    fontSize: '11.5px',
    fontWeight: 750,
    cursor: 'pointer',
    textAlign: 'center',
  },

  /* MODAL SHEETS */
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
    backgroundColor: 'rgba(250, 250, 250, 0.96)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderTopLeftRadius: '28px',
    borderTopRightRadius: '28px',
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
    alignItems: 'center',
  },
  largeIconWrapper: {
    padding: '16px',
    borderRadius: '24px',
  },
  largeIconGold: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--royal-gold)',
  },
  gatewayHeading: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  gatewayText: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
    maxWidth: '280px',
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

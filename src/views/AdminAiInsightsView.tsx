import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';

export const AdminAiInsightsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={{ width: 180, height: 24, borderRadius: 4 }} className="shimmer-item" />
        </header>
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {/* SCREEN HEADER */}
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>AI Campus Intelligence</h1>
            <p style={styles.subtitle}>Smart Insights for Better Campus Decisions</p>
          </div>
          <div style={styles.aiStatusCard} className="glass-panel">
            <span style={styles.aiStatusDot} className="anim-pulse-gold">●</span>
            <span style={styles.aiStatusText}>AI Status: Active</span>
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, paddingBottom: '100px' }}>
        
        {/* SEARCH INSIGHTS */}
        <section style={styles.section}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask AI e.g. Attendance, Students, Faculty, Fees..."
            style={styles.searchBar}
          />
        </section>

        {/* AI HERO CARD */}
        <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
          <div style={styles.heroHeader}>
            <div>
              <span style={styles.healthLabel}>Campus Health Score</span>
              <h2 style={styles.healthVal}>96%</h2>
              <p style={styles.healthDesc}>Everything looks healthy today.</p>
            </div>
            <div style={styles.progressRingPlaceholder} className="glass-gold-ring">
              <svg width="60" height="60" viewBox="0 0 36 36">
                <path
                  stroke="rgba(212,175,55,0.15)"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  stroke="var(--royal-gold)"
                  strokeWidth="3.2"
                  strokeDasharray="96, 100"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
          <div style={styles.heroLine} />
          <div style={styles.summaryList}>
            <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>AI Executive Summary</h4>
            <ul style={styles.bulletList}>
              <li> Attendance improving consistently across MPC and BiPC branches.</li>
              <li> Fees collections on track with 92% targets achieved.</li>
              <li> No major hostel disciplinary issues logged.</li>
              <li> Overall Academic Performance up 7% compared to last semester.</li>
            </ul>
          </div>
        </GlassCard>

        {/* AI QUICK INSIGHTS (6 Cards) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick AI Insights</h3>
          <div style={styles.quickGrid}>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Attendance Trend</span>
              <span style={{ ...styles.quickVal, color: '#2E7D32' }}>↑ 4%</span>
            </GlassCard>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Academic Performance</span>
              <span style={{ ...styles.quickVal, color: '#2E7D32' }}>↑ 7%</span>
            </GlassCard>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Fee Collection</span>
              <span style={styles.quickVal}>92%</span>
            </GlassCard>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Leave Requests</span>
              <span style={styles.quickVal}>Normal</span>
            </GlassCard>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Hostel Discipline</span>
              <span style={{ ...styles.quickVal, color: '#2E7D32' }}>Excellent</span>
            </GlassCard>
            <GlassCard hoverable={true} style={styles.quickCard}>
              <span style={styles.quickLabel}>Parent Engagement</span>
              <span style={{ ...styles.quickVal, color: '#2E7D32' }}>High</span>
            </GlassCard>
          </div>
        </section>

        {/* ATTENDANCE & ACADEMIC PERFORMANCE CHARTS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Attendance & Academic Analytics</h3>
          <div style={styles.analyticsGrid}>
            {/* Attendance Monthly Line Chart */}
            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Monthly Attendance Trend</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '80px' }}><span style={styles.barVal}>92%</span></div>
                <div style={{ ...styles.chartBar, height: '88px' }}><span style={styles.barVal}>94%</span></div>
                <div style={{ ...styles.chartBar, height: '96px' }}><span style={styles.barVal}>96%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>May</span>
                <span>June</span>
                <span>July</span>
              </div>
              <p style={styles.chartRecommendation}>AI Insight: Attendance increased compared to last month.</p>
            </GlassCard>

            {/* Academic Department Performance */}
            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Top Performing Departments</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '92px' }}><span style={styles.barVal}>92%</span></div>
                <div style={{ ...styles.chartBar, height: '86px' }}><span style={styles.barVal}>86%</span></div>
                <div style={{ ...styles.chartBar, height: '80px' }}><span style={styles.barVal}>80%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>MPC</span>
                <span>BiPC</span>
                <span>CEC</span>
              </div>
              <p style={styles.chartRecommendation}>Top Academic GPA metrics logged.</p>
            </GlassCard>
          </div>
        </section>

        {/* FEE & HOSTEL ANALYTICS */}
        <section style={styles.section}>
          <div style={styles.analyticsGrid}>
            {/* Fee collections Donut visual card */}
            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Term Fee Analytics</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '82px', backgroundColor: '#2E7D32' }}><span style={styles.barVal}>92%</span></div>
                <div style={{ ...styles.chartBar, height: '18px', backgroundColor: '#D32F2F' }}><span style={styles.barVal}>8%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>Collected</span>
                <span>Pending</span>
              </div>
              <p style={styles.chartRecommendation}>AI Recommendation: Follow up with 38 pending payments.</p>
            </GlassCard>

            {/* Hostel Wellness Stats */}
            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Hostel Wellness Snapshot</span>
              <div style={styles.hostelMetaGrid}>
                <div style={styles.hostelMetaRow}>
                  <span>Room Occupancy:</span>
                  <strong>98%</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Medical Cases:</span>
                  <strong style={{ color: '#D32F2F' }}>1 Active</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Outing Requests Today:</span>
                  <strong>14 Requests</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Disciplinary Status:</span>
                  <strong style={{ color: '#2E7D32' }}>Excellent</strong>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* PARENT ENGAGEMENT & FACULTY COMPLIANCE */}
        <section style={styles.section}>
          <div style={styles.analyticsGrid}>
            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Parent Engagement Metrics</span>
              <div style={styles.hostelMetaGrid}>
                <div style={styles.hostelMetaRow}>
                  <span>Parents Active Today:</span>
                  <strong>482 Active</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Leave Requests Submitted:</span>
                  <strong>14 Leaves</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Circulars Read Rate:</span>
                  <strong>93% Read</strong>
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} style={styles.chartCard}>
              <span style={styles.chartTitle}>Faculty System Compliance</span>
              <div style={styles.hostelMetaGrid}>
                <div style={styles.hostelMetaRow}>
                  <span>Attendance Logged:</span>
                  <strong style={{ color: '#2E7D32' }}>100% Submitted</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>UT Marks Uploaded:</span>
                  <strong>96% Uploaded</strong>
                </div>
                <div style={styles.hostelMetaRow}>
                  <span>Assignments Published:</span>
                  <strong>84% Active</strong>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* TOP STUDENTS HORIZONTAL GALLERY */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Top Academic Performers</h3>
          <div style={styles.horizontalScroll}>
            <GlassCard hoverable={false} style={styles.scrollItemCard}>
              <div style={styles.scrollItemHeader}>
                <span style={styles.medalIcon}></span>
                <strong>Varshith Rao</strong>
              </div>
              <span style={styles.scrollItemMeta}>Percentage: 94% | Attendance: 95%</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.scrollItemCard}>
              <div style={styles.scrollItemHeader}>
                <span style={styles.medalIcon}></span>
                <strong>Aaditya Varma</strong>
              </div>
              <span style={styles.scrollItemMeta}>Percentage: 92% | Attendance: 96%</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.scrollItemCard}>
              <div style={styles.scrollItemHeader}>
                <span style={styles.medalIcon}></span>
                <strong>Kavya Sharma</strong>
              </div>
              <span style={styles.scrollItemMeta}>Percentage: 91% | Attendance: 94%</span>
            </GlassCard>
          </div>
        </section>

        {/* AT RISK STUDENTS NOTICES */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Attention Required (At-Risk Students)</h3>
          <div style={styles.atRiskList}>
            <div style={styles.riskCard}>
              <div>
                <span style={styles.riskBadge}>LOW ATTENDANCE</span>
                <h4 style={styles.riskStudentName}>Rahul Khanna (Roll: 240188)</h4>
                <p style={styles.riskStudentMeta}>Attendance: 72% (Required minimum: 75%)</p>
              </div>
              <button onClick={() => triggerToast('Routing to Rahul Khanna directory profile...')} style={styles.actionBtnOutline}>View Profile</button>
            </div>
            <div style={styles.riskCard}>
              <div>
                <span style={styles.riskBadge}>FEE OUTSTANDING</span>
                <h4 style={styles.riskStudentName}>Sneha Reddy (Roll: 240192)</h4>
                <p style={styles.riskStudentMeta}>Pending tuition installment: ₹60,000</p>
              </div>
              <button onClick={() => triggerToast('Routing to Sneha Reddy fee log...')} style={styles.actionBtnOutline}>View Profile</button>
            </div>
          </div>
        </section>

        {/* EXPORT AI REPORTS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Export Smart Reports</h3>
          <div style={styles.analyticsGrid}>
            <button onClick={() => triggerToast('Attendance Audit Report downloaded.')} style={styles.actionBtnOutline}>Attendance Report</button>
            <button onClick={() => triggerToast('Financial collection spreadsheet exported.')} style={styles.actionBtnOutline}>Financial Report</button>
          </div>
        </section>

        {/* TIMELINE ACTIVITY LOGS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>AI System Activity Log</h3>
          <GlassCard hoverable={false} style={styles.activityCard}>
            <div style={styles.activityTimeline}>
              <div style={styles.activityRow}>
                <span>15 Min Ago</span>
                <strong>Attendance Trend Analysis Completed</strong>
              </div>
              <div style={styles.activityRow}>
                <span>1 Hour Ago</span>
                <strong>Fee Audit Statement Generated</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Yesterday</span>
                <strong>Academic Performance Curves Updated</strong>
              </div>
            </div>
          </GlassCard>
        </section>

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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#FAFAFA',
    minHeight: '100vh',
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
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '22px',
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
  aiStatusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '12px',
  },
  aiStatusDot: {
    color: 'var(--royal-gold)',
    fontSize: '10px',
  },
  aiStatusText: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  /* SEARCH BAR */
  searchBar: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(0,0,0,0.08)',
    outline: 'none',
    backgroundColor: '#fff',
    fontSize: '12.5px',
    fontFamily: 'var(--font-family)',
  },

  /* HERO HEALTH CARD */
  heroCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '24px',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  healthVal: {
    fontSize: '28px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    marginTop: '2px',
  },
  healthDesc: {
    fontSize: '12.5px',
    color: 'var(--muted-gray)',
    marginTop: '2px',
  },
  progressRingPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLine: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    margin: '16px 0',
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bulletList: {
    listStyleType: 'none',
    paddingLeft: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12.5px',
    color: 'var(--dark-charcoal)',
    fontWeight: 600,
  },

  /* QUICK GRID */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  quickCard: {
    padding: '12px 6px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  quickLabel: {
    fontSize: '8.5px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  quickVal: {
    fontSize: '14.5px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },

  /* ANALYTICS CHARTS */
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  chartCard: {
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '20px',
  },
  chartTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginBottom: '12px',
    display: 'block',
  },
  chartBarRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    paddingBottom: '4px',
  },
  chartBar: {
    width: '28px',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '4px',
  },
  barVal: {
    fontSize: '9px',
    color: '#fff',
    fontWeight: 800,
  },
  chartAxis: {
    display: 'flex',
    justifyContent: 'space-around',
    fontSize: '9px',
    color: 'var(--muted-gray)',
    marginTop: '6px',
  },
  chartRecommendation: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '10px',
    lineHeight: '1.3',
  },
  hostelMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  hostelMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },

  /* GALLERY GALLERY Scroll */
  horizontalScroll: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '6px',
  },
  scrollItemCard: {
    minWidth: '170px',
    padding: '12px 14px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '16px',
  },
  scrollItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  medalIcon: {
    fontSize: '14px',
  },
  scrollItemMeta: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    display: 'block',
    marginTop: '3px',
  },

  /* RISK STUDENTS list */
  atRiskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  riskCard: {
    padding: '14px 20px',
    backgroundColor: 'rgba(211,47,47,0.04)',
    border: '1px solid rgba(211,47,47,0.15)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
    fontSize: '8px',
    fontWeight: 800,
    color: '#D32F2F',
    backgroundColor: 'rgba(211,47,47,0.08)',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  riskStudentName: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },
  riskStudentMeta: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
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

  /* TOAST STYLINGS */
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
    justifyContent: 'center',
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

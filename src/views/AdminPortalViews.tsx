import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// --- SHARED CLOSE ICON ---
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- ADMIN DASHBOARD VIEW ---
export const AdminDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, setThemeMode } = useNavigation();

  // Student management state
  const [students] = useState([
    { name: 'Varshith Rao', id: 'IJC240145', course: 'MPC-A', attendance: '95%', fees: 'Paid', status: 'Excellent' },
    { name: 'Aaditya Varma', id: 'IJC240102', course: 'MPC-A', attendance: '96%', fees: 'Paid', status: 'Excellent' },
    { name: 'Rahul Khanna', id: 'IJC240188', course: 'MPC-B', attendance: '88%', fees: 'Pending', status: 'Good' },
    { name: 'Sneha Reddy', id: 'IJC240192', course: 'BiPC-A', attendance: '92%', fees: 'Paid', status: 'Very Good' }
  ]);

  // Leave approval requests state
  const [leaves, setLeaves] = useState([
    { id: 1, name: 'Varshith Rao', type: 'Home Leave', reason: 'Family outing', dates: '12 July - 15 July' },
    { id: 2, name: 'Aaditya Varma', type: 'Outing Pass', reason: 'Medical appointment', dates: 'Tomorrow (2 PM)' }
  ]);

  // Faculty state
  const [faculty] = useState([
    { name: 'Mr. Srinivas', dept: 'Physics', exp: '12 Yrs', qual: 'M.Sc (IIT)', status: 'Active' },
    { name: 'Mr. Prasad', dept: 'Chemistry', exp: '10 Yrs', qual: 'Ph.D', status: 'Active' },
    { name: 'Mrs. Lakshmi', dept: 'Mathematics', exp: '8 Yrs', qual: 'M.Sc', status: 'Active' }
  ]);

  // Announcement inputs
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [announceAudience, setAnnounceAudience] = useState('Everyone');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApproveLeave = (id: number, name: string) => {
    setLeaves(prev => prev.filter(l => l.id !== id));
    triggerToast(`Approved leave request for ${name}.`);
  };

  const handlePublishAnnouncement = () => {
    if (!title || !desc) {
      triggerToast('Please fill all circular fields.');
      return;
    }
    triggerToast('Announcement Published to ' + announceAudience);
    setTitle('');
    setDesc('');
    setActiveOverlay(null);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 140, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {/* Top Banner Admin Credentials */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>DK</div>
            <div>
              <span style={styles.greetingText}>Good Morning,</span>
              <h2 style={styles.parentWelcomeTitle}>Dr. Ramesh Kumar</h2>
              <p style={styles.childMetaText}>Principal • <strong>Inspire Junior College</strong></p>
            </div>
          </div>
          
          <button
            onClick={() => setThemeMode(theme === 'light' ? 'Dark' : 'Light')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dark-charcoal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
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
        </div>
      </header>

      <main style={styles.content}>
        
        {/* SUMMARY DASHBOARD HERO */}
        <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
          <h3 style={styles.sectionTitle}>College Summary Status</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Students</span>
              <span style={styles.summaryValue}>2,846 Students</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Faculty</span>
              <span style={styles.summaryValue}>186 Staff</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Hostel Boarders</span>
              <span style={styles.summaryValue}>2,210 Boarders</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Today Attendance</span>
              <span style={styles.summaryValue}>96% Present</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Leave Requests</span>
              <span style={{ ...styles.summaryValue, color: 'var(--royal-gold)' }}>28 Pending</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Pending Fees</span>
              <span style={{ ...styles.summaryValue, color: '#D32F2F' }}>₹18,20,000</span>
            </div>
          </div>
        </GlassCard>

        {/* LIVE STATUS INDIVIDUAL CARDS */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Live Status Indicators</h3>
          <div style={styles.liveGrid}>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>Students Present</span>
              <span style={styles.liveVal}>2,735</span>
            </div>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>Faculty Present</span>
              <span style={styles.liveVal}>180</span>
            </div>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>Hostel Occupancy</span>
              <span style={styles.liveVal}>98%</span>
            </div>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>Today's Visitors</span>
              <span style={styles.liveVal}>82</span>
            </div>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>Pending Approvals</span>
              <span style={styles.liveVal}>31</span>
            </div>
            <div style={styles.liveCard}>
              <span style={styles.liveLabel}>System Health</span>
              <span style={{ ...styles.liveVal, color: '#2E7D32' }}>Excellent</span>
            </div>
          </div>
        </section>

        {/* ANALYTICS CHARTS SECTION */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Analytical Insights</h3>
          <div style={styles.analyticsGrid}>
            <GlassCard hoverable={false} style={styles.chartContainer}>
              <span style={styles.chartLabel}>Fee Collections (Current Term)</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '40px' }}><span style={styles.barVal}>40%</span></div>
                <div style={{ ...styles.chartBar, height: '70px' }}><span style={styles.barVal}>70%</span></div>
                <div style={{ ...styles.chartBar, height: '90px' }}><span style={styles.barVal}>90%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>Expected</span>
                <span>Collected</span>
                <span>Targeted</span>
              </div>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.chartContainer}>
              <span style={styles.chartLabel}>Hostel Room Occupancy</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '85px' }}><span style={styles.barVal}>85%</span></div>
                <div style={{ ...styles.chartBar, height: '95px' }}><span style={styles.barVal}>95%</span></div>
                <div style={{ ...styles.chartBar, height: '98px' }}><span style={styles.barVal}>98%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>Block A</span>
                <span>Block B</span>
                <span>Block C</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* QUICK ACTION GRID */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Management Actions</h3>
          <div style={styles.quickGrid}>
            <button onClick={() => setActiveOverlay('students')} style={styles.quickBtn} className="press-interactive">Student Management</button>
            <button onClick={() => setActiveOverlay('faculty')} style={styles.quickBtn} className="press-interactive">Faculty Management</button>
            <button onClick={() => setActiveOverlay('admissions')} style={styles.quickBtn} className="press-interactive">Admission desk</button>
            <button onClick={() => setActiveOverlay('fees')} style={styles.quickBtn} className="press-interactive">Fee Management</button>
            <button onClick={() => setActiveOverlay('leaves')} style={styles.quickBtn} className="press-interactive">Leave Approvals</button>
            <button onClick={() => setActiveOverlay('announcements')} style={styles.quickBtn} className="press-interactive">Announcement Center</button>
            <button onClick={() => setActiveOverlay('hostel')} style={styles.quickBtn} className="press-interactive">Hostel Operations</button>
            <button onClick={() => setActiveOverlay('reports')} style={styles.quickBtn} className="press-interactive">System Reports</button>
          </div>
        </section>

        {/* ACTIVITY FEED TIMELINE */}
        <section style={{ ...styles.section, paddingBottom: '32px' }}>
          <h3 style={styles.sectionTitle}>Recent Activity Timeline</h3>
          <GlassCard hoverable={false} style={styles.activityCard}>
            <div style={styles.activityTimeline}>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>10:15 AM</span>
                <span style={styles.activityDescText}>New Student Admission Registered (Varshith Rao)</span>
              </div>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>09:30 AM</span>
                <span style={styles.activityDescText}>Fee Installment Paid (MPC Section A)</span>
              </div>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Home Outing Leave Request Approved</span>
              </div>
              <div style={{ ...styles.activityRow, border: 'none', paddingBottom: 0 }}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Faculty Member Added (Physics Dept)</span>
              </div>
            </div>
          </GlassCard>
        </section>

      </main>

      {/* --- QUICK ACTION OVERLAYS --- */}

      {/* 1. Student Management Overlay */}
      {activeOverlay === 'students' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Directory</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {students.map((std, idx) => (
                <div key={idx} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{std.name}</h5>
                    <span style={styles.studentRollText}>ID: {std.id} • {std.course}</span>
                    <p style={{ fontSize: '10.5px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      Att: {std.attendance} | Fees: {std.fees} | Status: {std.status}
                    </p>
                  </div>
                  <button onClick={() => triggerToast(`Editing ${std.name} details...`)} style={styles.actionItemBtn}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Faculty Management Overlay */}
      {activeOverlay === 'faculty' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Faculty Directory</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {faculty.map((f, idx) => (
                <div key={idx} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{f.name}</h5>
                    <span style={styles.studentRollText}>Dept: {f.dept} | Exp: {f.exp}</span>
                    <p style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>Qual: {f.qual} | Status: {f.status}</p>
                  </div>
                  <button onClick={() => triggerToast(`Contacting ${f.name}...`)} style={styles.actionItemBtn}>Contact</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Admission Management Overlay */}
      {activeOverlay === 'admissions' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Admissions Desk</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              <div style={styles.liveGrid}>
                <div style={styles.liveCard}>
                  <span style={styles.liveLabel}>Today Admissions</span>
                  <span style={styles.liveVal}>14</span>
                </div>
                <div style={styles.liveCard}>
                  <span style={styles.liveLabel}>Pending Inquiries</span>
                  <span style={styles.liveVal}>28</span>
                </div>
              </div>
              <div style={{ ...styles.noticeCard, marginTop: '12px' }}>
                <h5 style={styles.studentNameText}>Admissions Cycle: 2026-2027</h5>
                <p style={styles.noticeDescText}>Online applications portals are active. Standard enrollment filters logged.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fee Management Overlay */}
      {activeOverlay === 'fees' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Fee Logistics</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              <div style={styles.activityRow}>
                <span>Expected Tuition Total:</span>
                <strong>₹2,40,00,000</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Collected Fees:</span>
                <strong>₹2,21,80,000</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Pending Outstandings:</span>
                <strong style={{ color: '#D32F2F' }}>₹18,20,000</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Leave Approvals Overlay */}
      {activeOverlay === 'leaves' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Leave Requests</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {leaves.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-gray)' }}>No pending leaves.</p>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} style={styles.leaveApprovalCard} className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{l.name}</span>
                      <span style={styles.statusBadge}>{l.type}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--muted-gray)', margin: '4px 0' }}>Reason: {l.reason}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button onClick={() => handleApproveLeave(l.id, l.name)} style={{ ...styles.bulkBtn, backgroundColor: '#2E7D32', color: '#fff', border: 'none' }}>Approve</button>
                      <button onClick={() => { setLeaves(leaves.filter(x => x.id !== l.id)); triggerToast('Leave rejected.'); }} style={{ ...styles.bulkBtn, backgroundColor: '#D32F2F', color: '#fff', border: 'none' }}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Announcement Center Overlay */}
      {activeOverlay === 'announcements' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Broadcaster</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Broadcast Title"
                style={styles.textInputBox}
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Broadcast content specifications..."
                style={{ ...styles.textInputBox, height: '90px', resize: 'none' }}
              />
              <div style={styles.formRow}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Target:</label>
                <select value={announceAudience} onChange={(e) => setAnnounceAudience(e.target.value)} style={styles.selectInput}>
                  <option value="Everyone">Everyone</option>
                  <option value="Students">Students Only</option>
                  <option value="Faculty">Faculty Only</option>
                </select>
              </div>
              <button onClick={handlePublishAnnouncement} style={styles.saveSubmitBtn} className="press-interactive">Publish Circular</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Hostel Operations Overlay */}
      {activeOverlay === 'hostel' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Hostel Management</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              <div style={styles.activityRow}>
                <span>Total Rooms:</span>
                <strong>600 Rooms</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Available Slots:</span>
                <strong>12 Slots</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Mess Status:</span>
                <strong>Dinner Prep Active</strong>
              </div>
              <div style={styles.activityRow}>
                <span>Medical Incidents:</span>
                <strong style={{ color: '#2E7D32' }}>None</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. System Reports Overlay */}
      {activeOverlay === 'reports' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Download Reports</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => triggerToast('Tuition Collections ledger downloaded.')} style={styles.quickBtn}>Fee Receipts Summary</button>
              <button onClick={() => triggerToast('Student registers PDF downloaded.')} style={styles.quickBtn}>Attendance Registers</button>
              <button onClick={() => triggerToast('Warden logs logs downloaded.')} style={styles.quickBtn}>Hostel Occupancy PDF</button>
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

// --- ADMIN MANAGEMENT VIEW ---
export const AdminManagementView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

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
        <h1 style={styles.title}>Ecosystem Directory</h1>
        <p style={styles.subtitle}>Consolidated list of students and lecturing staff</p>
      </header>

      <main style={styles.content}>
        <GlassCard hoverable={false} style={styles.infoSheetCard}>
          <h4 style={styles.sectionTitle}>Administrative Statistics</h4>
          <div style={styles.infoSheetItem}>
            <span>Student Capacity</span>
            <strong>2846 / 3000</strong>
          </div>
          <div style={styles.infoSheetItem}>
            <span>Faculty Count</span>
            <strong>186 Staff</strong>
          </div>
          <div style={{ ...styles.infoSheetItem, border: 'none', paddingBottom: 0 }}>
            <span>Ecosystem License Status</span>
            <strong style={{ color: '#2E7D32' }}>Enterprise Active</strong>
          </div>
        </GlassCard>
      </main>
    </div>
  );
};

// --- ADMIN REPORTS VIEW ---
export const AdminReportsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, setThemeMode } = useNavigation();

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={styles.title}>College Ledger Reports</h1>
            <p style={styles.subtitle}>Compile and download institution report cards</p>
          </div>
          <button
            onClick={() => setThemeMode(theme === 'light' ? 'Dark' : 'Light')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dark-charcoal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
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
        </div>
      </header>

      <main style={{ ...styles.content, paddingBottom: '40px' }}>
        <GlassCard hoverable={false} style={styles.infoSheetCard}>
          <h3 style={styles.sectionTitle}>Select Ledger Download</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
            <button onClick={() => triggerToast('Tuition Fee Audit Ledger exported.')} style={styles.quickBtn}>Tuition Fee Audits Summary</button>
            <button onClick={() => triggerToast('Overall Campus Attendance metrics exported.')} style={styles.quickBtn}>Campus Attendance Logs</button>
            <button onClick={() => triggerToast('Hostel Log logs exported.')} style={styles.quickBtn}>Hostel Occupancy Ledger</button>
          </div>
        </GlassCard>
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

// --- ADMIN PROFILE VIEW ---
export const AdminProfileView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme, setThemeMode } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    const globalLogout = (window as any).logoutUser;
    if (globalLogout) {
      globalLogout();
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={styles.title}>Principal Account</h1>
            <p style={styles.subtitle}>Manage administrator profile & audit records</p>
          </div>
          <button
            onClick={() => setThemeMode(theme === 'light' ? 'Dark' : 'Light')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dark-charcoal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
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
        </div>
      </header>

      <main style={{ ...styles.content, paddingBottom: '40px' }}>
        
        {/* PROFILE CARD */}
        <GlassCard hoverable={false} style={styles.heroCard}>
          <div style={styles.heroHeaderRow}>
            <div style={styles.heroAvatar}>DK</div>
            <div>
              <h2 style={styles.studentName}>Dr. Ramesh Kumar</h2>
              <span style={styles.studentID}>Principal • Inspire Junior College</span>
              <span style={styles.statusBadge}>Superuser Access</span>
            </div>
          </div>
          <div style={styles.heroLineDivider} />
          <div style={styles.heroMetaGrid}>
            <div style={styles.metaRow}>
              <span>Ecosystem Subscription:</span>
              <strong>Enterprise Plus (Active)</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Audit Records:</span>
              <strong>All Logs Clean</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Contact Desk:</span>
              <strong>principal@inspire.edu</strong>
            </div>
          </div>
        </GlassCard>

        {/* LOGOUT BUTTON */}
        <div style={{ marginTop: '24px' }}>
          <button onClick={() => setShowLogoutConfirm(true)} style={styles.logoutBtn} className="press-interactive">
            Logout
          </button>
        </div>

      </main>

      {/* Logout Overlay */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowLogoutConfirm(false)} className="anim-fade-in">
          <div style={styles.gatePassSheet} onClick={(e) => e.stopPropagation()} className="glass-panel-heavy">
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.gatewayText}>Are you sure you want to log out of your Admin superuser account?</p>
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
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
    backgroundImage: 'var(--bg-gradient-overlay)',
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

  /* WELCOME BANNER */
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

  /* HERO CARD */
  heroCard: {
    padding: '22px',
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.32)',
    borderRadius: '26px',
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
    marginTop: '10px',
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

  /* LIVE STAT GRID */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  liveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  liveCard: {
    padding: '16px 14px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  liveLabel: {
    fontSize: '8.5px',
    color: 'var(--muted-gray)',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  liveVal: {
    fontSize: '15px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '4px',
  },

  /* CHARTS SECTION */
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  chartContainer: {
    padding: '18px',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  chartLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginBottom: '16px',
  },
  chartBarRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '110px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    paddingBottom: '6px',
  },
  chartBar: {
    width: '32px',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '4px',
  },
  barVal: {
    fontSize: '9.5px',
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

  /* QUICK ACTIONS GRID */
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  quickBtn: {
    padding: '16px 12px',
    borderRadius: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'var(--dark-charcoal)',
    fontSize: '12.5px',
    fontWeight: 750,
    cursor: 'pointer',
    textAlign: 'center',
    backdropFilter: 'blur(18px)',
  },

  /* OVERLAY LAYOUT */
  overlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 16, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlaySheet: {
    width: '92%',
    maxWidth: '420px',
    maxHeight: '84vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    border: '1.5px solid var(--card-border)',
  },
  overlayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-gray)',
    cursor: 'pointer',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  selectInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    outline: 'none',
  },
  bulkRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  bulkBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
  studentListScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
    marginBottom: '16px',
  },
  attendanceStudentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
  },
  studentNameText: {
    fontSize: '12.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  studentRollText: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
  },
  actionItemBtn: {
    padding: '8px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },

  /* TEXT INPUT BOX */
  textInputBox: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '12px',
    outline: 'none',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
  },

  /* NOTICE CARDS */
  noticeCard: {
    padding: '16px 18px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusBadge: {
    fontSize: '8px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    padding: '2px 8px',
    borderRadius: '8px',
    alignSelf: 'flex-start',
  },
  noticeDescText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
  },
  leaveApprovalCard: {
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    flexDirection: 'column',
  },

  /* REPORTS */
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    fontSize: '12px',
  },

  /* INFO SHEETS */
  infoSheetCard: {
    padding: '18px 22px',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '22px',
  },
  infoSheetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
  },

  /* PROFILE CARD */
  heroAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  studentName: {
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  studentID: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 550,
    display: 'block',
    marginTop: '2px',
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
    fontSize: '12.5px',
  },
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
  },
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
  gatewayText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.5',
    margin: '10px 0 16px 0',
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
  saveSubmitBtn: {
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'var(--royal-gold)',
    color: '#fff',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
  },
};

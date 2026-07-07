import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { FacultyClassesView, FacultyUpdatesView } from './FacultyPortalViews';
import { AdminAiInsightsView } from './AdminAiInsightsView';

// --- SHARED CLOSE ICON ---
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- RENDER BACKGROUND DESIGN (Glows, shapes, grids) ---
const renderBackgroundDesign = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.95
    }}>
      {/* Retro Outline Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Floating Colorful Neo-Brutalist 2D Shapes */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '-40px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#3B82F6',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        opacity: 0.15,
      }} />

      <div style={{
        position: 'absolute',
        top: '35%',
        right: '-50px',
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        backgroundColor: '#EF4444',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        opacity: 0.12,
      }} />

      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '10%',
        width: '90px',
        height: '90px',
        borderRadius: '16px',
        backgroundColor: '#FBBF24',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        transform: 'rotate(15deg)',
        opacity: 0.15,
      }} />

      {/* Dynamic Colorful Gradient Mesh Blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '15%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
    </div>
  );
};

// --- ADMIN DASHBOARD VIEW (COMBINED WITH TEACHER PORTAL) ---
export const AdminDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, setThemeMode } = useNavigation();

  // Student directory management state
  const [studentsList, setStudentsList] = useState([
    { id: '240145', name: 'Varshith Rao', course: 'MPC-A', attendance: '95%', fees: 'Paid', status: 'Present' },
    { id: '240102', name: 'Aaditya Varma', course: 'MPC-A', attendance: '96%', fees: 'Paid', status: 'Present' },
    { id: '240188', name: 'Rahul Khanna', course: 'MPC-B', attendance: '88%', fees: 'Pending', status: 'Absent' },
    { id: '240192', name: 'Sneha Reddy', course: 'BiPC-A', attendance: '92%', fees: 'Paid', status: 'Leave' },
    { id: '240114', name: 'Kavya Sharma', course: 'BiPC-A', attendance: '94%', fees: 'Paid', status: 'Present' }
  ]);

  // Leave approval requests state
  const [leaves, setLeaves] = useState([
    { id: 1, name: 'Varshith Rao', type: 'Home Leave', reason: 'Family festival outing', dates: '12 July - 15 July' },
    { id: 2, name: 'Aaditya Varma', type: 'Outing Pass', reason: 'Medical dental appointment', dates: 'Tomorrow (2 PM)' }
  ]);

  // Faculty state
  const [faculty] = useState([
    { name: 'Mr. Srinivas', dept: 'Physics', exp: '12 Yrs', qual: 'M.Sc (IIT)', status: 'Active' },
    { name: 'Mr. Prasad', dept: 'Chemistry', exp: '10 Yrs', qual: 'Ph.D', status: 'Active' },
    { name: 'Mrs. Lakshmi', dept: 'Mathematics', exp: '8 Yrs', qual: 'M.Sc', status: 'Active' }
  ]);

  // Teacher Tool States
  const [attendanceClass, setAttendanceClass] = useState('MPC');
  const [attendanceSection, setAttendanceSection] = useState('A');
  const [marksExam, setMarksExam] = useState('Unit Test 2');
  const [marksClass, setMarksClass] = useState('MPC-A');
  const [marksList, setMarksList] = useState([
    { id: 1, name: 'Varshith Rao', roll: '240145', score: '24' },
    { id: 2, name: 'Aaditya Varma', roll: '240102', score: '22' },
    { id: 3, name: 'Rahul Khanna', roll: '240188', score: '18' },
    { id: 4, name: 'Sneha Reddy', roll: '240192', score: '20' }
  ]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Announcement inputs
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [announceAudience, setAnnounceAudience] = useState('Everyone');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
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

  const handleSaveAttendance = () => {
    triggerToast('Attendance Saved Successfully.');
    setActiveOverlay(null);
  };

  const handleSaveMarks = () => {
    triggerToast('Marks Saved Successfully.');
    setActiveOverlay(null);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q) {
      setSearchResults([]);
      return;
    }
    const filtered = studentsList.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.id.toLowerCase().includes(q.toLowerCase())
    );
    setSearchResults(filtered);
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
      {renderBackgroundDesign()}
      {/* Top Banner Credentials */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>DK</div>
            <div>
              <span style={styles.greetingText}>Administrator Portal,</span>
              <h2 style={styles.parentWelcomeTitle}>Dr. Ramesh Kumar</h2>
              <p style={styles.childMetaText}>Principal & Instructor • <strong>Inspire Junior College</strong></p>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

      <main style={{ ...styles.content, zIndex: 1 }}>
        
        {/* SUMMARY HERO (Block 1) */}
        <section style={styles.section}>
          <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
            <h3 style={{ ...styles.sectionTitle, color: '#fff' }}>College Status Summary</h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Total Students</span>
                <span style={{ ...styles.summaryValue, color: '#fff' }}>2,846 Students</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Faculty & Staff</span>
                <span style={{ ...styles.summaryValue, color: '#fff' }}>186 Staff</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Today's Attendance</span>
                <span style={{ ...styles.summaryValue, color: '#10B981' }}>96% Present</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Outing Requests</span>
                <span style={{ ...styles.summaryValue, color: 'var(--royal-gold)' }}>{leaves.length} Pending</span>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* TEACHER TOOLS (Block 2) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Teacher Desk Tools</h3>
          <div style={styles.quickGrid}>
            <button onClick={() => setActiveOverlay('attendance')} style={styles.quickBtn} className="press-interactive">
              Take Attendance
            </button>
            <button onClick={() => setActiveOverlay('marks')} style={styles.quickBtn} className="press-interactive">
              Upload Marks
            </button>
            <button onClick={() => setActiveOverlay('assignments')} style={styles.quickBtn} className="press-interactive">
              Assignments Desk
            </button>
            <button onClick={() => setActiveOverlay('search')} style={styles.quickBtn} className="press-interactive">
              Student Directory
            </button>
          </div>
        </section>

        {/* ADMINISTRATIVE TOOLS (Block 3) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Administrative Dashboard</h3>
          <div style={styles.quickGrid}>
            <button onClick={() => setActiveOverlay('students_directory')} style={styles.quickBtn} className="press-interactive">
              Academic Directory
            </button>
            <button onClick={() => setActiveOverlay('faculty_directory')} style={styles.quickBtn} className="press-interactive">
              Faculty Directory
            </button>
            <button onClick={() => setActiveOverlay('announcements')} style={styles.quickBtn} className="press-interactive">
              Circular Center
            </button>
            <button onClick={() => triggerToast('Redirecting to Admissions Desk...')} style={styles.quickBtn} className="press-interactive">
              Admissions Console
            </button>
          </div>
        </section>

        {/* OPERATIONS & APPROVALS (Block 4) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Operations & Approvals</h3>
          <div style={styles.quickGrid}>
            <button onClick={() => setActiveOverlay('leaves')} style={styles.quickBtn} className="press-interactive">
              Leave Approvals ({leaves.length})
            </button>
            <button onClick={() => triggerToast('Opening Hostel Operations logs...')} style={styles.quickBtn} className="press-interactive">
              Hostel Operations
            </button>
          </div>
        </section>

        {/* ANALYTICAL INSIGHTS (Block 5) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Analytical Insights</h3>
          <div style={styles.analyticsGrid}>
            <GlassCard hoverable={false} style={styles.chartContainer}>
              <span style={styles.chartLabel}>Fee Collection Progress</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '40px' }}><span style={styles.barVal}>40%</span></div>
                <div style={{ ...styles.chartBar, height: '70px' }}><span style={styles.barVal}>70%</span></div>
                <div style={{ ...styles.chartBar, height: '90px' }}><span style={styles.barVal}>90%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>Expected</span>
                <span>Collected</span>
                <span>Target</span>
              </div>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.chartContainer}>
              <span style={styles.chartLabel}>Class Attendance (Today)</span>
              <div style={styles.chartBarRow}>
                <div style={{ ...styles.chartBar, height: '96px', backgroundColor: '#10B981' }}><span style={styles.barVal}>96%</span></div>
                <div style={{ ...styles.chartBar, height: '88px', backgroundColor: '#10B981' }}><span style={styles.barVal}>88%</span></div>
                <div style={{ ...styles.chartBar, height: '92px', backgroundColor: '#10B981' }}><span style={styles.barVal}>92%</span></div>
              </div>
              <div style={styles.chartAxis}>
                <span>MPC-A</span>
                <span>MPC-B</span>
                <span>BiPC-A</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* TIMELINE ACTIVITIES (Block 6) */}
        <section style={{ ...styles.section, paddingBottom: '32px' }}>
          <h3 style={styles.sectionTitle}>Activity Broadcast Ledger</h3>
          <GlassCard hoverable={false} style={styles.activityCard}>
            <div style={styles.activityTimeline}>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>10:15 AM</span>
                <span style={styles.activityDescText}>Admissions registered: Varshith Rao</span>
              </div>
              <div style={styles.activityRow}>
                <span style={styles.activityTimeText}>09:30 AM</span>
                <span style={styles.activityDescText}>Attendance completed for Class MPC Section A</span>
              </div>
              <div style={{ ...styles.activityRow, border: 'none', paddingBottom: 0 }}>
                <span style={styles.activityTimeText}>Yesterday</span>
                <span style={styles.activityDescText}>Home Leave request approved for Aaditya Varma</span>
              </div>
            </div>
          </GlassCard>
        </section>

      </main>

      {/* --- QUICK ACTION OVERLAYS --- */}

      {/* 1. Take Attendance Overlay */}
      {activeOverlay === 'attendance' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Take Attendance</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={styles.formRow}>
              <select value={attendanceClass} onChange={(e) => setAttendanceClass(e.target.value)} style={styles.selectInput}>
                <option value="MPC">MPC</option>
                <option value="BiPC">BiPC</option>
              </select>
              <select value={attendanceSection} onChange={(e) => setAttendanceSection(e.target.value)} style={styles.selectInput}>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
            <div style={styles.bulkRow}>
              <button onClick={() => setStudentsList(studentsList.map(s => ({ ...s, status: 'Present' })))} style={styles.bulkBtn} className="press-interactive">Mark All Present</button>
              <button onClick={() => setStudentsList(studentsList.map(s => ({ ...s, status: 'Absent' })))} style={styles.bulkBtn} className="press-interactive">Reset</button>
            </div>
            <div style={styles.studentListScroll}>
              {studentsList.map((student) => (
                <div key={student.id} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{student.name}</h5>
                    <span style={styles.studentRollText}>Roll: {student.id}</span>
                  </div>
                  <div style={styles.toggleButtonGroup}>
                    {['Present', 'Absent', 'Leave'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStudentsList(studentsList.map(s => s.id === student.id ? { ...s, status: st } : s))}
                        style={{
                          ...styles.toggleBtn,
                          backgroundColor: student.status === st ? 'var(--royal-gold)' : 'transparent',
                          color: student.status === st ? 'var(--dark-charcoal)' : 'var(--muted-gray)',
                          fontWeight: 700,
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSaveAttendance} style={styles.saveSubmitBtn} className="press-interactive">Save Attendance</button>
          </div>
        </div>
      )}

      {/* 2. Upload Marks Overlay */}
      {activeOverlay === 'marks' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Upload Marks</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={styles.formRow}>
              <select value={marksExam} onChange={(e) => setMarksExam(e.target.value)} style={styles.selectInput}>
                <option value="Unit Test 1">Unit Test 1</option>
                <option value="Unit Test 2">Unit Test 2</option>
                <option value="Term Examination">Term Exam</option>
              </select>
              <select value={marksClass} onChange={(e) => setMarksClass(e.target.value)} style={styles.selectInput}>
                <option value="MPC-A">MPC-A</option>
                <option value="MPC-B">MPC-B</option>
                <option value="BiPC-A">BiPC-A</option>
              </select>
            </div>
            <div style={styles.studentListScroll}>
              {marksList.map((student) => (
                <div key={student.id} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{student.name}</h5>
                    <span style={styles.studentRollText}>Roll: {student.roll}</span>
                  </div>
                  <input
                    type="number"
                    value={student.score}
                    onChange={(e) => setMarksList(marksList.map(s => s.id === student.id ? { ...s, score: e.target.value } : s))}
                    style={styles.marksInputBox}
                    placeholder="Marks / 25"
                  />
                </div>
              ))}
            </div>
            <button onClick={handleSaveMarks} style={styles.saveSubmitBtn} className="press-interactive">Save Marks</button>
          </div>
        </div>
      )}

      {/* 3. Assignments Overlay */}
      {activeOverlay === 'assignments' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Assignments Desk</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <GlassCard hoverable={false} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1.5px solid var(--card-border)' }}>
              <h4 style={styles.sectionTitle}>Create New Assignment</h4>
              <input type="text" placeholder="Assignment Title" style={styles.textInputBox} />
              <input type="text" placeholder="Due Date (e.g. 15 July)" style={styles.textInputBox} />
              <button onClick={() => { triggerToast('Assignment published successfully.'); setActiveOverlay(null); }} style={styles.saveSubmitBtn} className="press-interactive">Publish Assignment</button>
            </GlassCard>
            <div style={{ ...styles.studentListScroll, marginTop: '12px' }}>
              <div style={styles.noticeCard}>
                <span style={styles.statusBadge}>ACTIVE</span>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Solenoids Practice Questions</h4>
                <p style={styles.noticeDescText}>Submit calculations for solenoids field intensities. Class: MPC-A.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px', color: 'var(--muted-gray)' }}>
                  <span>Submissions: 28 / 32</span>
                  <span>Due: 12 July 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Announcements Overlay (Circular Composer) */}
      {activeOverlay === 'announcements' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Compose Circular</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Circular Title"
                style={styles.textInputBox}
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description detail..."
                style={{ ...styles.textInputBox, height: '100px', resize: 'none' }}
              />
              <div style={styles.formRow}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Target Audience:</label>
                <select value={announceAudience} onChange={(e) => setAnnounceAudience(e.target.value)} style={styles.selectInput}>
                  <option value="Everyone">Everyone</option>
                  <option value="Students Only">Students Only</option>
                  <option value="Parents Only">Parents Only</option>
                </select>
              </div>
              <button onClick={handlePublishAnnouncement} style={styles.saveSubmitBtn} className="press-interactive">Publish Announcement</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Student Search (Directory) Overlay */}
      {activeOverlay === 'search' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Directory Search</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by Name, Roll, or ID..."
              style={styles.textInputBox}
            />
            <div style={{ ...styles.studentListScroll, marginTop: '12px' }}>
              {searchResults.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-gray)' }}>Type name to display profile.</p>
              ) : (
                searchResults.map((std, idx) => (
                  <div key={idx} style={styles.attendanceStudentRow}>
                    <div>
                      <h5 style={styles.studentNameText}>{std.name}</h5>
                      <span style={styles.studentRollText}>ID: {std.id} • Stream: {std.course}</span>
                      <p style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>Attendance: {std.attendance} | Fees: {std.fees}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Leave Approvals Overlay */}
      {activeOverlay === 'leaves' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Outing Leaves</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {leaves.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-gray)', marginTop: '20px' }}>No pending leave approvals.</p>
              ) : (
                leaves.map((leave) => (
                  <div key={leave.id} style={styles.leaveApprovalCard} className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{leave.name}</span>
                      <span style={styles.statusBadge}>{leave.type}</span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--muted-gray)', margin: '4px 0' }}>Reason: {leave.reason}</p>
                    <span style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>Dates: {leave.dates}</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleApproveLeave(leave.id, leave.name)}
                        style={{ ...styles.bulkBtn, backgroundColor: '#2E7D32', color: '#fff', border: 'none' }}
                        className="press-interactive"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setLeaves(leaves.filter(l => l.id !== leave.id)); triggerToast('Leave request rejected.'); }}
                        style={{ ...styles.bulkBtn, backgroundColor: '#D32F2F', color: '#fff', border: 'none' }}
                        className="press-interactive"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Academic Directory Overlay */}
      {activeOverlay === 'students_directory' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Records Directory</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {studentsList.map((std, idx) => (
                <div key={idx} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{std.name}</h5>
                    <span style={styles.studentRollText}>Roll: {std.id} • Stream: {std.course}</span>
                    <p style={{ fontSize: '10.5px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      Att: {std.attendance} | Fees: {std.fees}
                    </p>
                  </div>
                  <button onClick={() => triggerToast(`Modifying credentials for ${std.name}...`)} style={styles.actionItemBtn} className="press-interactive">Edit</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Faculty Directory Overlay */}
      {activeOverlay === 'faculty_directory' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Faculty Directory</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn} className="press-interactive"><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              {faculty.map((f, idx) => (
                <div key={idx} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{f.name}</h5>
                    <span style={styles.studentRollText}>{f.dept} Dept • Experience: {f.exp}</span>
                    <p style={{ fontSize: '10.5px', color: 'var(--muted-gray)', marginTop: '2px' }}>Qual: {f.qual} | Status: {f.status}</p>
                  </div>
                  <button onClick={() => triggerToast(`Contacting Lecturer ${f.name}...`)} style={styles.actionItemBtn} className="press-interactive">Contact</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Notification Toast */}
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

// --- COMBINED ACADEMICS VIEW (Teacher My Classes + Admin AI Intelligence) ---
export const AdminAcademicsView: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<'classes' | 'ai'>('classes');

  return (
    <div style={styles.container}>
      {renderBackgroundDesign()}
      {/* Top Segment Controller */}
      <header style={styles.header}>
        <div style={{ display: 'flex', backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: '14px', padding: '3px', border: '1px solid rgba(0, 0, 0, 0.03)', width: '320px', margin: '0 auto 12px auto' }}>
          <button
            onClick={() => setActiveSegment('classes')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontFamily: 'var(--font-family)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: activeSegment === 'classes' ? '#fff' : 'transparent',
              color: activeSegment === 'classes' ? '#0F172A' : 'var(--muted-gray)',
              boxShadow: activeSegment === 'classes' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            My Classes
          </button>
          <button
            onClick={() => setActiveSegment('ai')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontFamily: 'var(--font-family)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: activeSegment === 'ai' ? '#fff' : 'transparent',
              color: activeSegment === 'ai' ? '#0F172A' : 'var(--muted-gray)',
              boxShadow: activeSegment === 'ai' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            AI Intelligence
          </button>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        {activeSegment === 'classes' ? <FacultyClassesView /> : <AdminAiInsightsView />}
      </div>
    </div>
  );
};

// --- COMBINED UPDATES VIEW (Compose Broadcaster + Ledger Reports) ---
export const AdminUpdatesView: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<'broadcaster' | 'ledger'>('broadcaster');

  return (
    <div style={styles.container}>
      {renderBackgroundDesign()}
      {/* Top Segment Controller */}
      <header style={styles.header}>
        <div style={{ display: 'flex', backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: '14px', padding: '3px', border: '1px solid rgba(0, 0, 0, 0.03)', width: '320px', margin: '0 auto 12px auto' }}>
          <button
            onClick={() => setActiveSegment('broadcaster')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontFamily: 'var(--font-family)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: activeSegment === 'broadcaster' ? '#fff' : 'transparent',
              color: activeSegment === 'broadcaster' ? '#0F172A' : 'var(--muted-gray)',
              boxShadow: activeSegment === 'broadcaster' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            Broadcaster
          </button>
          <button
            onClick={() => setActiveSegment('ledger')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '10px',
              border: 'none',
              fontFamily: 'var(--font-family)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: activeSegment === 'ledger' ? '#fff' : 'transparent',
              color: activeSegment === 'ledger' ? '#0F172A' : 'var(--muted-gray)',
              boxShadow: activeSegment === 'ledger' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            Ledger Reports
          </button>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        {activeSegment === 'broadcaster' ? <FacultyUpdatesView /> : <AdminReportsView />}
      </div>
    </div>
  );
};

// --- ADMIN REPORTS VIEW ---
export const AdminReportsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      <main style={styles.content}>
        <GlassCard hoverable={false} style={styles.infoSheetCard}>
          <h3 style={styles.sectionTitle}>Compile & Export Ledgers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
            <button onClick={() => triggerToast('Tuition Fee Audit Ledger exported.')} style={styles.quickBtn} className="press-interactive">Tuition Fee Audits Summary</button>
            <button onClick={() => triggerToast('Overall Campus Attendance metrics exported.')} style={styles.quickBtn} className="press-interactive">Campus Attendance Logs</button>
            <button onClick={() => triggerToast('Hostel Log logs exported.')} style={styles.quickBtn} className="press-interactive">Hostel Occupancy Ledger</button>
          </div>
        </GlassCard>
      </main>

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
  const { setThemeMode } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
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
        <div style={styles.content}>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {renderBackgroundDesign()}
      <header style={styles.header}>
        <h1 style={styles.title}>Principal Account</h1>
        <p style={styles.subtitle}>Manage administrator profile & credentials</p>
      </header>

      <main style={{ ...styles.content, paddingBottom: '40px' }}>
        
        {/* PROFILE CARD */}
        <GlassCard hoverable={false} style={styles.heroCard}>
          <div style={styles.parentWelcomeRow}>
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
              <span style={{ color: 'var(--muted-gray)', fontWeight: 600 }}>Subscription Status:</span>
              <strong style={{ color: 'var(--dark-charcoal)' }}>Enterprise Plus (Active)</strong>
            </div>
            <div style={styles.metaRow}>
              <span style={{ color: 'var(--muted-gray)', fontWeight: 600 }}>Clearance Level:</span>
              <strong style={{ color: 'var(--dark-charcoal)' }}>Level 5 (Institution Administrator)</strong>
            </div>
            <div style={styles.metaRow}>
              <span style={{ color: 'var(--muted-gray)', fontWeight: 600 }}>Contact Email:</span>
              <strong style={{ color: 'var(--dark-charcoal)' }}>ramesh.kumar@inspire.edu</strong>
            </div>
          </div>
        </GlassCard>

        {/* Global theme selection */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Settings</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Light', 'Dark', 'System'].map((m) => (
              <button
                key={m}
                onClick={() => setThemeMode(m as any)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1.5px solid var(--card-border)',
                  fontFamily: 'var(--font-family)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  color: 'var(--dark-charcoal)'
                }}
                className="press-interactive"
              >
                {m} Theme
              </button>
            ))}
          </div>
        </section>

        <button onClick={() => setShowLogoutConfirm(true)} style={styles.logoutBtn} className="press-interactive">
          Sign Out of Console
        </button>
      </main>

      {/* Logout confirmation popup overlay */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.gatePassSheet} className="anim-scale-in">
            <h4 style={{ fontSize: '16px', fontWeight: 850 }}>Confirm Session Logout</h4>
            <p style={styles.gatewayText}>Are you sure you want to terminate your current administrative session?</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ ...styles.sheetBtn, backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--muted-gray)' }}>Cancel</button>
              <button onClick={handleLogout} style={{ ...styles.sheetBtn, backgroundColor: '#D32F2F', color: '#fff' }}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLING COEFFICIENTS ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
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
    fontSize: '22px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    lineHeight: '1.15',
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
  heroCard: {
    padding: '22px',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    border: '1.5px solid #000',
    boxShadow: 'var(--shadow-md)',
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
    gap: '14px 20px',
    marginTop: '12px',
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
    color: '#fff',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  quickBtn: {
    padding: '16px 12px',
    borderRadius: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    color: 'var(--dark-charcoal)',
    fontSize: '12.5px',
    fontWeight: 750,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  chartContainer: {
    padding: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
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
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    paddingBottom: '6px',
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
  activityCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  activityTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    fontSize: '11.5px',
  },
  activityTimeText: {
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  activityDescText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
    textAlign: 'right',
    flex: 1,
    marginLeft: '12px'
  },
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
    marginBottom: '18px',
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
  formLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
  },
  textInputBox: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1.5px solid var(--card-border)',
    fontSize: '12.5px',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
    transition: 'border-color 0.2s',
  },
  selectInput: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1.5px solid var(--card-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
  },
  saveSubmitBtn: {
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'var(--royal-gold)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
    marginTop: '8px',
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
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
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
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
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
  noticeCard: {
    padding: '16px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: 'var(--shadow-sm)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  statusBadge: {
    fontSize: '8px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    padding: '2px 8px',
    borderRadius: '8px',
    alignSelf: 'flex-start',
    border: '1px solid rgba(212,175,55,0.2)',
  },
  noticeDescText: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
  },
  heroAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1.5px solid rgba(212, 175, 55, 0.3)',
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
  bulkRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  bulkBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  toggleButtonGroup: {
    display: 'flex',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '10px',
    padding: '2px',
    border: '1px solid rgba(0,0,0,0.02)'
  },
  leaveApprovalCard: {
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '10px'
  },
  marksInputBox: {
    width: '80px',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1.5px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    textAlign: 'center'
  },
  modalOverlay: {
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
  gatewayText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.5',
    margin: '10px 0 16px 0',
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
  }
};

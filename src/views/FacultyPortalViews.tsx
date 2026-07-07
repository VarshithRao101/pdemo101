import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { InspireLogo } from '../components/common/InspireLogo';

// --- SHARED ICON REPRESENTATIONS ---
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- FACULTY DASHBOARD VIEW ---
export const FacultyDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, setThemeMode } = useNavigation();

  // Take Attendance State
  const [attendanceClass, setAttendanceClass] = useState('MPC');
  const [attendanceSection, setAttendanceSection] = useState('A');
  const [students, setStudents] = useState([
    { id: 1, name: 'Varshith Rao', roll: '240145', status: 'Present' },
    { id: 2, name: 'Aaditya Varma', roll: '240102', status: 'Present' },
    { id: 3, name: 'Rahul Khanna', roll: '240188', status: 'Absent' },
    { id: 4, name: 'Sneha Reddy', roll: '240192', status: 'Leave' },
    { id: 5, name: 'Kavya Sharma', roll: '240114', status: 'Present' }
  ]);

  // Upload Marks State
  const [marksExam, setMarksExam] = useState('Unit Test 2');
  const [marksClass, setMarksClass] = useState('MPC-A');
  const [marksList, setMarksList] = useState([
    { id: 1, name: 'Varshith Rao', roll: '240145', score: '24' },
    { id: 2, name: 'Aaditya Varma', roll: '240102', score: '22' },
    { id: 3, name: 'Rahul Khanna', roll: '240188', score: '18' },
    { id: 4, name: 'Sneha Reddy', roll: '240192', score: '20' },
    { id: 5, name: 'Kavya Sharma', roll: '240114', score: '23' }
  ]);

  // Leave Requests State
  const [leaves, setLeaves] = useState([
    { id: 1, name: 'Varshith Rao', type: 'Home Leave', reason: 'Family festival outing', dates: '12 July - 15 July', status: 'Pending' },
    { id: 2, name: 'Aaditya Varma', type: 'Outing Pass', reason: 'Medical dental appointment', dates: 'Tomorrow (02:00 PM)', status: 'Pending' }
  ]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Announcement State
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceDesc, setAnnounceDesc] = useState('');
  const [announceAudience, setAnnounceAudience] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q) {
      setSearchResults([]);
      return;
    }
    const all = [
      { name: 'Varshith Rao', id: 'IJC240145', role: 'Student • MPC-A', hostel: 'Block A - 203' },
      { name: 'Aaditya Varma', id: 'IJC240102', role: 'Student • MPC-A', hostel: 'Block B - 104' },
      { name: 'Rahul Khanna', id: 'IJC240188', role: 'Student • MPC-B', hostel: 'Block C - 302' }
    ];
    const filtered = all.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.id.toLowerCase().includes(q.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSaveAttendance = () => {
    triggerToast('Attendance Saved Successfully.');
    setActiveOverlay(null);
  };

  const handleSaveMarks = () => {
    triggerToast('Marks Saved Successfully.');
    setActiveOverlay(null);
  };

  const handleApproveLeave = (id: number, name: string) => {
    setLeaves(prev => prev.filter(l => l.id !== id));
    triggerToast(`Leave request approved for ${name}.`);
  };

  const handlePublishAnnounce = () => {
    if (!announceTitle || !announceDesc) {
      triggerToast('Please fill all announcement fields.');
      return;
    }
    triggerToast('Announcement Published Successfully.');
    setAnnounceTitle('');
    setAnnounceDesc('');
    setActiveOverlay(null);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 120, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {/* Top Banner Faculty Info */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>SF</div>
            <div>
              <span style={styles.greetingText}>Good Morning,</span>
              <h2 style={styles.parentWelcomeTitle}>Mr. Srinivas</h2>
              <p style={styles.childMetaText}>Physics Lecturer • Faculty ID: <strong>FAC-1045</strong></p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* VERY VISIBLE LOGO BRANDING */}
            <InspireLogo size="md" />

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
        </div>
      </header>

      <main style={styles.content}>
        
        {/* HERO SUMMARY CARD */}
        <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
          <h3 style={styles.sectionTitle}>Academic Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Today's Classes</span>
              <span style={styles.summaryValue}>6 Classes</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Assigned Students</span>
              <span style={styles.summaryValue}>320 Students</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Attendance Status</span>
              <span style={{ ...styles.summaryValue, color: '#D32F2F' }}>2 Pending</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Active Assignments</span>
              <span style={styles.summaryValue}>18 Pending</span>
            </div>
          </div>
        </GlassCard>

        {/* TODAY'S SCHEDULE TIMELINE */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Today's Schedule</h3>
          <div style={styles.scheduleTimelineRow}>
            <div style={styles.timelineCard}>
              <span style={styles.timeTag}>08:30 AM</span>
              <h4 style={styles.classTitle}>MPC-A</h4>
              <p style={styles.subjectDesc}>Physics Lecture</p>
            </div>
            <div style={styles.timelineCard}>
              <span style={styles.timeTag}>09:30 AM</span>
              <h4 style={styles.classTitle}>MPC-B</h4>
              <p style={styles.subjectDesc}>Physics Lecture</p>
            </div>
            <div style={styles.timelineCard}>
              <span style={styles.timeTag}>11:00 AM</span>
              <h4 style={styles.classTitle}>BiPC-A</h4>
              <p style={styles.subjectDesc}>Physics Lecture</p>
            </div>
            <div style={styles.timelineCard}>
              <span style={styles.timeTag}>01:30 PM</span>
              <h4 style={styles.classTitle}>MPC-C</h4>
              <p style={styles.subjectDesc}>Physics Lab</p>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS GRID */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.quickGrid}>
            <button onClick={() => setActiveOverlay('attendance')} style={styles.quickBtn} className="press-interactive">
              Take Attendance
            </button>
            <button onClick={() => setActiveOverlay('marks')} style={styles.quickBtn} className="press-interactive">
              Upload Marks
            </button>
            <button onClick={() => setActiveOverlay('assignments')} style={styles.quickBtn} className="press-interactive">
              Assignments
            </button>
            <button onClick={() => setActiveOverlay('announcements')} style={styles.quickBtn} className="press-interactive">
              Announcements
            </button>
            <button onClick={() => setActiveOverlay('leaves')} style={styles.quickBtn} className="press-interactive">
              Leave Requests
            </button>
            <button onClick={() => setActiveOverlay('search')} style={styles.quickBtn} className="press-interactive">
              Student Search
            </button>
            <button onClick={() => setActiveOverlay('reports')} style={styles.quickBtn} className="press-interactive">
              Class Reports
            </button>
            <button onClick={() => setActiveOverlay('calendar')} style={styles.quickBtn} className="press-interactive">
              Academic Calendar
            </button>
          </div>
        </section>

      </main>

      {/* --- QUICK ACTION OVERLAYS --- */}

      {/* 1. Take Attendance Overlay */}
      {activeOverlay === 'attendance' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Take Attendance</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
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
              <button onClick={() => setStudents(students.map(s => ({ ...s, status: 'Present' })))} style={styles.bulkBtn}>Mark All Present</button>
              <button onClick={() => setStudents(students.map(s => ({ ...s, status: 'Absent' })))} style={styles.bulkBtn}>Reset</button>
            </div>
            <div style={styles.studentListScroll}>
              {students.map((student) => (
                <div key={student.id} style={styles.attendanceStudentRow}>
                  <div>
                    <h5 style={styles.studentNameText}>{student.name}</h5>
                    <span style={styles.studentRollText}>Roll: {student.roll}</span>
                  </div>
                  <div style={styles.toggleButtonGroup}>
                    {['Present', 'Absent', 'Leave'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStudents(students.map(s => s.id === student.id ? { ...s, status: st } : s))}
                        style={{
                          ...styles.toggleBtn,
                          backgroundColor: student.status === st ? 'var(--royal-gold)' : 'transparent',
                          color: student.status === st ? '#fff' : 'var(--muted-gray)'
                        }}
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
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
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
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <GlassCard hoverable={false} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={styles.actionItemTitle}>Create New Assignment</h4>
              <input type="text" placeholder="Assignment Title" style={styles.textInputBox} />
              <input type="text" placeholder="Due Date (e.g. 15 July)" style={styles.textInputBox} />
              <button onClick={() => { triggerToast('Assignment published successfully.'); setActiveOverlay(null); }} style={styles.actionBtnPrimary}>Publish Assignment</button>
            </GlassCard>
            <div style={{ ...styles.studentListScroll, marginTop: '12px' }}>
              <div style={styles.noticeCard}>
                <span style={styles.statusBadge}>ACTIVE</span>
                <h4 style={styles.noticeTitleText}>Solenoids Practice Questions</h4>
                <p style={styles.noticeDescText}>Submit calculations for solenoids field intensities. Class: MPC-A.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: 'var(--muted-gray)' }}>
                  <span>Submissions: 28 / 32</span>
                  <span>Due: 12 July 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Announcements Overlay */}
      {activeOverlay === 'announcements' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Compose Announcement</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <input
                type="text"
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
                placeholder="Announcement Title"
                style={styles.textInputBox}
              />
              <textarea
                value={announceDesc}
                onChange={(e) => setAnnounceDesc(e.target.value)}
                placeholder="Description detail..."
                style={{ ...styles.textInputBox, height: '100px', resize: 'none' }}
              />
              <div style={styles.formRow}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Target Audience:</label>
                <select value={announceAudience} onChange={(e) => setAnnounceAudience(e.target.value)} style={styles.selectInput}>
                  <option value="All">All</option>
                  <option value="Students">Students Only</option>
                  <option value="Parents">Parents Only</option>
                </select>
              </div>
              <button onClick={handlePublishAnnounce} style={styles.saveSubmitBtn} className="press-interactive">Publish Announcement</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Leave Approvals Overlay */}
      {activeOverlay === 'leaves' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Outing Leaves</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
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
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setLeaves(leaves.filter(l => l.id !== leave.id)); triggerToast('Leave request rejected.'); }}
                        style={{ ...styles.bulkBtn, backgroundColor: '#D32F2F', color: '#fff', border: 'none' }}
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

      {/* 6. Student Search Overlay */}
      {activeOverlay === 'search' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Student Directory Search</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
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
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-gray)' }}>No student profiles match query.</p>
              ) : (
                searchResults.map((std, idx) => (
                  <div key={idx} style={styles.attendanceStudentRow}>
                    <div>
                      <h5 style={styles.studentNameText}>{std.name}</h5>
                      <span style={styles.studentRollText}>ID: {std.id} • {std.role}</span>
                      <p style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>Hostel: {std.hostel}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Class Reports Overlay */}
      {activeOverlay === 'reports' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Section Performance Reports</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              <GlassCard hoverable={false} style={styles.resultSummaryCard}>
                <div>
                  <span style={styles.resultExamLabel}>Section MPC-A</span>
                  <h4 style={styles.resultMarksValue}>Average Attendance: 96%</h4>
                  <span style={styles.resultGradeText}>Exam Average: 88%</span>
                </div>
              </GlassCard>
              <GlassCard hoverable={false} style={{ ...styles.resultSummaryCard, marginTop: '12px' }}>
                <div>
                  <span style={styles.resultExamLabel}>Section MPC-B</span>
                  <h4 style={styles.resultMarksValue}>Average Attendance: 94%</h4>
                  <span style={styles.resultGradeText}>Exam Average: 84%</span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* 8. Academic Calendar Overlay */}
      {activeOverlay === 'calendar' && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={styles.overlaySheet} className="glass-panel-heavy">
            <div style={styles.overlayHeader}>
              <h3 style={styles.modalTitle}>Academic Calendar</h3>
              <button onClick={() => setActiveOverlay(null)} style={styles.closeBtn}><CloseIcon /></button>
            </div>
            <div style={styles.studentListScroll}>
              <div style={styles.activityRow}>
                <span>15 July 2026</span>
                <strong>Parent-Teacher Meeting</strong>
              </div>
              <div style={styles.activityRow}>
                <span>12 July 2026</span>
                <strong>Unit Test 3 Examinations</strong>
              </div>
              <div style={styles.activityRow}>
                <span>15 August 2026</span>
                <strong>Independence Day Celebrations</strong>
              </div>
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

// --- FACULTY CLASSES VIEW ---
export const FacultyClassesView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { theme, setThemeMode } = useNavigation();

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={styles.title}>Assigned Classes</h1>
            <p style={styles.subtitle}>Curriculum progression overview & logs</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GlassCard hoverable={false} style={styles.infoSheetCard}>
            <div style={styles.infoSheetItem}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Section MPC-A</span>
                <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>32 Registered Students</p>
              </div>
              <span style={styles.statusBadge}>90% Covered</span>
            </div>
            <div style={styles.infoSheetItem}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Section MPC-B</span>
                <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>30 Registered Students</p>
              </div>
              <span style={styles.statusBadge}>85% Covered</span>
            </div>
            <div style={{ ...styles.infoSheetItem, border: 'none', paddingBottom: 0 }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Section BiPC-A</span>
                <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>28 Registered Students</p>
              </div>
              <span style={styles.statusBadge}>82% Covered</span>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

// --- FACULTY UPDATES VIEW ---
export const FacultyUpdatesView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, setThemeMode } = useNavigation();

  // Form states
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [audience, setAudience] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePublish = () => {
    if (!title || !desc) {
      triggerToast('Please fill all circular fields.');
      return;
    }
    triggerToast('Circular Published Successfully.');
    setTitle('');
    setDesc('');
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
            <h1 style={styles.title}>Publish Circulars</h1>
            <p style={styles.subtitle}>Broadcast updates to students and parents</p>
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
        <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={styles.sectionTitle}>Compose Campus Broadcaster</h3>
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
            placeholder="Compose broadcast content..."
            style={{ ...styles.textInputBox, height: '120px', resize: 'none' }}
          />
          <div style={styles.formRow}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Audience:</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} style={styles.selectInput}>
              <option value="All">All Students & Parents</option>
              <option value="Students">Students Only</option>
              <option value="Parents">Parents Only</option>
            </select>
          </div>
          <button onClick={handlePublish} style={styles.saveSubmitBtn} className="press-interactive">Publish Broadcast</button>
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

// --- FACULTY PROFILE VIEW ---
export const FacultyProfileView: React.FC = () => {
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
            <h1 style={styles.title}>Faculty Profile</h1>
            <p style={styles.subtitle}>Manage lecturer profile & configurations</p>
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
            <div style={styles.heroAvatar}>SF</div>
            <div>
              <h2 style={styles.studentName}>Mr. Srinivas</h2>
              <span style={styles.studentID}>Physics Department Lecturer</span>
              <span style={styles.statusBadge}>Active Staff</span>
            </div>
          </div>
          <div style={styles.heroLineDivider} />
          <div style={styles.heroMetaGrid}>
            <div style={styles.metaRow}>
              <span>Qualification:</span>
              <strong>M.Sc. Physics (IIT Madras)</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Teaching Experience:</span>
              <strong>12 Years</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Official Email:</span>
              <strong>srinivas.phy@inspire.edu</strong>
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
            <p style={styles.gatewayText}>Are you sure you want to log out of your faculty account?</p>
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
    padding: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 18px 48px rgba(0, 0, 0, 0.28)',
    borderRadius: '28px',
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

  /* TIMELINE TIMELINE */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scheduleTimelineRow: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  timelineCard: {
    minWidth: '130px',
    padding: '16px 18px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  timeTag: {
    fontSize: '9.5px',
    color: 'var(--royal-gold)',
    fontWeight: 800,
  },
  classTitle: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  subjectDesc: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
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
    maxWidth: '400px',
    maxHeight: '80vh',
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
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    padding: '12px 14px',
    backgroundColor: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
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
  toggleButtonGroup: {
    display: 'flex',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '8px',
    padding: '2px',
  },
  toggleBtn: {
    padding: '4px 8px',
    fontSize: '9.5px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
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
  marksInputBox: {
    width: '70px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'var(--dark-charcoal)',
  },

  /* NOTICE CARDS */
  noticeCard: {
    padding: '16px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
  noticeTitleText: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  noticeDescText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
  },
  actionBtnPrimary: {
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--royal-gold)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
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
  resultSummaryCard: {
    padding: '14px 16px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: '16px',
  },
  resultExamLabel: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 650,
  },
  resultMarksValue: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  resultGradeText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
  },
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    fontSize: '12px',
  },

  /* INFO SHEETS */
  infoSheetCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    borderRadius: '20px',
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

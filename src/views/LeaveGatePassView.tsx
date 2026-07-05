import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { PremiumButton } from '../components/common/PremiumButton';

// --- SVGS & ILLUSTRATIONS ---

const ShieldBadgeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PhoneIcon = () => (
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

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// High-fidelity vector QR Code structure
const QrCodeIllustration = () => (
  <svg width="140" height="140" viewBox="0 0 100 100" fill="none">
    {/* Background Grid Accent */}
    <rect width="100" height="100" rx="12" fill="rgba(255, 255, 255, 0.9)" />
    
    {/* Outer boundary corners */}
    <rect x="5" y="5" width="22" height="22" rx="4" stroke="var(--royal-gold)" strokeWidth="4" />
    <rect x="11" y="11" width="10" height="10" rx="2" fill="var(--royal-gold)" />
    
    <rect x="73" y="5" width="22" height="22" rx="4" stroke="var(--royal-gold)" strokeWidth="4" />
    <rect x="79" y="11" width="10" height="10" rx="2" fill="var(--royal-gold)" />
    
    <rect x="5" y="73" width="22" height="22" rx="4" stroke="var(--royal-gold)" strokeWidth="4" />
    <rect x="11" y="79" width="10" height="10" rx="2" fill="var(--royal-gold)" />

    {/* Center alignment anchor */}
    <rect x="77" y="77" width="14" height="14" rx="2" stroke="var(--dark-charcoal)" strokeWidth="2.5" />
    
    {/* QR matrix dots */}
    <circle cx="40" cy="15" r="3" fill="var(--dark-charcoal)" />
    <circle cx="50" cy="12" r="2.5" fill="var(--royal-gold)" />
    <circle cx="60" cy="18" r="3" fill="var(--dark-charcoal)" />
    
    <circle cx="45" cy="35" r="3" fill="var(--royal-gold)" />
    <circle cx="55" cy="40" r="2" fill="var(--dark-charcoal)" />
    <circle cx="35" cy="50" r="3.5" fill="var(--dark-charcoal)" />
    
    <circle cx="15" cy="40" r="2.5" fill="var(--dark-charcoal)" />
    <circle cx="12" cy="50" r="3" fill="var(--royal-gold)" />
    <circle cx="22" cy="45" r="2.5" fill="var(--dark-charcoal)" />
    
    <circle cx="48" cy="58" r="3" fill="var(--dark-charcoal)" />
    <circle cx="58" cy="62" r="2" fill="var(--royal-gold)" />
    <circle cx="38" cy="68" r="3" fill="var(--dark-charcoal)" />

    <circle cx="85" cy="40" r="3" fill="var(--dark-charcoal)" />
    <circle cx="90" cy="52" r="2.5" fill="var(--royal-gold)" />
    <circle cx="78" cy="48" r="3.5" fill="var(--dark-charcoal)" />
    
    <circle cx="68" cy="85" r="3" fill="var(--dark-charcoal)" />
    <circle cx="62" cy="78" r="2" fill="var(--royal-gold)" />
    <circle cx="58" cy="88" r="3" fill="var(--dark-charcoal)" />
  </svg>
);

interface LeaveGatePassViewProps {
  onClose: () => void;
}

export const LeaveGatePassView: React.FC<LeaveGatePassViewProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<'none' | 'home_leave' | 'outing_pass'>('none');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'home' | 'outing'>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Approved & Rejected demonstration states
  const [showActivePass, setShowActivePass] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Circular progress loader offsets
  const [homeLeaveOffset, setHomeLeaveOffset] = useState(283);
  const [outingOffset, setOutingOffset] = useState(283);

  // Form states
  const [homeLeaveForm, setHomeLeaveForm] = useState({
    leaveFrom: '2026-07-15T08:00',
    leaveTo: '2026-07-18T18:00',
    reason: 'Festival weekend family holiday visit',
    emergencyContact: '9848022338',
    parentName: 'Raman Rao',
    docUploaded: false
  });

  const [outingForm, setOutingForm] = useState({
    date: '2026-07-10',
    outTime: '16:00',
    returnTime: '20:00',
    purpose: 'Local grocery buying and dinner outing',
    guardianContact: '9848022338',
    destination: 'Kondapur, Hyderabad'
  });

  // Skeleton Loader duration: 600ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    const offsets = setTimeout(() => {
      // Home Leave Balance: 8/12 remaining (66.7%) -> Offset = 282.7 * (1 - 0.667) = 94.2
      setHomeLeaveOffset(94.2);
      // Outing Pass Balance: 24/30 remaining (80.0%) -> Offset = 282.7 * (1 - 0.8) = 56.5
      setOutingOffset(56.5);
    }, 200);

    return () => {
      clearTimeout(timer);
      clearTimeout(offsets);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleHomeLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessType('home');
    setShowSuccess(true);
    
    // Simulate navigation transition from form success to active APPROVED state
    setTimeout(() => {
      setShowSuccess(false);
      setActiveForm('none');
      setShowActivePass(true);
      triggerToast('Home leave request submitted successfully!');
    }, 1500);
  };

  const handleOutingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessType('outing');
    setShowSuccess(true);
    
    // Simulate navigation transition from form success to active APPROVED state
    setTimeout(() => {
      setShowSuccess(false);
      setActiveForm('none');
      setShowActivePass(true);
      triggerToast('Outing pass request submitted successfully!');
    }, 1500);
  };

  // Contacts dataset
  const contactDirectory = [
    { name: 'Hostel Warden (Boys)', role: 'Campus Hostel B Block', phone: '+91 90123 45678', email: 'warden.b@inspire.edu' },
    { name: 'Academic Coordinator', role: 'MPC Department Head', phone: '+91 90123 45679', email: 'coord.mpc@inspire.edu' },
    { name: 'Principal Office', role: 'Administration & Policy', phone: '+91 90123 45680', email: 'principal@inspire.edu' },
    { name: 'Transport Office', role: 'Outing Shuttles & Buses', phone: '+91 90123 45681', email: 'transport@inspire.edu' }
  ];

  // Shimmer skeleton layout renderer
  if (isLoading) {
    return (
      <div className="view-container" style={styles.container}>
        <header style={styles.appBar}>
          <div style={{ width: 24, height: 24, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 150, height: 20, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 24, height: 24 }} />
        </header>

        <div style={styles.content}>
          <div style={{ height: 130, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ height: 160, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
            <div style={{ height: 160, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
          </div>
          <div style={{ height: 120, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  // Success screen animation overlay
  if (showSuccess) {
    return (
      <div style={styles.successScreen} className="anim-fade-in">
        <div style={styles.successWrapper} className="anim-scale-in">
          <div style={styles.successPulseCrest}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={styles.successTitle}>Submitted Successfully</h2>
          <p style={styles.successSubtitle}>
            Your {successType === 'home' ? 'Home Leave' : 'Outing Pass'} request has been filed for warden review.
          </p>
          <span style={styles.successFooter}>Routing to Leave Status...</span>
        </div>
      </div>
    );
  }

  // Home Leave Apply Form Screen
  if (activeForm === 'home_leave') {
    return (
      <div className="view-container anim-slide-up" style={styles.container}>
        <header style={styles.appBar}>
          <button onClick={() => setActiveForm('none')} style={styles.backBtn} className="press-interactive" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Apply Home Leave</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={styles.content}>
          <form onSubmit={handleHomeLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={styles.formCard}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Leave From</label>
                <input
                  type="datetime-local"
                  required
                  value={homeLeaveForm.leaveFrom}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, leaveFrom: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Leave To</label>
                <input
                  type="datetime-local"
                  required
                  value={homeLeaveForm.leaveTo}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, leaveTo: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={homeLeaveForm.reason}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, reason: e.target.value })}
                  style={styles.textareaField}
                  placeholder="E.g., Festival celebrations with parents at home town..."
                />
              </div>
            </GlassCard>

            <GlassCard hoverable={false} style={styles.formCard}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Parent Name</label>
                <input
                  type="text"
                  required
                  value={homeLeaveForm.parentName}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, parentName: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Emergency Contact Number</label>
                <input
                  type="tel"
                  required
                  value={homeLeaveForm.emergencyContact}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, emergencyContact: e.target.value })}
                  style={styles.inputField}
                />
              </div>
            </GlassCard>

            {/* Document upload placeholder */}
            <GlassCard
              hoverable={true}
              onClick={() => {
                setHomeLeaveForm({ ...homeLeaveForm, docUploaded: true });
                triggerToast('Supporting document attached successfully.');
              }}
              style={{
                ...styles.uploadContainer,
                borderColor: homeLeaveForm.docUploaded ? 'var(--royal-gold)' : 'rgba(0,0,0,0.1)'
              }}
            >
              <UploadIcon />
              <div style={styles.uploadTextWrapper}>
                <span style={styles.uploadPrimaryText}>
                  {homeLeaveForm.docUploaded ? 'Document Attached' : 'Attach Supporting Document'}
                </span>
                <span style={styles.uploadSubText}>
                  {homeLeaveForm.docUploaded ? 'parents_permission_letter.pdf (220 KB)' : 'Optional letter, medical certificate (PDF, JPG)'}
                </span>
              </div>
            </GlassCard>

            <PremiumButton fullWidth={true} variant="primary" size="lg" type="submit">
              Submit Leave Request
            </PremiumButton>
          </form>
        </main>
      </div>
    );
  }

  // Outing Pass Request Screen
  if (activeForm === 'outing_pass') {
    return (
      <div className="view-container anim-slide-up" style={styles.container}>
        <header style={styles.appBar}>
          <button onClick={() => setActiveForm('none')} style={styles.backBtn} className="press-interactive" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Request Outing Pass</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={styles.content}>
          <form onSubmit={handleOutingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={styles.formCard}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Date of Outing</label>
                <input
                  type="date"
                  required
                  value={outingForm.date}
                  onChange={(e) => setOutingForm({ ...outingForm, date: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Out Time</label>
                  <input
                    type="time"
                    required
                    value={outingForm.outTime}
                    onChange={(e) => setOutingForm({ ...outingForm, outTime: e.target.value })}
                    style={styles.inputField}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Expected Return</label>
                  <input
                    type="time"
                    required
                    value={outingForm.returnTime}
                    onChange={(e) => setOutingForm({ ...outingForm, returnTime: e.target.value })}
                    style={styles.inputField}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} style={styles.formCard}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Destination Address</label>
                <input
                  type="text"
                  required
                  value={outingForm.destination}
                  onChange={(e) => setOutingForm({ ...outingForm, destination: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Purpose of Outing</label>
                <input
                  type="text"
                  required
                  value={outingForm.purpose}
                  onChange={(e) => setOutingForm({ ...outingForm, purpose: e.target.value })}
                  style={styles.inputField}
                  placeholder="E.g., Textbooks purchasing at bookstore..."
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Local Guardian Contact</label>
                <input
                  type="tel"
                  required
                  value={outingForm.guardianContact}
                  onChange={(e) => setOutingForm({ ...outingForm, guardianContact: e.target.value })}
                  style={styles.inputField}
                />
              </div>
            </GlassCard>

            <PremiumButton fullWidth={true} variant="primary" size="lg" type="submit">
              Submit Outing Request
            </PremiumButton>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="view-container anim-slide-up" style={styles.container}>
      {/* Sticky App Header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <button onClick={onClose} style={styles.backBtn} className="press-interactive" aria-label="Go back to dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, paddingLeft: '8px' }}>
            <h1 style={styles.title}>Leave & Gate Pass</h1>
            <p style={styles.subtitle}>Apply and track hostel leaves and outings</p>
          </div>
          <button
            onClick={() => triggerToast('Leave rules checklist loaded.')}
            style={styles.infoIconBtn}
            className="press-interactive"
            aria-label="View Info"
          >
            <ShieldBadgeIcon />
          </button>
        </div>
      </header>

      {/* Main Scroller Panels */}
      <main style={styles.content}>
        
        {/* Leave Balances Hero Card */}
        <GlassCard hoverable={false} style={styles.heroCard} className="anim-scale-in">
          <div style={styles.heroDetails}>
            <span style={styles.heroLabel}>Leave Balances</span>
            <div style={styles.heroSummaryGrid}>
              <div style={styles.heroSummaryItem}>
                <span style={styles.summaryTitleText}>Home Leave</span>
                <span style={styles.summaryValText}>8 / 12 Remaining</span>
              </div>
              <div style={styles.heroSummaryItem}>
                <span style={styles.summaryTitleText}>Outing Pass</span>
                <span style={styles.summaryValText}>24 / 30 Remaining</span>
              </div>
            </div>
            <div style={styles.academicRow}>
              <span style={styles.academicLabelText}>Academic Status:</span>
              <span style={styles.academicValText}>Excellent</span>
            </div>
          </div>

          <div style={styles.ringsRow}>
            {/* Home leave progress ring (66.7%) */}
            <div style={styles.circularRingItem}>
              <svg width="64" height="64" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#goldGradientLeave)"
                  strokeWidth="8.5"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray="282.7"
                  strokeDashoffset={homeLeaveOffset}
                  style={{
                    transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.3))'
                  }}
                />
              </svg>
              <span style={styles.ringLabelText}>Home</span>
            </div>

            {/* Outing progress ring (80%) */}
            <div style={styles.circularRingItem}>
              <svg width="64" height="64" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#goldGradientLeave)"
                  strokeWidth="8.5"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray="282.7"
                  strokeDashoffset={outingOffset}
                  style={{
                    transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    filter: 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.3))'
                  }}
                />
              </svg>
              <span style={styles.ringLabelText}>Outings</span>
            </div>
          </div>
        </GlassCard>

        {/* Quick Actions Panel */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.quickActionsContainer}>
            <GlassCard hoverable={true} style={styles.actionCard}>
              <div style={styles.actionHeader}>
                <span style={styles.actionEmoji}></span>
                <h4 style={styles.actionTitleText}>Home Leave</h4>
              </div>
              <p style={styles.actionSubtitleText}>Apply for overnight or holiday leave.</p>
              <PremiumButton
                fullWidth={true}
                variant="primary"
                size="sm"
                onClick={() => setActiveForm('home_leave')}
                style={{ marginTop: '12px' }}
              >
                Apply
              </PremiumButton>
            </GlassCard>

            <GlassCard hoverable={true} style={styles.actionCard}>
              <div style={styles.actionHeader}>
                <span style={styles.actionEmoji}></span>
                <h4 style={styles.actionTitleText}>Outing Pass</h4>
              </div>
              <p style={styles.actionSubtitleText}>Request temporary campus outing.</p>
              <PremiumButton
                fullWidth={true}
                variant="primary"
                size="sm"
                onClick={() => setActiveForm('outing_pass')}
                style={{ marginTop: '12px' }}
              >
                Apply
              </PremiumButton>
            </GlassCard>
          </div>
        </section>

        {/* Rejection State Inspector Demo Trigger (Only if there is no rejection visible) */}
        {rejectionReason === null && (
          <section className="anim-slide-up stagger-1">
            <GlassCard
              hoverable={true}
              onClick={() => setRejectionReason('Insufficient academic attendance records for the month. Parental verification required.')}
              style={{ ...styles.actionCard, flex: 1, border: '1px dashed rgba(211, 47, 47, 0.4)', padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D32F2F' }}>
                <span style={{ fontSize: '14px' }}></span>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Demo Rejection Box</span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>Click to preview a rejected leave response state card.</p>
            </GlassCard>
          </section>
        )}

        {/* Rejected State Block (Dynamic Showroom) */}
        {rejectionReason !== null && (
          <section className="anim-slide-up stagger-1">
            <GlassCard hoverable={false} style={styles.rejectedCard} className="glass-red-ring">
              <div style={styles.rejectedHeader}>
                <span style={styles.rejectedIcon}></span>
                <h4 style={styles.rejectedTitleText}>Leave Request Rejected</h4>
              </div>
              <p style={styles.rejectedReasonText}>
                <strong>Reason:</strong> {rejectionReason}
              </p>
              <div style={styles.rejectedActions}>
                <span style={styles.rejectedWarningText}>Please contact concerned hostel authority to appeal.</span>
                <button
                  onClick={() => {
                    setRejectionReason(null);
                    triggerToast('Rejection alert dismissed.');
                  }}
                  style={styles.rejectedDismissBtn}
                  className="press-interactive"
                >
                  Dismiss Alert
                </button>
              </div>
            </GlassCard>
          </section>
        )}

        {/* ACTIVE PASS STATUS TIMELINE */}
        {showActivePass && (
          <section style={styles.section} className="anim-slide-up stagger-2">
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Active Request Tracking</h3>
              <button
                onClick={() => {
                  setShowActivePass(false);
                  triggerToast('Active pass demonstration hidden.');
                }}
                style={styles.sectionHeaderLink}
                className="press-interactive"
              >
                Hide Tracking
              </button>
            </div>
            
            <GlassCard hoverable={false} style={styles.timelineContainerCard}>
              <span style={styles.timelinePassLabel}>Outing Pass • Weekend Grocery</span>
              
              {/* Approval Dotted Timeline Tracker */}
              <div style={styles.timelineList}>
                <div style={styles.timelineItem}>
                  <div style={{ ...styles.timelineNode, backgroundColor: '#2E7D32', color: '#fff' }}></div>
                  <div style={styles.timelineTextWrapper}>
                    <span style={styles.timelineTitleText}>Submitted</span>
                    <span style={styles.timelineSubtitleText}>10 Jul 2026 • 09:00 AM</span>
                  </div>
                </div>

                <div style={styles.timelineItem}>
                  <div style={{ ...styles.timelineNode, backgroundColor: '#2E7D32', color: '#fff' }}></div>
                  <div style={styles.timelineTextWrapper}>
                    <span style={styles.timelineTitleText}>Verified</span>
                    <span style={styles.timelineSubtitleText}>10 Jul 2026 • 10:15 AM</span>
                  </div>
                </div>

                <div style={styles.timelineItem}>
                  <div style={{ ...styles.timelineNode, backgroundColor: '#2E7D32', color: '#fff' }}></div>
                  <div style={styles.timelineTextWrapper}>
                    <span style={styles.timelineTitleText}>Under Review</span>
                    <span style={styles.timelineSubtitleText}>10 Jul 2026 • 11:30 AM</span>
                  </div>
                </div>

                <div style={styles.timelineItem}>
                  <div style={{ ...styles.timelineNode, backgroundColor: '#2E7D32', color: '#fff' }}></div>
                  <div style={styles.timelineTextWrapper}>
                    <span style={styles.timelineTitleText}>Approved</span>
                    <span style={styles.timelineSubtitleText}>10 Jul 2026 • 12:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Approval Info Details */}
              <div style={styles.approvalMetaContainer}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabelText}>Approved By:</span>
                  <span style={styles.metaValText}>Hostel Warden (Boys)</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabelText}>Approval Date:</span>
                  <span style={styles.metaValText}>10 Jul 2026</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabelText}>Time:</span>
                  <span style={styles.metaValText}>12:00 PM</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabelText}>Approval ID:</span>
                  <span style={styles.metaValText}>IJC-LEAVE-9402</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabelText}>Purpose:</span>
                  <span style={styles.metaValText}>Weekend grocery and books shopping</span>
                </div>
              </div>
            </GlassCard>
          </section>
        )}

        {/* DIGITAL QR GATE PASS */}
        {showActivePass && (
          <section style={styles.section} className="anim-slide-up stagger-3">
            <h3 style={styles.sectionTitle}>Digital Gate Pass</h3>
            
            <GlassCard hoverable={false} style={styles.qrCard} className="glass-gold-ring anim-scale-in">
              <div style={styles.qrHeaderRow}>
                {/* Student Photo Placeholder */}
                <div style={styles.qrStudentCrest} className="glass-gold-ring">VR</div>
                <div style={styles.qrStudentMeta}>
                  <h4 style={styles.qrStudentName}>Varshith Rao</h4>
                  <span style={styles.qrStudentID}>ID: IJC240145</span>
                </div>
                <span style={styles.qrBadge}>APPROVED</span>
              </div>

              <div style={styles.qrLineDivider} />

              <div style={styles.qrDetailsGrid}>
                <div style={styles.qrDetailItem}>
                  <span style={styles.qrLabelText}>LEAVE TYPE</span>
                  <span style={styles.qrValText}>Outing Pass</span>
                </div>
                <div style={styles.qrDetailItem}>
                  <span style={styles.qrLabelText}>DESTINATION</span>
                  <span style={styles.qrValText}>Kondapur, Hyd</span>
                </div>
                <div style={styles.qrDetailItem}>
                  <span style={styles.qrLabelText}>VALID DATE</span>
                  <span style={styles.qrValText}>10 July 2026</span>
                </div>
                <div style={styles.qrDetailItem}>
                  <span style={styles.qrLabelText}>VALID TIME</span>
                  <span style={styles.qrValText}>16:00 - 20:00</span>
                </div>
              </div>

              {/* QR Code Illustration container */}
              <div style={styles.qrCodeWrapper}>
                <QrCodeIllustration />
              </div>

              <div style={styles.securityBadgeBlock}>
                <ShieldBadgeIcon />
                <span style={styles.securityBadgeText}>SECURITY VERIFIED GATE PASS</span>
              </div>

              <p style={styles.gateInstructions}>Show this QR at the College Main Gate</p>
            </GlassCard>
          </section>
        )}

        {/* LEAVE HISTORY LIST */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HistoryIcon />
              <h3 style={styles.sectionTitle}>Leave History</h3>
            </div>
            <span style={styles.historyCounter}>3 records</span>
          </div>

          <div style={styles.historyList}>
            <GlassCard
              hoverable={true}
              onClick={() => triggerToast('Overnight visit to home details loaded.')}
              style={styles.historyCard}
            >
              <div style={styles.historyHeader}>
                <div style={styles.historyInfo}>
                  <span style={styles.historyLabelText}>Home Leave</span>
                  <span style={styles.historyDateText}>12 June 2026</span>
                </div>
                <div style={styles.historyStatusGroup}>
                  <span style={{ ...styles.statusBadge, backgroundColor: 'rgba(46, 125, 50, 0.1)', color: '#2E7D32' }}>Approved</span>
                  <span style={styles.historyArrow}>→</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              hoverable={true}
              onClick={() => triggerToast('Weekend library visit details loaded.')}
              style={styles.historyCard}
            >
              <div style={styles.historyHeader}>
                <div style={styles.historyInfo}>
                  <span style={styles.historyLabelText}>Outing Pass</span>
                  <span style={styles.historyDateText}>20 June 2026</span>
                </div>
                <div style={styles.historyStatusGroup}>
                  <span style={{ ...styles.statusBadge, backgroundColor: 'rgba(110, 110, 115, 0.1)', color: 'var(--muted-gray)' }}>Completed</span>
                  <span style={styles.historyArrow}>→</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              hoverable={true}
              onClick={() => setRejectionReason('Insufficient academic attendance records for the month. Parental verification required.')}
              style={styles.historyCard}
            >
              <div style={styles.historyHeader}>
                <div style={styles.historyInfo}>
                  <span style={styles.historyLabelText}>Home Leave</span>
                  <span style={styles.historyDateText}>28 June 2026</span>
                </div>
                <div style={styles.historyStatusGroup}>
                  <span style={{ ...styles.statusBadge, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' }}>Rejected</span>
                  <span style={styles.historyArrow}>→</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* LEAVE POLICY SECTION */}
        <section style={styles.section} className="anim-slide-up stagger-5">
          <GlassCard hoverable={false} style={styles.policyCard}>
            <div style={styles.policyHeader}>
              <ShieldBadgeIcon />
              <h3 style={styles.policyTitle}>Campus Outing Policies</h3>
            </div>
            <ul style={styles.policyList}>
              <li style={styles.policyItem}>Maximum Home Leaves: <strong>12 per Academic Year</strong></li>
              <li style={styles.policyItem}>Maximum Outings: <strong>30 per Academic Year</strong></li>
              <li style={{ ...styles.policyItem, color: '#D32F2F', fontWeight: 600 }}>
                Late Return may result in disciplinary action.
              </li>
            </ul>
          </GlassCard>
        </section>

        {/* CONTACT CAMPUS AUTHORITY DIRECTORY */}
        <section className="anim-slide-up stagger-5" style={{ ...styles.section, paddingBottom: '32px' }}>
          <h3 style={styles.sectionTitle}>Contact Authority</h3>
          
          <div style={styles.contactsGrid}>
            {contactDirectory.map((contact, idx) => (
              <GlassCard key={idx} hoverable={false} style={styles.contactCard}>
                <div style={styles.contactHeaderRow}>
                  {/* Dummy Profile Avatar */}
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
                    onClick={() => triggerToast(`Initiating voice call to ${contact.phone}...`)}
                    style={styles.contactBtn}
                    className="press-interactive"
                    aria-label={`Call ${contact.name}`}
                  >
                    <PhoneIcon />
                    Call
                  </button>
                  <button
                    onClick={() => triggerToast(`Opening mail composer for ${contact.email}...`)}
                    style={styles.contactBtn}
                    className="press-interactive"
                    aria-label={`Email ${contact.name}`}
                  >
                    <EmailIcon />
                    Email
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

      </main>

      {/* Shared SnackBar Toast message box */}
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

      {/* SVG Defs for Gold gradient */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="goldGradientLeave" x1="0%" y1="0%" x2="100%" y2="100%">
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
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
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
  header: {
    padding: 'calc(20px + var(--safe-area-top)) 24px 16px 24px',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
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
  backBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--royal-gold)',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
  },
  heroDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  heroLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  heroSummaryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
  },
  heroSummaryItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryTitleText: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
  summaryValText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  academicRow: {
    marginTop: '14px',
    display: 'flex',
    gap: '6px',
    alignItems: 'baseline',
    fontSize: '12px',
  },
  academicLabelText: {
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  academicValText: {
    color: '#2E7D32',
    fontWeight: 750,
  },
  ringsRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  circularRingItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  ringLabelText: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLink: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '11.5px',
    color: 'var(--royal-gold)',
    fontWeight: 650,
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  quickActionsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1.2px solid rgba(255, 255, 255, 0.6)',
    boxShadow: 'var(--shadow-sm)',
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionEmoji: {
    fontSize: '18px',
  },
  actionTitleText: {
    fontSize: '14px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  actionSubtitleText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.4',
    marginTop: '6px',
    minHeight: '32px',
  },

  /* FORM STYLINGS */
  formCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  inputField: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    transition: 'border-color 0.2s',
  },
  textareaField: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    resize: 'none',
    transition: 'border-color 0.2s',
  },
  uploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1.5px dashed rgba(0, 0, 0, 0.1)',
    borderRadius: 'var(--radius-md)',
  },
  uploadTextWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  uploadPrimaryText: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
  uploadSubText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },

  /* SUCCESS SCREEN STYLINGS */
  successScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  successWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    maxWidth: '300px',
  },
  successPulseCrest: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212,175,55,0.1)',
    border: '2px solid var(--royal-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(212,175,55,0.2)',
    animation: 'pulseGold 1.5s infinite',
  },
  successTitle: {
    fontSize: '22px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
  },
  successSubtitle: {
    fontSize: '13.5px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
  },
  successFooter: {
    fontSize: '11px',
    color: 'var(--royal-gold)',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginTop: '12px',
  },

  /* TIMELINE DYNAMIC TRACKER STYLES */
  timelineContainerCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-sm)',
  },
  timelinePassLabel: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    display: 'block',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
    paddingBottom: '8px',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    position: 'relative',
    paddingLeft: '12px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
  },
  timelineNode: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 800,
    zIndex: 2,
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  timelineTextWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineTitleText: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  timelineSubtitleText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  approvalMetaContainer: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11.5px',
  },
  metaLabelText: {
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  metaValText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
  },

  /* REJECTED CONTAINER STYLES */
  rejectedCard: {
    padding: '20px',
    backgroundColor: 'rgba(211, 47, 47, 0.04)',
    border: '1.5px solid rgba(211, 47, 47, 0.2)',
    boxShadow: 'var(--shadow-sm)',
  },
  rejectedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#D32F2F',
  },
  rejectedIcon: {
    fontSize: '18px',
  },
  rejectedTitleText: {
    fontSize: '14.5px',
    fontWeight: 800,
  },
  rejectedReasonText: {
    fontSize: '12px',
    color: 'var(--dark-charcoal)',
    marginTop: '8px',
    lineHeight: '1.5',
  },
  rejectedActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(211, 47, 47, 0.1)',
  },
  rejectedWarningText: {
    fontSize: '10px',
    color: '#D32F2F',
    fontWeight: 600,
    maxWidth: '180px',
  },
  rejectedDismissBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '10.5px',
    fontWeight: 750,
    color: 'var(--muted-gray)',
    cursor: 'pointer',
  },

  /* DIGITAL QR PASS DESIGN */
  qrCard: {
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '2px solid rgba(212, 175, 55, 0.35)',
    boxShadow: 'var(--shadow-lg), 0 8px 30px rgba(212, 175, 55, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
  },
  qrStudentCrest: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
  },
  qrStudentMeta: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  qrStudentName: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  qrStudentID: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  qrBadge: {
    fontSize: '9px',
    fontWeight: 800,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    color: '#2E7D32',
    padding: '2.5px 8px',
    borderRadius: '8px',
    letterSpacing: '0.04em',
  },
  qrLineDivider: {
    width: '100%',
    height: '1px',
    borderTop: '1px dashed rgba(212, 175, 55, 0.25)',
    margin: '18px 0',
  },
  qrDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px 20px',
    width: '100%',
    marginBottom: '20px',
  },
  qrDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  qrLabelText: {
    fontSize: '9px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  qrValText: {
    fontSize: '13px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  qrCodeWrapper: {
    padding: '8px',
    borderRadius: '16px',
    backgroundColor: '#fff',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  },
  securityBadgeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    borderRadius: '20px',
    border: '1px solid rgba(212, 175, 55, 0.15)',
  },
  securityBadgeText: {
    fontSize: '9px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    letterSpacing: '0.05em',
  },
  gateInstructions: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    marginTop: '12px',
    textAlign: 'center',
  },

  /* LEAVE HISTORY LIST */
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  historyCard: {
    padding: '14px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: 'var(--shadow-sm)',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  historyLabelText: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
  historyDateText: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  historyStatusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusBadge: {
    fontSize: '8.5px',
    fontWeight: 800,
    padding: '2.5px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  historyArrow: {
    fontSize: '14px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  historyCounter: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },

  /* POLICY CARD */
  policyCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-sm)',
  },
  policyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  policyTitle: {
    fontSize: '14px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  policyList: {
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  policyItem: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    lineHeight: '1.5',
  },

  /* CONTACT AUTHORITY DIRECTORY */
  contactsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    borderRadius: '20px',
  },
  contactHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  contactAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
  },
  contactMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  contactName: {
    fontSize: '13.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  contactRole: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  contactActionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  contactBtn: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s',
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

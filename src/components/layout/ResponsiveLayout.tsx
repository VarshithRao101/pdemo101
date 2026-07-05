import React, { useState, type ReactNode } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { FloatingBottomNav } from './FloatingBottomNav';
import { InspireLogo } from '../common/InspireLogo';

interface ResponsiveLayoutProps {
  children: ReactNode;
}

// --- PREMIUM DRAWER SVG ICONS ---
const SvgHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SvgSibling = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="17" y1="11" x2="23" y2="11" />
  </svg>
);

const SvgBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SvgCrest = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const SvgStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SvgQuestion = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SvgPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const SvgCog = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const { isMobile, activeTab, setActiveTab, portalRole, isDrawerOpen, setIsDrawerOpen, theme, setThemeMode } = useNavigation();

  // State hooks for drawer modal views
  const [showSiblingModal, setShowSiblingModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sibling Modal States
  const [siblingId, setSiblingId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkedSiblings, setLinkedSiblings] = useState([
    { name: 'Polsani Rishith Rao', roll: '2421609', branch: 'XI MPC', status: 'Verified' }
  ]);
  const [siblingSuccessMsg, setSiblingSuccessMsg] = useState<string | null>(null);

  // Rate App Modal States
  const [stars, setStars] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Settings Modal States
  const [smsNotif, setSmsNotif] = useState(true);
  const [biometrics, setBiometrics] = useState(true);

  const handleLinkSibling = () => {
    if (!siblingId.trim()) return;
    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      const newSib = {
        name: siblingId === '2421609' ? 'Polsani Rishith Rao' : 'Polsani Shravya Rao',
        roll: siblingId,
        branch: 'XI BiPC',
        status: 'Verified'
      };
      setLinkedSiblings(prev => [...prev, newSib]);
      setSiblingSuccessMsg('Sibling profile linked successfully!');
      setSiblingId('');
      setTimeout(() => setSiblingSuccessMsg(null), 3000);
    }, 1200);
  };

  const handleSubmitFeedback = () => {
    if (stars === 0) return;
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackSuccess(false);
        setStars(0);
        setFeedbackText('');
        setShowRateModal(false);
      }, 2000);
    }, 1200);
  };

  // Mobile side drawer list items (from Screen 1)
  const drawerMenuItems = [
    { label: 'Home', type: 'home', icon: <SvgHome />, action: () => { setIsDrawerOpen(false); setActiveTab('dashboard'); } },
    { label: 'Add Sibling', type: 'sibling', icon: <SvgSibling />, action: () => { setIsDrawerOpen(false); setShowSiblingModal(true); } },
    { label: 'Notifications', type: 'notif', icon: <SvgBell />, action: () => { setIsDrawerOpen(false); setActiveTab('updates'); } },
    { label: 'About Us', type: 'about', icon: <SvgCrest />, action: () => { setIsDrawerOpen(false); setShowAboutModal(true); } },
    { label: 'Spotlight', type: 'spotlight', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setShowSpotlightModal(true); } },
    { label: 'Help & Feedback', type: 'feedback', icon: <SvgQuestion />, action: () => { setIsDrawerOpen(false); setActiveTab('profile'); } },
    { label: 'Rate the App', type: 'rate', icon: <SvgStar />, action: () => { setIsDrawerOpen(false); setShowRateModal(true); } },
    { label: 'Contact Us', type: 'contact', icon: <SvgPhone />, action: () => { setIsDrawerOpen(false); setActiveTab('profile'); } },
    { label: 'Settings', type: 'settings', icon: <SvgCog />, action: () => { setIsDrawerOpen(false); setShowSettingsModal(true); } },
  ];

  // Helper function to render styled Neo-Brutalist Modal Overlay
  const renderModal = (title: string, onClose: () => void, content: React.ReactNode) => {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }} className="anim-fade-in" onClick={onClose}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }} className="anim-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '2px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)'
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 850, color: 'var(--dark-charcoal)' }}>{title}</h3>
            <button onClick={onClose} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dark-charcoal)',
              fontSize: '18px',
              fontWeight: 800,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }} className="press-interactive">✕</button>
          </div>
          {/* Content Body */}
          <div style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'left'
          }}>
            {content}
          </div>
        </div>
      </div>
    );
  };

  // Sibling Modal Content
  const renderSiblingModal = () => renderModal("Link Sibling Profiles", () => setShowSiblingModal(false), (
    <>
      <p style={{ fontSize: '12.5px', color: 'var(--muted-gray)', margin: 0, lineHeight: 1.45 }}>
        Link additional student profiles from your family to access unified dashboards and quick switching.
      </p>

      {/* Linked Sibling Profiles List */}
      <div>
        <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px 0' }}>
          Linked Siblings
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {linkedSiblings.map((sib, i) => (
            <div key={i} style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1.5px solid var(--card-border)',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{sib.name}</h5>
                <span style={{ fontSize: '10.5px', color: 'var(--muted-gray)' }}>Roll: {sib.roll} • {sib.branch}</span>
              </div>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#2E7D32',
                backgroundColor: 'rgba(46,125,50,0.08)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(46,125,50,0.15)'
              }}>
                {sib.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--card-border)', opacity: 0.1, margin: '4px 0' }} />

      {/* Add Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
          Add Sibling Profile
        </h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Enter Student ID (e.g. 2421609)"
            value={siblingId}
            onChange={(e) => setSiblingId(e.target.value)}
            disabled={isLinking}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid var(--card-border)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--dark-charcoal)',
              fontSize: '13px',
              fontFamily: 'var(--font-family)',
              outline: 'none'
            }}
          />
          <button
            onClick={handleLinkSibling}
            disabled={isLinking || !siblingId.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1.5px solid var(--card-border)',
              backgroundColor: 'var(--royal-gold)',
              color: '#000',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              opacity: (!siblingId.trim() || isLinking) ? 0.6 : 1,
            }}
            className="press-interactive"
          >
            {isLinking ? 'Linking...' : 'Link'}
          </button>
        </div>
        {siblingSuccessMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(46,125,50,0.08)',
            border: '1px solid rgba(46,125,50,0.15)',
            color: '#2E7D32',
            fontSize: '11.5px',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            {siblingSuccessMsg}
          </div>
        )}
      </div>
    </>
  ));

  // About Us Modal Content
  const renderAboutModal = () => renderModal("About Inspire Junior College", () => setShowAboutModal(false), (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <InspireLogo size="md" />
      </div>
      <p style={{ fontSize: '12.5px', color: 'var(--muted-gray)', margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
        Inspire Junior College is Hanumakonda's premier institution for IIT-JEE, NEET, and intermediate education, dedicated to training young minds for bright professional careers.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>
            📍 Campus Location
          </h5>
          <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>
            Erragattu Gutta, Bheemaram, Hanumakonda, Telangana
          </span>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>
            📞 Contact Numbers
          </h5>
          <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>
            +91 7416 380 320 | +91 7416 380 324
          </span>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>
            🌐 Web Portal & Email
          </h5>
          <span style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>
            www.inspirehnk.org <br />
            inspirehnk@gmail.com
          </span>
        </div>
      </div>
    </>
  ));

  // Spotlight Modal Content
  const renderSpotlightModal = () => renderModal("Campus Spotlight", () => setShowSpotlightModal(false), (
    <>
      <p style={{ fontSize: '12.5px', color: 'var(--muted-gray)', margin: 0, lineHeight: 1.45 }}>
        Recent accolades, news updates, and student achievements from Inspire Junior College Hanumakonda.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { title: '🥇 JEE Mains Excellence', desc: 'Over 45 students from our Hanumakonda campus secured ranks in the top 1000 in the recent JEE Mains session.', tag: 'Academic' },
          { title: '🔬 Robotics Exhibition', desc: 'Intermediate science exhibition models for clean energy won 1st place in district evaluations.', tag: 'Science' },
          { title: '🏆 Inter-College Basketball Gold', desc: 'Inspire Junior College Sports Team won the Inter-District Intermediate Championship finals.', tag: 'Sports' }
        ].map((item, idx) => (
          <div key={idx} style={{
            padding: '14px',
            borderRadius: '14px',
            border: '1.5px solid var(--card-border)',
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{
                fontSize: '8.5px',
                fontWeight: 800,
                color: 'var(--royal-gold)',
                backgroundColor: 'rgba(212,175,55,0.08)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(212,175,55,0.15)'
              }}>{item.tag}</span>
            </div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{item.title}</h4>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted-gray)', lineHeight: 1.4 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </>
  ));

  // Rate Modal Content
  const renderRateModal = () => renderModal("Rate the Portal App", () => setShowRateModal(false), (
    <>
      {feedbackSuccess ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
          textAlign: 'center'
        }} className="anim-scale-in">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" style={{ marginBottom: '12px' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)', margin: '0 0 6px 0' }}>Thank You!</h4>
          <p style={{ fontSize: '12px', color: 'var(--muted-gray)', margin: 0 }}>Your rating and comments have been securely submitted to help us improve.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '12.5px', color: 'var(--muted-gray)', margin: 0, lineHeight: 1.45, textAlign: 'center' }}>
            Your feedback helps us make the Inspire Portal better for everyone.
          </p>

          {/* Star Selection Row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '8px 0' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setStars(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: star <= stars ? '#FBBF24' : '#E2E8F0',
                  transition: 'transform 0.15s ease'
                }}
                className="press-interactive"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke={star <= stars ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>

          {/* Comment input area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea
              placeholder="What could we improve? (Optional)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isSubmittingFeedback}
              style={{
                width: '100%',
                height: '80px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--card-border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--dark-charcoal)',
                fontSize: '12.5px',
                fontFamily: 'var(--font-family)',
                resize: 'none',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSubmitFeedback}
            disabled={stars === 0 || isSubmittingFeedback}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid var(--card-border)',
              backgroundColor: 'var(--royal-gold)',
              color: '#000',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              width: '100%',
              opacity: (stars === 0 || isSubmittingFeedback) ? 0.6 : 1,
              marginTop: '4px'
            }}
            className="press-interactive"
          >
            {isSubmittingFeedback ? 'Submitting...' : 'Submit Review'}
          </button>
        </>
      )}
    </>
  ));

  // Settings Modal Content
  const renderSettingsModal = () => renderModal("Portal Settings", () => setShowSettingsModal(false), (
    <>
      <p style={{ fontSize: '12.5px', color: 'var(--muted-gray)', margin: 0, lineHeight: 1.45 }}>
        Customize your experience and security options on the Inspire Residential Portal.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Dark Mode Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Theme Toggle</h5>
            <span style={{ fontSize: '10.5px', color: 'var(--muted-gray)' }}>Light / Dark theme toggle</span>
          </div>
          <button
            onClick={() => setThemeMode(theme === 'light' ? 'Dark' : 'Light')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--card-border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--dark-charcoal)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            className="press-interactive"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>

        {/* SMS Notifications Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>SMS Reminders</h5>
            <span style={{ fontSize: '10.5px', color: 'var(--muted-gray)' }}>Receive SMS reports for gate pass approvals</span>
          </div>
          <input
            type="checkbox"
            checked={smsNotif}
            onChange={(e) => setSmsNotif(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: 'var(--royal-gold)'
            }}
          />
        </div>

        {/* Biometrics Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1.5px solid var(--card-border)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Fingerprint Sign-in</h5>
            <span style={{ fontSize: '10.5px', color: 'var(--muted-gray)' }}>Allow biometric pass check at starting view</span>
          </div>
          <input
            type="checkbox"
            checked={biometrics}
            onChange={(e) => setBiometrics(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: 'var(--royal-gold)'
            }}
          />
        </div>

        {/* Security PIN Change */}
        <button
          onClick={() => alert('PIN reset verification code sent to your father, Sridhar Rao\'s phone: +91 ******0320')}
          style={{
            padding: '12px',
            borderRadius: '12px',
            border: '2px solid var(--card-border)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--dark-charcoal)',
            fontWeight: 800,
            fontSize: '12.5px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '4px'
          }}
          className="press-interactive"
        >
          🔑 Reset Portal Security PIN
        </button>

      </div>
    </>
  ));

  if (isMobile) {
    return (
      <div style={styles.mobileWrapper}>
        {/* Render Active Modals */}
        {showSiblingModal && renderSiblingModal()}
        {showAboutModal && renderAboutModal()}
        {showSpotlightModal && renderSpotlightModal()}
        {showRateModal && renderRateModal()}
        {showSettingsModal && renderSettingsModal()}

        {/* Left Side Sliding Navigation Drawer (Screen 1 design) */}
        <div style={styles.mobileDrawerContainer}>
          {/* User profile header card */}
          <div style={styles.drawerProfileHeader}>
            <div style={styles.drawerAvatarOuter}>
              <div style={styles.drawerAvatarInner}>PM</div>
            </div>
            <div style={styles.drawerProfileInfo}>
              <h3 style={styles.drawerProfileName}>Polsani Manoneeth Rao</h3>
              <span style={styles.drawerProfileMeta}>👤 2421604 &gt;</span>
              <div style={styles.drawerBrandText}>INSPIRE JUNIOR COLLEGE</div>
            </div>
          </div>

          <div style={styles.drawerDivider} />

          {/* Navigation Links list */}
          <div style={styles.drawerNavScroll}>
            {drawerMenuItems.map((item, idx) => {
              const isHomeActive = item.type === 'home' && activeTab === 'dashboard';
              const isUpdatesActive = item.type === 'notif' && activeTab === 'updates';
              const isProfileActive = (item.type === 'settings' || item.type === 'contact' || item.type === 'feedback') && activeTab === 'profile';
              const isActive = isHomeActive || isUpdatesActive || isProfileActive;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                  }}
                  style={{
                    ...styles.drawerLinkBtn,
                    color: isActive ? '#3B82F6' : '#94A3B8',
                    borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  <span style={styles.drawerLinkIconCol}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div style={styles.drawerFooterCol}>
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                if ((window as any).logoutUser) (window as any).logoutUser();
              }}
              style={styles.drawerLinkFooterBtn}
            >
              👤 Switch Account
            </button>
            <div style={styles.footerBrandingWrapper}>
              <div style={styles.brandingCrestSmall}>I</div>
              <div style={styles.brandingCrestText}>INSPIRE GROUP</div>
            </div>
          </div>
        </div>

        {/* Main interactive sliding content screen */}
        <div
          onClick={() => {
            if (isDrawerOpen) setIsDrawerOpen(false);
          }}
          style={{
            ...styles.mobileMainView,
            transform: isDrawerOpen ? 'translateX(260px) scale(0.94)' : 'translateX(0px) scale(1)',
            borderRadius: isDrawerOpen ? '24px' : '0px',
            boxShadow: isDrawerOpen ? '0 12px 36px rgba(0,0,0,0.45)' : 'none',
            pointerEvents: isDrawerOpen ? 'none' : 'auto',
          }}
        >
          {children}
          {portalRole !== 'student' && <FloatingBottomNav />}
        </div>
      </div>
    );
  }



  return (
    <div style={styles.desktopContainer} className="anim-fade-in">
      {/* Left Sidebar Menu */}
      <aside style={{
        width: '260px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        backgroundColor: '#0c1938', // Dark blue navy from screenshot
        borderRight: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        position: 'relative'
      }}>
        {/* User profile header card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '20px 8px 8px 8px',
        }}>
          {/* Avatar Clickable to Go to Profile */}
          <div
            onClick={() => setActiveTab('profile')}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.15)',
              marginBottom: '12px',
              cursor: 'pointer'
            }}
            className="press-interactive"
            title="View Profile"
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#CBD5E1',
              color: '#0c1938',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
            }}>
              PM
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <h3
              onClick={() => setActiveTab('profile')}
              style={{
                fontSize: '14.5px',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                cursor: 'pointer'
              }}
              className="press-interactive"
              title="View Profile"
            >
              Polsani Manoneeth Rao
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>ID: 2421604 &gt;</span>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--royal-gold)',
              letterSpacing: '0.08em',
              marginTop: '6px',
              textTransform: 'uppercase'
            }}>
              INSPIRE JUNIOR COLLEGE
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

        {/* Sidebar Nav Links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px'
        }} className="drawer-scrollbar">
          {[
            { label: 'Home', type: 'home', icon: <SvgHome />, action: () => setActiveTab('dashboard') },
            { label: 'Add Sibling', type: 'sibling', icon: <SvgSibling />, action: () => setShowSiblingModal(true) },
            { label: 'Notifications', type: 'notif', icon: <SvgBell />, action: () => setActiveTab('updates'), badge: 5 },
            { label: 'About Us', type: 'about', icon: <SvgCrest />, action: () => setShowAboutModal(true) },
            { label: 'Spotlight', type: 'spotlight', icon: <SvgStar />, action: () => setShowSpotlightModal(true) },
            { label: 'Help & Feedback', type: 'feedback', icon: <SvgQuestion />, action: () => setActiveTab('profile') },
            { label: 'Rate the App', type: 'rate', icon: <SvgStar />, action: () => setShowRateModal(true) },
            { label: 'Contact Us', type: 'contact', icon: <SvgPhone />, action: () => setActiveTab('profile') },
            { label: 'Settings', type: 'settings', icon: <SvgCog />, action: () => setShowSettingsModal(true) },
          ].map((item, idx) => {
            const isHomeActive = item.type === 'home' && activeTab === 'dashboard';
            const isUpdatesActive = item.type === 'notif' && activeTab === 'updates';
            const isProfileActive = (item.type === 'settings' || item.type === 'contact' || item.type === 'feedback') && activeTab === 'profile';
            const isActive = isHomeActive || isUpdatesActive || isProfileActive;
            return (
              <button
                key={idx}
                onClick={item.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontFamily: 'var(--font-family)',
                  transition: 'all 0.2s ease',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  color: isActive ? '#3B82F6' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                  position: 'relative'
                }}
                className="press-interactive"
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#3B82F6' : '#94A3B8' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    backgroundColor: '#EF4444',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 800,
                    borderRadius: '50%',
                    width: '15px',
                    height: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px 8px 0 8px' }}>
          <button
            onClick={() => {
              if ((window as any).logoutUser) (window as any).logoutUser();
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'var(--font-family)',
              transition: 'all 0.2s ease'
            }}
            className="press-interactive"
          >
            Switch Account
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            opacity: 0.6
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1.5px solid #fff',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>I</div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>INSPIRE GROUP</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Render Modals on Desktop */}
        {showSiblingModal && renderSiblingModal()}
        {showAboutModal && renderAboutModal()}
        {showSpotlightModal && renderSpotlightModal()}
        {showRateModal && renderRateModal()}
        {showSettingsModal && renderSettingsModal()}

        {children}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  mobileWrapper: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0F172A', // slate-900 base background under the sliding pane
  },
  mobileDrawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: '#1E293B', // slate-800 dark slate matching Screen 1 drawer
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    overflowY: 'auto',
  },
  drawerProfileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '20px 8px 8px 8px',
  },
  drawerAvatarOuter: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(255,255,255,0.15)',
    marginBottom: '12px',
  },
  drawerAvatarInner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#CBD5E1', // grey silhouette placeholder
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
  },
  drawerProfileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  drawerProfileName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F8FAFC',
    margin: 0,
  },
  drawerProfileMeta: {
    fontSize: '12px',
    color: '#94A3B8',
    marginTop: '2px',
    fontWeight: 500,
  },
  drawerBrandText: {
    fontSize: '14px',
    fontWeight: 900,
    color: '#3B82F6', // Blue highlight
    marginTop: '6px',
    letterSpacing: '0.05em',
  },
  drawerDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: '16px 8px',
  },
  drawerNavScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  drawerLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '11px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontFamily: 'var(--font-family)',
    transition: 'all 0.2s ease',
  },
  drawerLinkIconCol: {
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerFooterCol: {
    marginTop: 'auto',
    padding: '16px 8px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  drawerLinkFooterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: '#CBD5E1',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-family)',
  },
  footerBrandingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: 0.25,
    paddingLeft: '4px',
  },
  brandingCrestSmall: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 900,
  },
  brandingCrestText: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.05em',
  },
  mobileMainView: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.35s, box-shadow 0.35s',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  desktopContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
  },
  sidebar: {
    width: '260px',
    height: '100%',
    borderRight: '1px solid var(--sidebar-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 16px',
    borderRadius: '0px',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 100,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    padding: '0 8px',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    fontFamily: 'var(--font-family)',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  activeIndicator: {
    position: 'absolute',
    left: '0',
    top: '30%',
    bottom: '30%',
    width: '3px',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '0 4px 4px 0',
  },
  sidebarFooter: {
    marginTop: 'auto',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--card-border)',
    backgroundColor: 'var(--bg-primary)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--light-gray)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--dark-charcoal)',
    boxShadow: 'var(--shadow-sm)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--dark-charcoal)',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
  },
};

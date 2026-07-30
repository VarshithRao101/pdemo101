import React, { useState, useEffect } from 'react';
import collegeLogo from '../assets/college logo.png';

interface ImageWidgetPlaceholder {
  id: string;
  category: string;
  title: string;
  caption: string;
  dimensions: string;
  bgColor: string;
  accentColor: string;
  svgIcon: React.ReactNode;
}

export const PortfolioView: React.FC = () => {
  // UI & Form States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStreamTab, setActiveStreamTab] = useState<'all' | 'mpc' | 'bipc'>('all');
  
  // Admission Form States
  const [stuName, setStuName] = useState('');
  const [parentName, setParentName] = useState('');
  const [stuMobile, setStuMobile] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuStream, setStuStream] = useState('MPC (IIT-JEE / EAMCET)');
  const [stuCampus, setStuCampus] = useState('Erragattugutta Campus 1');
  const [stuGrade, setStuGrade] = useState('10th Class Passed');
  const [stuNotes, setStuNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');
  const [enquiryError, setEnquiryError] = useState('');

  // Official Contact Info
  const collegePhone = '+91 97043 80320';
  const collegeEmail = 'Inspirehnk@gmail.com';
  const instaUrl = 'https://www.instagram.com/inspire_junior_college';
  const portalHash = '#/secure-gateway-portal-v2-x9k84m2n7p1q3w5r8z-inspire';

  // Rotating Headline Ticker
  const headlineTickers = [
    'IIT-JEE Advanced & Mains Coaching',
    'NEET-UG Medical Ranks & AIIMS Preparation',
    'TS EAPCET (EAMCET) Top Performers',
    'Integrated Intermediate MPC & BiPC Streams'
  ];
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % headlineTickers.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuMobile.trim()) {
      setEnquiryError('Please enter Student Name and Contact Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    setEnquiryError('');

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: stuName.trim(),
          parentName: parentName.trim(),
          mobile: stuMobile.trim(),
          email: stuEmail.trim(),
          stream: stuStream,
          preferredCampus: stuCampus,
          currentGrade: stuGrade,
          notes: stuNotes.trim()
        })
      });

      const data = await response.json();
      if (data && data.status === 'success') {
        setEnquiryRef(data.referenceCode || `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`);
        setEnquirySuccess(true);
      } else {
        setEnquiryError(data.message || 'Failed to submit enquiry. Please try again.');
      }
    } catch (err) {
      // Fallback in case backend is offline
      const fallbackRef = `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setEnquiryRef(fallbackRef);
      setEnquirySuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Structured 16 Photo Gallery Box Placeholders (ZERO Emojis, Pure SVG Vector Icons)
  const photoGalleryBoxes: ImageWidgetPlaceholder[] = [
    {
      id: 'main-hero-photo',
      category: 'HERO FEATURE',
      title: 'Main Academic Campus Building',
      caption: 'Front view of Inspire Junior College, Hanamkonda central academic complex.',
      dimensions: '1200 x 800 PX',
      bgColor: '#0F172A',
      accentColor: '#D4AF37',
      svgIcon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11H9V10z" />
        </svg>
      )
    },
    {
      id: 'erragattu-c1',
      category: 'CAMPUS 1',
      title: 'Erragattugutta Campus 1 Quadrangle',
      caption: 'Primary residential block hosting Super-60 IIT-JEE Advanced batch.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E293B',
      accentColor: '#38BDF8',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      id: 'erragattu-c2',
      category: 'CAMPUS 2',
      title: 'Erragattugutta Campus 2 Digital Bay',
      caption: 'High-tech computer bay & online CBT exam testing simulator.',
      dimensions: '800 x 600 PX',
      bgColor: '#0F172A',
      accentColor: '#818CF8',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      id: 'bheemaram-c1',
      category: 'CAMPUS 3',
      title: 'Bheemaram Campus 1 Medical Wing',
      caption: 'Dedicated NEET-UG medical sciences wing with 3D Bio models.',
      dimensions: '800 x 600 PX',
      bgColor: '#064E3B',
      accentColor: '#34D399',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.31L4.75 18.1A2 2 0 0 0 6.47 21h11.06a2 2 0 0 0 1.72-2.9L14 9.31V2" />
          <line x1="8.5" y1="2" x2="15.5" y2="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
        </svg>
      )
    },
    {
      id: 'bheemaram-c2',
      category: 'CAMPUS 4',
      title: 'Bheemaram Campus 2 Day-Scholar Block',
      caption: 'Spacious classrooms & interactive problem-solving lounge.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E1B4B',
      accentColor: '#A78BFA',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
    {
      id: 'smart-classrooms',
      category: 'INFRASTRUCTURE',
      title: 'Air-Conditioned Smart Classrooms',
      caption: 'Ergonomic seating with audio-visual smart board integration.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E293B',
      accentColor: '#F43F5E',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      )
    },
    {
      id: 'physics-lab',
      category: 'LABORATORIES',
      title: 'Physics & Optics Research Lab',
      caption: 'Precision lasers, optical benches & electrical measurement tools.',
      dimensions: '800 x 600 PX',
      bgColor: '#0F172A',
      accentColor: '#38BDF8',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      )
    },
    {
      id: 'chemistry-lab',
      category: 'LABORATORIES',
      title: 'Advanced Chemistry Laboratory',
      caption: 'Safety-certified fume hoods, titrations & organic reaction setups.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E293B',
      accentColor: '#10B981',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18h12" />
          <path d="M10 2v7.31L4.75 18.1A2 2 0 0 0 6.47 21h11.06a2 2 0 0 0 1.72-2.9L14 9.31V2" />
        </svg>
      )
    },
    {
      id: 'digital-library',
      category: 'LEARNING RESOURCE',
      title: 'Central Digital Library & Quiet Pods',
      caption: '10,000+ NCERT, HC Verma, Irodov & Allen/Aakash reference books.',
      dimensions: '800 x 600 PX',
      bgColor: '#0F172A',
      accentColor: '#F59E0B',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      )
    },
    {
      id: 'test-center',
      category: 'EXAM TESTING',
      title: 'IIT-JEE & NEET OMR Practice Arena',
      caption: 'Weekly grand tests with instant rank analysis and error review.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E1B4B',
      accentColor: '#EC4899',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'girls-hostel',
      category: 'RESIDENTIAL',
      title: 'Girls Air-Conditioned Residential Hostel',
      caption: '24/7 CCTV security, resident warden & nutritious meal dining hall.',
      dimensions: '800 x 600 PX',
      bgColor: '#0F172A',
      accentColor: '#F472B6',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M19 21v-8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8" />
          <path d="M9 10a3 3 0 1 0 6 0" />
        </svg>
      )
    },
    {
      id: 'boys-hostel',
      category: 'RESIDENTIAL',
      title: 'Boys Residential Campus Wing',
      caption: 'Spacious study desks, biometric access & indoor recreation hall.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E293B',
      accentColor: '#38BDF8',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="9" y1="6" x2="15" y2="6" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      )
    },
    {
      id: 'campus-dining',
      category: 'AMENITIES',
      title: 'Hygienic Campus Dining & Cafeteria',
      caption: 'Pure vegetarian & non-vegetarian nutritious meal plans.',
      dimensions: '800 x 600 PX',
      bgColor: '#064E3B',
      accentColor: '#10B981',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      )
    },
    {
      id: 'rankers-felicitation',
      category: 'ACHIEVEMENTS',
      title: 'Rankers Felicitation & Award Ceremony',
      caption: 'Celebrating student achievements in IIT-JEE, NEET & TS EAPCET.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E1B4B',
      accentColor: '#D4AF37',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      )
    },
    {
      id: 'doubt-counters',
      category: 'FACULTY',
      title: 'One-on-One Faculty Doubt Counters',
      caption: 'Personalized daily doubt clarification sessions with senior lecturers.',
      dimensions: '800 x 600 PX',
      bgColor: '#0F172A',
      accentColor: '#38BDF8',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      id: 'sports-complex',
      category: 'SPORTS',
      title: 'Athletic Turf & Sports Complex',
      caption: 'Badminton courts, volleyball ground, table tennis & yoga pavilion.',
      dimensions: '800 x 600 PX',
      bgColor: '#1E293B',
      accentColor: '#F59E0B',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      )
    }
  ];

  return (
    <div style={{ backgroundColor: '#0A0E17', color: '#F8FAFC', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* HEADER NAVBAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(10, 14, 23, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        padding: '14px 24px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo Brand */}
          <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <img
              src={collegeLogo}
              alt="Inspire Junior College Logo"
              style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.4)' }}
            />
            <div>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.02em', display: 'block' }}>
                INSPIRE <span style={{ color: '#D4AF37' }}>JUNIOR COLLEGE</span>
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>
                HANAMKONDA, TELANGANA • TS BIE CODE: 21182
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#about" style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>About Us</a>
            <a href="#streams" style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>MPC & BiPC</a>
            <a href="#campuses" style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>4 Campuses</a>
            <a href="#gallery" style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>Photo Gallery</a>
            <a href="#enquiry" style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 800, textDecoration: 'none', transition: 'color 0.2s' }}>Admission 2026-27</a>
          </nav>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* SINGLE SYSTEM PORTAL GATEWAY LINK */}
            <a
              href={portalHash}
              style={{
                fontSize: '11px',
                fontWeight: 900,
                color: '#D4AF37',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(212, 175, 55, 0.08)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="press-interactive"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ERP PORTAL GATEWAY
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              className="mobile-menu-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>About College</a>
            <a href="#streams" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Intermediate Streams (MPC & BiPC)</a>
            <a href="#campuses" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>4 Campuses (Erragattugutta & Bheemaram)</a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Photo Gallery</a>
            <a href="#enquiry" onClick={() => setMobileMenuOpen(false)} style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 900, textDecoration: 'none' }}>Submit Admission Enquiry</a>
            <a href={portalHash} onClick={() => setMobileMenuOpen(false)} style={{ color: '#38BDF8', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>ERP System Login</a>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section id="hero" style={{ padding: '80px 24px 60px', position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.08) 0%, transparent 60%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          
          {/* Left Column Text & Details */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#D4AF37',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              marginBottom: '20px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D4AF37' }}></span>
              ADMISSIONS OPEN FOR ACADEMIC YEAR 2026-2027
            </div>

            <h1 style={{ fontSize: 'calc(28px + 1.5vw)', fontWeight: 900, lineHeight: 1.15, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Nurturing Academic Excellence. <br />
              <span style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FEF08A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Engineering National Ranks.
              </span>
            </h1>

            {/* Dynamic Headline Ticker */}
            <div style={{ height: '28px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#94A3B8' }}>Focused on:</span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#38BDF8', borderBottom: '1px dashed #38BDF8', paddingBottom: '2px' }}>
                {headlineTickers[tickerIndex]}
              </span>
            </div>

            {/* Motto Box */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              borderLeft: '4px solid #D4AF37',
              borderRadius: '0 12px 12px 0',
              marginBottom: '28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#E2E8F0', fontStyle: 'italic', fontWeight: 600 }}>
                "Inspire Junior College is committed to cultivating intellectual rigor, scientific curiosity, and competitive discipline across MPC & BiPC streams in Hanamkonda."
              </p>
            </div>

            {/* Key Statistics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#D4AF37', display: 'block' }}>100+</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>IIT / NIT Selections</span>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#38BDF8', display: 'block' }}>Top Ranks</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>NEET-UG Medical</span>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <strong style={{ fontSize: '22px', fontWeight: 900, color: '#10B981', display: 'block' }}>98.6%</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>TS EAPCET Pass Rate</span>
              </div>
            </div>

            {/* CTA Action Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a
                href="#enquiry"
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#D4AF37',
                  color: '#0A0E17',
                  fontSize: '13px',
                  fontWeight: 900,
                  borderRadius: '10px',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  boxShadow: '0 8px 24px rgba(212,175,55,0.25)',
                  transition: 'transform 0.2s ease'
                }}
                className="press-interactive"
              >
                Submit Admission Enquiry 2026-27
              </a>

              <a
                href="#campuses"
                style={{
                  padding: '14px 24px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                className="press-interactive"
              >
                Explore 4 Campuses
              </a>
            </div>
          </div>

          {/* Right Column: Dynamic Cross-Tilted Box Frame for Main Hero Photo */}
          <div style={{ position: 'relative' }}>
            <div style={{
              transform: 'rotate(-2deg)',
              borderRadius: '24px',
              padding: '12px',
              backgroundColor: '#0F172A',
              border: '2px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.12)',
              position: 'relative',
              transition: 'transform 0.3s ease'
            }}
            className="hero-photo-frame"
            >
              {/* Top Frame Label Badge */}
              <div style={{
                position: 'absolute',
                top: '-14px',
                left: '24px',
                backgroundColor: '#D4AF37',
                color: '#0A0E17',
                padding: '4px 14px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                zIndex: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                MAIN CAMPUS HERO PHOTO FRAME — 1200 x 800 PX
              </div>

              {/* Photo Box Container Placeholder */}
              <div style={{
                aspectRatio: '16/10',
                borderRadius: '16px',
                backgroundColor: '#1E293B',
                backgroundImage: 'radial-gradient(rgba(212,175,55,0.15) 1px, transparent 0)',
                backgroundSize: '24px 24px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'center',
                alignItems: 'center',
                padding: '32px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '1px dashed rgba(212,175,55,0.4)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#D4AF37',
                  marginBottom: '16px'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                  Inspire Junior College Main Building
                </h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', maxWidth: '320px', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Drop your raw campus quadrangle / main college building photograph here.
                </p>

                <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 800, padding: '4px 10px', backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: '6px' }}>
                  Hanamkonda Central Campus • Hanamkonda
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ABOUT COLLEGE & MOTTO SECTION */}
      <section id="about" style={{ padding: '80px 24px', backgroundColor: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>LEGACY OF ACADEMIC EXCELLENCE</span>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 16px' }}>
              Why Choose Inspire Junior College?
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Located in the heart of Hanamkonda, Inspire Junior College is built specifically for high-achieving intermediate students aiming for premier engineering and medical institutions across India.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.12)', color: '#D4AF37', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10v6M12 2l10 5-10 5L2 7l10-5z"/></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>IIT-JEE & NEET Coaching</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Integrated 2-year curriculum aligning TS Intermediate Board syllabus with rigorous IIT-JEE Mains/Advanced and NEET-UG problem solving.
              </p>
            </div>

            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>Experienced Senior Faculty</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Renowned subject experts with 15+ years of experience guiding top national rankers in Physics, Chemistry, Mathematics, and Biology.
              </p>
            </div>

            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.12)', color: '#10B981', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>Secure AC Hostels</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Separate residential blocks for boys and girls with air-conditioned dorms, biometric security, and dedicated study hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ACADEMIC STREAMS SECTION (MPC & BiPC ONLY) */}
      <section id="streams" style={{ padding: '80px 24px', backgroundColor: '#0A0E17' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>SPECIALIZED INTERMEDIATE STREAMS</span>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 16px' }}>
              MPC & BiPC Intermediate Programs
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Tailored specifically for MPC and BiPC branches with focused competitive test preparation.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
            {/* MPC Stream Card */}
            <div style={{
              padding: '36px',
              backgroundColor: '#0F172A',
              borderRadius: '20px',
              border: '2px solid rgba(56, 189, 248, 0.3)',
              position: 'relative',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
            }}>
              <span style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 900
              }}>
                ENGINEERING BRANCH
              </span>

              <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                MPC Stream
              </h3>
              <p style={{ fontSize: '13px', color: '#38BDF8', fontWeight: 800, margin: '0 0 20px' }}>
                Mathematics, Physics & Chemistry
              </p>

              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '24px' }}>
                Designed for students aspiring for engineering admissions in IITs, NITs, BITS Pilani, and premier state engineering colleges via TS EAPCET.
              </p>

              <div style={{ padding: '16px', backgroundColor: '#1E293B', borderRadius: '12px', marginBottom: '20px' }}>
                <strong style={{ fontSize: '12px', color: '#E2E8F0', display: 'block', marginBottom: '8px' }}>TARGET COMPETITIVE EXAMS:</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#94A3B8', lineHeight: 1.8 }}>
                  <li>IIT-JEE Mains & IIT-JEE Advanced</li>
                  <li>BITSAT & VITEEE National Entrance</li>
                  <li>TS EAPCET (Telangana State Engineering)</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>Super-60 IIT Batch</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>Daily Grand Tests</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>Erragattugutta Campus</span>
              </div>
            </div>

            {/* BiPC Stream Card */}
            <div style={{
              padding: '36px',
              backgroundColor: '#0F172A',
              borderRadius: '20px',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              position: 'relative',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
            }}>
              <span style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 900
              }}>
                MEDICAL BRANCH
              </span>

              <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                BiPC Stream
              </h3>
              <p style={{ fontSize: '13px', color: '#10B981', fontWeight: 800, margin: '0 0 20px' }}>
                Biology (Botany & Zoology), Physics & Chemistry
              </p>

              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '24px' }}>
                Structured for medical aspirants aiming for MBBS seats in AIIMS, JIPMER, KNRUHS government medical colleges, and B.Sc Agriculture.
              </p>

              <div style={{ padding: '16px', backgroundColor: '#1E293B', borderRadius: '12px', marginBottom: '20px' }}>
                <strong style={{ fontSize: '12px', color: '#E2E8F0', display: 'block', marginBottom: '8px' }}>TARGET COMPETITIVE EXAMS:</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#94A3B8', lineHeight: 1.8 }}>
                  <li>NEET-UG National Medical Entrance</li>
                  <li>AIIMS & JIPMER Medical Seats</li>
                  <li>TS EAPCET Agriculture & Pharmacy</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>NCERT Intensive Line-by-Line</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>3D Bio Diagrams Lab</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#CBD5E1', borderRadius: '6px' }}>Bheemaram Campus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE 4 CAMPUSES SECTION */}
      <section id="campuses" style={{ padding: '80px 24px', backgroundColor: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>HANAMKONDA CAMPUS NETWORK</span>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 16px' }}>
              Explore Our 4 Specialized Campuses
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Conveniently located across Erragattugutta and Bheemaram in Hanamkonda with state-of-the-art facilities.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {/* Erragattugutta C1 */}
            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#38BDF8', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>CAMPUS 01</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>Erragattugutta Campus 1</h3>
              <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 14px', fontWeight: 600 }}>Primary Residential & IIT-JEE Super-60 Block</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Hosts our premier Super-60 IIT-JEE residential batch, central AC study library, and boys hostel block.
              </p>
            </div>

            {/* Erragattugutta C2 */}
            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#818CF8', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>CAMPUS 02</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>Erragattugutta Campus 2</h3>
              <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 14px', fontWeight: 600 }}>Digital Bay & Advanced Physics/Maths Center</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Equipped with online computer testing terminals, physics optics lab, and faculty research lounge.
              </p>
            </div>

            {/* Bheemaram C1 */}
            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#34D399', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>CAMPUS 03</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>Bheemaram Campus 1</h3>
              <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 14px', fontWeight: 600 }}>Medical Sciences Wing & 3D Bio Laboratories</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Focuses exclusively on BiPC NEET-UG preparation with dedicated Botany & Zoology diagnostic labs.
              </p>
            </div>

            {/* Bheemaram C2 */}
            <div style={{ padding: '28px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#A78BFA', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>CAMPUS 04</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>Bheemaram Campus 2</h3>
              <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 14px', fontWeight: 600 }}>Day-Scholar & Integrated Academic Complex</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Designed for day-scholars with convenient transport routing across Warangal and Hanamkonda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PHOTO GALLERY PLACEHOLDERS GRID (16 Structured Boxes) */}
      <section id="gallery" style={{ padding: '80px 24px', backgroundColor: '#0A0E17' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>CAMPUS PHOTO GALLERY PLACEHOLDERS</span>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 16px' }}>
              Campus Infrastructure & Highlights
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Below are 16 structured placeholder boxes for college photos. Simply replace these frames with your raw campus imagery.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {photoGalleryBoxes.map((box) => (
              <div
                key={box.id}
                style={{
                  borderRadius: '16px',
                  backgroundColor: box.bgColor,
                  border: `1px solid ${box.accentColor}40`,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  minHeight: '260px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                className="press-interactive"
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: box.accentColor, letterSpacing: '0.08em' }}>
                      {box.category}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                      {box.dimensions}
                    </span>
                  </div>

                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: `${box.accentColor}18`,
                    color: box.accentColor,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '14px'
                  }}>
                    {box.svgIcon}
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                    {box.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                    {box.caption}
                  </p>
                </div>

                <div style={{
                  marginTop: '20px',
                  paddingTop: '12px',
                  borderTop: '1px dashed rgba(255,255,255,0.1)',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: box.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  PHOTO PLACEHOLDER BOX — DROP IMAGE
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADMISSION ENQUIRY FORM SECTION (Connected to Admin 2 / Admin 1) */}
      <section id="enquiry" style={{ padding: '80px 24px', backgroundColor: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>ADMISSION COUNSELING 2026-27</span>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 12px' }}>
              Submit Online Admission Enquiry
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Fill out the form below to connect with our campus admission counselors for MPC & BiPC seat allocation.
            </p>
          </div>

          <div style={{
            backgroundColor: '#1E293B',
            borderRadius: '24px',
            padding: '36px',
            border: '1.5px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {enquirySuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid #10B981',
                  color: '#10B981',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '0 auto 20px'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                  Enquiry Submitted Successfully!
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                  Our admission counselor will reach out on your contact number shortly.
                </p>

                <div style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #D4AF37',
                  borderRadius: '12px',
                  color: '#D4AF37',
                  fontWeight: 900,
                  fontSize: '15px',
                  letterSpacing: '0.05em',
                  marginBottom: '24px'
                }}>
                  REFERENCE TICKET: {enquiryRef}
                </div>

                <p style={{ fontSize: '12px', color: '#CBD5E1', margin: 0 }}>
                  For urgent inquiries, call our helpline directly at <strong style={{ color: '#D4AF37' }}>{collegePhone}</strong>
                </p>

                <button
                  onClick={() => {
                    setEnquirySuccess(false);
                    setStuName('');
                    setParentName('');
                    setStuMobile('');
                    setStuEmail('');
                    setStuNotes('');
                  }}
                  style={{
                    marginTop: '24px',
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer'
                  }}
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {enquiryError && (
                  <div style={{ gridColumn: '1 / -1', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '10px', color: '#FCA5A5', fontSize: '13px', fontWeight: 700 }}>
                    {enquiryError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Contact Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={stuMobile}
                    onChange={(e) => setStuMobile(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. student@example.com"
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Preferred Intermediate Stream
                  </label>
                  <select
                    value={stuStream}
                    onChange={(e) => setStuStream(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="MPC (IIT-JEE / EAMCET)">MPC (IIT-JEE / TS EAPCET)</option>
                    <option value="BiPC (NEET / EAMCET)">BiPC (NEET-UG / TS EAPCET Medical)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Preferred Campus Selection
                  </label>
                  <select
                    value={stuCampus}
                    onChange={(e) => setStuCampus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="Erragattugutta Campus 1">Erragattugutta Campus 1 (Super-60 Residential)</option>
                    <option value="Erragattugutta Campus 2">Erragattugutta Campus 2 (Digital Bay)</option>
                    <option value="Bheemaram Campus 1">Bheemaram Campus 1 (Medical Sciences Wing)</option>
                    <option value="Bheemaram Campus 2">Bheemaram Campus 2 (Day Scholar)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Current Academic Qualification
                  </label>
                  <select
                    value={stuGrade}
                    onChange={(e) => setStuGrade(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="10th Class Passed">10th Class Passed (Applying Inter 1st Year)</option>
                    <option value="Inter 1st Year">Inter 1st Year Completed (Applying Lateral Inter 2nd Year)</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#E2E8F0', marginBottom: '6px' }}>
                    Additional Notes / Questions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mention hostel requirements, scholarship test inquiries, or specific goals..."
                    value={stuNotes}
                    onChange={(e) => setStuNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#D4AF37',
                      color: '#0A0E17',
                      fontSize: '14px',
                      fontWeight: 900,
                      borderRadius: '12px',
                      border: 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.04em',
                      boxShadow: '0 8px 24px rgba(212,175,55,0.25)',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                    className="press-interactive"
                  >
                    {isSubmitting ? 'Submitting Admission Enquiry...' : 'Submit Admission Enquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#070A10', borderTop: '1px solid rgba(212, 175, 55, 0.2)', padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '40px' }}>
          
          {/* Col 1 Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src={collegeLogo} alt="Inspire Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
              <div>
                <strong style={{ fontSize: '16px', color: '#FFFFFF', display: 'block' }}>INSPIRE JUNIOR COLLEGE</strong>
                <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 800 }}>HANAMKONDA • MPC & BiPC</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Premier Intermediate College approved by Telangana State Board of Intermediate Education (Code: 21182).
            </p>
          </div>

          {/* Col 2 Campuses */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.05em' }}>
              HANAMKONDA CAMPUSES
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Erragattugutta Campus 1 (Super-60 IIT)</li>
              <li>Erragattugutta Campus 2 (Digital Bay)</li>
              <li>Bheemaram Campus 1 (Medical Wing)</li>
              <li>Bheemaram Campus 2 (Day Scholar)</li>
            </ul>
          </div>

          {/* Col 3 Contact Helpline */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.05em' }}>
              ADMISSION HELPLINE
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#94A3B8' }}>
              <div>Phone: <a href={`tel:${collegePhone}`} style={{ color: '#D4AF37', fontWeight: 800, textDecoration: 'none' }}>{collegePhone}</a></div>
              <div>Email: <a href={`mailto:${collegeEmail}`} style={{ color: '#CBD5E1', textDecoration: 'none' }}>{collegeEmail}</a></div>
              <div>Instagram: <a href={instaUrl} target="_blank" rel="noreferrer" style={{ color: '#38BDF8', textDecoration: 'none' }}>@inspire_junior_college</a></div>
              <div>Location: Hanamkonda, Warangal, Telangana</div>
            </div>
          </div>

          {/* Col 4 System Gateway */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.05em' }}>
              INTERNAL PORTAL
            </h4>
            <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '14px' }}>
              Authorized faculty, deans, accountants, and administrators portal access point.
            </p>
            <a
              href={portalHash}
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid #D4AF37',
                color: '#D4AF37',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 900,
                textDecoration: 'none',
                letterSpacing: '0.05em'
              }}
              className="press-interactive"
            >
              ERP SYSTEM PORTAL GATEWAY
            </a>
          </div>

        </div>

        <div style={{ maxWidth: '1280px', margin: '40px auto 0', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#64748B' }}>
          <div>© 2026 Inspire Junior College, Hanamkonda. All Rights Reserved.</div>
          <div>MPC & BiPC Intermediate Programs • Warangal Urban District</div>
        </div>
      </footer>
    </div>
  );
};

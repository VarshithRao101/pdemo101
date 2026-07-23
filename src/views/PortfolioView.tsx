import React, { useState, useEffect } from 'react';
import collegeLogo from '../assets/college logo.png';
import { Mesmerizing3DCanvas } from '../components/common/Mesmerizing3DCanvas';
import { HeroVideoBackground } from '../components/common/HeroVideoBackground';

interface ProgramCard {
  id: string;
  stream: string;
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
  targetExams: string[];
  features: string[];
}

interface ImageWidgetPlaceholder {
  id: string;
  category: string;
  title: string;
  caption: string;
  bgColor: string;
  accentColor: string;
  svgIcon: React.ReactNode;
}

export const PortfolioView: React.FC = () => {
  // Navigation & UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mpc' | 'bipc' | 'mec' | 'civils'>('all');
  const [wordIndex, setWordIndex] = useState(0);

  // Form states (Enquiry)
  const [stuName, setStuName] = useState('');
  const [stuMobile, setStuMobile] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuStream, setStuStream] = useState('mpc');
  const [stuCampus, setStuCampus] = useState('hunter_road');
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');

  // Official College Info
  const collegePhone = '+91 97043 80320';
  const collegeEmail = 'Inspirehnk@gmail.com';
  const instaUrl = 'https://www.instagram.com/inspire_junior_college';

  // Dynamic Word Flipper for Hero Headline
  const dynamicWords = [
    'IIT-JEE Advanced Ranks',
    'NEET-UG Medical Domination',
    'CA Foundation & IPMAT',
    'UPSC Civil Services Foundation'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % dynamicWords.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Form submit handler
  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refCode = `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    setEnquiryRef(refCode);
    setEnquirySuccess(true);
  };

  // Image Placeholders for Hero Bottom Photo Cards (Vector SVG icons, ZERO emojis)
  const photoPlaceholders: ImageWidgetPlaceholder[] = [
    {
      id: 'campus-life',
      category: 'CAMPUS LIFE',
      title: 'Hanamkonda Central Campus',
      caption: 'Spacious, vibrant academic atmosphere designed for focused learning and growth.',
      bgColor: '#F1F5F9',
      accentColor: '#0A2540',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11H9V10z" />
        </svg>
      )
    },
    {
      id: 'science-labs',
      category: 'SCIENCE LABS',
      title: 'Modern Diagnostic & Bio Labs',
      caption: 'Fully equipped Botany, Zoology & Physics laboratories with digital 3D models.',
      bgColor: '#EFF6FF',
      accentColor: '#0284C7',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.31L4.75 18.1A2 2 0 0 0 6.47 21h11.06a2 2 0 0 0 1.72-2.9L14 9.31V2" />
          <line x1="85" y1="2" x2="15.5" y2="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
        </svg>
      )
    },
    {
      id: 'student-achievers',
      category: 'STUDENT ACHIEVERS',
      title: 'National Rankers 2026',
      caption: 'Celebrating top selections in NEET-UG (AIR 1) and IIT-JEE Advanced (AIR 4).',
      bgColor: '#FEF3C7',
      accentColor: '#D97706',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
      )
    },
    {
      id: 'faculty-mentors',
      category: 'FACULTY MENTORS',
      title: 'Experienced IITian Faculty',
      caption: 'Renowned educators explaining complex fundamentals with absolute clarity.',
      bgColor: '#ECFDF5',
      accentColor: '#059669',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      )
    },
    {
      id: 'smart-classrooms',
      category: 'SMART CLASSROOMS',
      title: 'Interactive Digital Bays',
      caption: 'Air-conditioned smart classrooms integrated with eTutor test analytics.',
      bgColor: '#F5F3FF',
      accentColor: '#7C3AED',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      id: 'library-study',
      category: 'LIBRARY & STUDY',
      title: 'Silent Study Pods & Library',
      caption: 'Comprehensive reference book banks and dedicated quiet study environment.',
      bgColor: '#FFF1F2',
      accentColor: '#E11D48',
      svgIcon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    }
  ];

  // Academic Programs Data
  const programsList: ProgramCard[] = [
    {
      id: 'mpc',
      stream: 'MPC Stream',
      title: 'Mathematics, Physics & Chemistry',
      badge: 'ENGINEERING & TECHNOLOGY',
      badgeBg: '#EFF6FF',
      badgeColor: '#1E40AF',
      description: 'Comprehensive 2-year integrated intermediate curriculum preparing students for IIT-JEE Main, JEE Advanced, BITSAT, and TS EAMCET alongside state board toppers.',
      targetExams: ['IIT-JEE Main', 'IIT-JEE Advanced', 'BITSAT', 'TS EAPCET / EAMCET'],
      features: [
        'Super-60 High-Scorer Batch at Bheemaram & Hunter Road',
        'Daily Micro-Assessment Tests (MAT) & eTutor Online Engine',
        'Calculus & Physics problem-solving workshops by senior IITians'
      ]
    },
    {
      id: 'bipc',
      stream: 'BiPC Stream',
      title: 'Biology, Physics & Chemistry',
      badge: 'MEDICAL & HEALTH SCIENCES',
      badgeBg: '#ECFDF5',
      badgeColor: '#065F46',
      description: 'Elite 2-year medical preparation program engineered for NEET-UG domination with 3D digital botany & zoology diagnostic laboratory sessions.',
      targetExams: ['NEET (UG)', 'AIIMS / JIPMER Prep', 'ICAR Agriculture', 'CUET Biology'],
      features: [
        '3D Biological Specimen Models & Digital Microscopic Labs',
        'Daily 180-Question Mock NEET Speed Drills',
        'Line-by-Line NCERT revision modules guided by senior doctor faculty'
      ]
    },
    {
      id: 'mec',
      stream: 'Commerce Stream',
      title: 'Mathematics, Economics & Commerce',
      badge: 'COMMERCE, CA & MANAGEMENT',
      badgeBg: '#FFFBEB',
      badgeColor: '#92400E',
      description: 'Career-focused curriculum for Chartered Accountancy (ICAI CA Foundation), IPMAT (IIM Integrated MBA), and corporate finance leadership.',
      targetExams: ['ICAI CA Foundation', 'IPMAT (IIM Indore/Rohtak)', 'CUET Commerce', 'CLAT Law'],
      features: [
        'Simulated Corporate Accounting Cockpits & Tally/Excel Training',
        'Direct sessions by practicing Chartered Accountants',
        '100% Pass Guarantee coaching modules for CA Foundation'
      ]
    },
    {
      id: 'civils',
      stream: 'Civils Foundation',
      title: 'UPSC & Civil Services Foundation',
      badge: 'GOVERNMENT & LEADERSHIP TRACK',
      badgeBg: '#F3E8FF',
      badgeColor: '#6B21A8',
      description: 'Early-start foundation program for UPSC Civil Services, state public service commissions, general studies, and analytical reasoning.',
      targetExams: ['UPSC Civil Services Foundation', 'State PSC', 'NTSE', 'General Studies'],
      features: [
        'Logical reasoning & current affairs daily seminar modules',
        'Analytical essay writing & general knowledge workshops',
        'Strong academic foundation for future administrative IAS/IPS aspirants'
      ]
    }
  ];

  const filteredPrograms = programsList.filter((p) => activeTab === 'all' || p.id === activeTab);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif", backgroundColor: '#FFFFFF', color: '#0F172A', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ─── 1. LIVE CONTINUOUS MOVING TEXT MARQUEE TICKER ─── */}
      <div style={{ backgroundColor: '#0A2540', color: '#FFFFFF', padding: '10px 0', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 20 }}>
        <div className="marquee-track">
          <div style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', alignItems: 'center' }}>
            <span style={{ backgroundColor: '#D97706', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ADMISSIONS OPEN 2026-27
            </span>
            <span>Integrated IIT-JEE & NEET Coaching with CBSE / Board Syllabus</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>Hanamkonda Hunter Road & Bheemaram Campuses</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>100% Scholarship Entrance Test Registration Open</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>Helpline: {collegePhone}</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
          </div>

          <div style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', alignItems: 'center' }}>
            <span style={{ backgroundColor: '#D97706', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ADMISSIONS OPEN 2026-27
            </span>
            <span>Integrated IIT-JEE & NEET Coaching with CBSE / Board Syllabus</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>Hanamkonda Hunter Road & Bheemaram Campuses</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>100% Scholarship Entrance Test Registration Open</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
            <span>Helpline: {collegePhone}</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>•</span>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN NAVIGATION HEADER ─── */}
      <header style={{ backgroundColor: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo Branding */}
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src={collegeLogo} alt="Inspire Junior College Logo" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 850, fontSize: '1.35rem', color: '#0A2540', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                INSPIRE <span style={{ color: '#D97706', fontSize: '0.85rem', fontWeight: 700 }}>JUNIOR COLLEGE</span>
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
                Hanamkonda • Bheemaram • Hunter Road
              </div>
            </div>
          </a>

          {/* Navigation Links */}
          <nav style={{ display: 'none', alignItems: 'center', gap: '2.2rem' }} className="desktop-nav">
            <a href="#programs" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}>Programs & Streams</a>
            <a href="#why-us" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}>Why Choose Us</a>
            <a href="#campuses" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}>Campus Locations</a>
            <a href={instaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#E1306C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <span>Instagram</span>
            </a>
            <a href="#enquiry" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}>Admissions</a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a
              href="#enquiry"
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: '#D97706',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none'
              }}
              className="press-interactive"
            >
              Enquire Now
            </a>

            {/* Universal Administrative Portal Login Link */}
            <a
              href="#/v1-portal-gate-x89f2a7b"
              style={{
                backgroundColor: '#0A2540',
                color: '#FFFFFF',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(10, 37, 64, 0.25)'
              }}
              className="press-interactive"
            >
              <span>Portal Login</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </a>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#0F172A', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href="#programs" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Academic Programs (MPC / BiPC / MEC / Civils)</a>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Why Choose Inspire</a>
            <a href="#campuses" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Campus Locations (Hunter Road & Bheemaram)</a>
            <a href={instaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', textDecoration: 'none', fontWeight: 700, padding: '8px 0' }}>Official @inspire_junior_college Instagram</a>
            <a href="#enquiry" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Admissions Enquiry 2026-27</a>
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', gap: '10px' }}>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ backgroundColor: '#0A2540', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', width: '100%' }}>Staff & Admin Portal Login</a>
              <a href="#/sec-auth-sys-9i0j7k8l" style={{ backgroundColor: '#F1F5F9', color: '#0F172A', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', width: '100%', textAlign: 'center' }}>Security Auth</a>
            </div>
          </div>
        )}
      </header>

      {/* ─── 3. HERO SECTION WITH BACKGROUND VIDEO OVERLAY & 3D ELEMENTS ─── */}
      <section style={{ position: 'relative', backgroundColor: '#071626', color: '#FFFFFF', minHeight: '680px', overflow: 'hidden', padding: '5.5rem 1.5rem 6rem', display: 'flex', alignItems: 'center' }}>
        
        {/* PREMIUM HERO VIDEO BACKGROUND */}
        <HeroVideoBackground overlayOpacity={0.7} />

        {/* MESMERIZING INTERACTIVE 3D PARTICLES & WIREFRAME GEOMETRY CANVAS */}
        <Mesmerizing3DCanvas density={75} colorTheme="neon" interactive={true} />

        {/* Ambient 3D Glowing Light Rays */}
        <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(7, 22, 38, 0) 70%)', filter: 'blur(80px)', zIndex: 3, pointerEvents: 'none' }} className="anim-float-orb" />
        <div style={{ position: 'absolute', bottom: '-15%', right: '8%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(7, 22, 38, 0) 70%)', filter: 'blur(90px)', zIndex: 3, pointerEvents: 'none' }} className="anim-float-orb" />

        <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* Left Column Content */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.4)', backdropFilter: 'blur(12px)', color: '#38BDF8', padding: '6px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px', boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34D399', display: 'inline-block', boxShadow: '0 0 8px #34D399' }} />
                <span>PREMIER JUNIOR COLLEGE IN HANUMAKONDA</span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 850, color: '#FFFFFF', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                Building Strong Foundations for{' '}
                <span className="text-gradient-animated anim-neon-pulse" style={{ display: 'inline-block', minWidth: '280px' }}>
                  {dynamicWords[wordIndex]}
                </span>
              </h1>

              <p style={{ fontSize: '1.1rem', color: '#CBD5E1', lineHeight: 1.65, maxWidth: '620px', marginBottom: '32px' }}>
                Inspire Junior College integrates rigorous CBSE & State Board textbook coverage with application-based competitive exam coaching. Taught by experienced faculty with continuous exam-pattern testing.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <a
                  href="#enquiry"
                  style={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    padding: '14px 32px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.4)'
                  }}
                  className="press-interactive"
                >
                  Apply for Admissions 2026 →
                </a>

                <a
                  href="#programs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    padding: '14px 26px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    backdropFilter: 'blur(10px)'
                  }}
                  className="press-interactive"
                >
                  Explore Streams
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Admissions Helpline</div>
                    <a href={`tel:${collegePhone}`} style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 800, textDecoration: 'none' }}>{collegePhone}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column 3D Shiny Elevated Card */}
            <div className="card-3d-wrapper">
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.82)',
                  backdropFilter: 'blur(24px)',
                  border: '1.5px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '24px',
                  padding: '2.4rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)'
                }}
                className="card-3d-tilt shiny-3d-card"
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  Academic Guarantee
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 850, color: '#FFFFFF', marginBottom: '12px' }}>
                  Integrated Board + Entrance Prep
                </h3>
                <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Students master fundamental concepts for State & CBSE Board exams during morning hours, followed by daily JEE/NEET micro-assessments.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>IIT-JEE & NEET Rank Specialization</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Super-60 High-Scorer Wing at Bheemaram & Hunter Road</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>Periodic Simulated Testing</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Weekly mock exams mirroring real test difficulty</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>eTutor Digital Test Analytics App</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Live performance tracking & parent notification engine</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ─── HERO BOTTOM IMAGE WIDGET PLACEHOLDERS STRIP ─── */}
          <div style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#38BDF8', letterSpacing: '0.14em' }}>
                Life at Inspire Junior College
              </span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 850, color: '#FFFFFF', marginTop: '4px' }}>
                World-Class Campus Infrastructure & Learning Environment
              </h3>
            </div>

            {/* Photo Cards Grid with Clean 3D Placeholders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              {photoPlaceholders.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
                  }}
                  className="card-hover-lift shiny-3d-card"
                >
                  {/* Photo Container Placeholder Slot */}
                  <div
                    style={{
                      height: '160px',
                      backgroundColor: photo.bgColor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderBottom: '1px solid #E2E8F0',
                      color: photo.accentColor
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>{photo.svgIcon}</div>
                    <span style={{ backgroundColor: '#FFFFFF', color: photo.accentColor, border: '1px solid #E2E8F0', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {photo.category}
                    </span>
                  </div>

                  {/* Caption Overlay Content */}
                  <div style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>{photo.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ─── SECONDARY REVERSE MOVING TEXT TICKER TAPE ─── */}
      <div style={{ backgroundColor: '#051329', color: '#FFFFFF', padding: '12px 0', fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', borderTop: '1px solid rgba(56, 189, 248, 0.2)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div className="marquee-track-reverse">
          <div style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', alignItems: 'center' }}>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              NATIONAL RANK 1 NEET-UG
            </span>
            <span>SUPER-60 HIGH SCORER BATCH AT BHEEMARAM & HUNTER ROAD CAMPUS</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>100% PASS GUARANTEE ICAI CA FOUNDATION ACADEMY</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>3D DIGITAL BOTANY & ZOOLOGY DIAGNOSTIC LABS</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>UPSC CIVIL SERVICES FOUNDATION PROGRAM</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
          </div>

          <div style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', alignItems: 'center' }}>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              NATIONAL RANK 1 NEET-UG
            </span>
            <span>SUPER-60 HIGH SCORER BATCH AT BHEEMARAM & HUNTER ROAD CAMPUS</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>100% PASS GUARANTEE ICAI CA FOUNDATION ACADEMY</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>3D DIGITAL BOTANY & ZOOLOGY DIAGNOSTIC LABS</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
            <span>UPSC CIVIL SERVICES FOUNDATION PROGRAM</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>///</span>
          </div>
        </div>
      </div>

      {/* ─── 4. STATS STRIP ─── */}
      <section style={{ backgroundColor: '#051329', color: '#FFFFFF', padding: '3rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', textAlign: 'center' }}>
            
            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>15+ Years</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>Academic Excellence</div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>Pioneering Intermediate Education</p>
            </div>

            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#38BDF8', lineHeight: 1 }}>500+</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>Faculty Mentors</div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>Experienced IITian & Doctor Alumni</p>
            </div>

            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#34D399', lineHeight: 1 }}>4 Streams</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>Academic Tracks</div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>MPC, BiPC, Commerce & Civils</p>
            </div>

            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#F472B6', lineHeight: 1 }}>99.4%</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>Pass & Selection Rate</div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>Premier Engineering & Medical Colleges</p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 5. PROGRAMS / STREAMS SECTION ─── */}
      <section id="programs" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        
        {/* Section Title */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0A2540', letterSpacing: '0.14em', marginBottom: '8px' }}>
            Academic Programs (2026-27)
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 850, color: '#0A2540', letterSpacing: '-0.02em' }}>
            Future-Ready Intermediate Streams
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', marginTop: '12px' }}>
            Integrated 2-year programs designed for academic domination in state board exams and national competitive entrances.
          </p>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '2rem' }}>
            {[
              { id: 'all', label: 'All Programs' },
              { id: 'mpc', label: 'MPC (Engineering)' },
              { id: 'bipc', label: 'BiPC (Medical)' },
              { id: 'mec', label: 'Commerce & CA' },
              { id: 'civils', label: 'Civils Foundation' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab.id ? '#0A2540' : '#F1F5F9',
                  color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {filteredPrograms.map((program) => (
            <div
              key={program.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '20px',
                padding: '2.2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="card-hover-lift shiny-3d-card"
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ backgroundColor: program.badgeBg, color: program.badgeColor, fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                    {program.badge}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>2-Year Integrated</span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#0A2540', marginBottom: '8px' }}>
                  {program.title}
                </h3>

                <p style={{ fontSize: '0.94rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {program.description}
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0A2540', textTransform: 'uppercase', marginBottom: '8px' }}>Target Competitive Exams</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {program.targetExams.map((exam, i) => (
                      <span key={i} style={{ backgroundColor: '#F1F5F9', color: '#334155', fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                        {exam}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {program.features.map((feat, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <a
                  href="#enquiry"
                  style={{
                    backgroundColor: 'rgba(10, 37, 64, 0.08)',
                    color: '#0A2540',
                    border: '1px solid rgba(10, 37, 64, 0.15)',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'block',
                    textAlign: 'center'
                  }}
                  className="press-interactive"
                >
                  Enquire for {program.stream} →
                </a>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ─── 6. WHY US / APPROACH SECTION ─── */}
      <section id="why-us" style={{ backgroundColor: '#F8FAFC', padding: '6rem 1.5rem', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0A2540', letterSpacing: '0.14em', marginBottom: '8px' }}>
              The Inspire Advantage
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 850, color: '#0A2540', letterSpacing: '-0.02em' }}>
              Why Parents Trust Inspire Junior College
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', marginTop: '12px' }}>
              Our methodology ensures complete academic clarity without causing stress or burnout during intermediate years.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
            
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }} className="shiny-3d-card">
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A2540', marginBottom: '8px' }}>Integrated Board + Entrance Prep</h3>
              <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6 }}>
                Full coverage of CBSE & State Board textbooks combined with daily application-based JEE/NEET micro-assessments.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }} className="shiny-3d-card">
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0A2540', marginBottom: '8px' }}>Experienced IITian Faculty</h3>
              <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6 }}>
                Senior educators and doctor alumni who explain core fundamentals with absolute clarity and step-by-step problem solving.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }} className="shiny-3d-card">
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0A2540', marginBottom: '8px' }}>Periodic Exam Simulations</h3>
              <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6 }}>
                Weekly tests mirroring real exam difficulty integrated with the eTutor digital app for live rank analytics and progress reports.
              </p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }} className="shiny-3d-card">
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#F5F3FF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0A2540', marginBottom: '8px' }}>Personalized Student Care</h3>
              <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6 }}>
                Small batch sizes ensuring 1-on-1 doubt clearing, individualized academic tracking, and regular parent-teacher interactions.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 7. ADMISSIONS ENQUIRY FORM SECTION ─── */}
      <section id="enquiry" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center' }}>

          {/* Form Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.12em', textAlign: 'center', marginBottom: '4px' }}>
              Admissions Open 2026-27
            </div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 850, textAlign: 'center', color: '#0A2540', marginBottom: '8px' }}>
              Request Admission Information
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>
              Fill out the form below to receive syllabus roadmaps, fee breakdown, or schedule a campus visit.
            </p>

            {enquirySuccess ? (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h4 style={{ fontWeight: 850, fontSize: '1.2rem', color: '#065F46', marginBottom: '6px' }}>Enquiry Successfully Registered!</h4>
                <p style={{ fontSize: '0.88rem', color: '#047857', marginBottom: '12px' }}>
                  Your reference ID is <strong style={{ color: '#0A2540' }}>{enquiryRef}</strong>. Our counselor will contact you at {stuMobile} within 24 hours.
                </p>
                <button
                  onClick={() => setEnquirySuccess(false)}
                  style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    placeholder="e.g. K. Rahul Sharma"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.92rem', backgroundColor: '#F8FAFC' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={stuMobile}
                    onChange={(e) => setStuMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.92rem', backgroundColor: '#F8FAFC' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    placeholder="student@example.com"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.92rem', backgroundColor: '#F8FAFC' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Target Program Stream *</label>
                  <select
                    value={stuStream}
                    onChange={(e) => setStuStream(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.92rem', backgroundColor: '#F8FAFC' }}
                  >
                    <option value="mpc">MPC (IIT-JEE Engineering Prep)</option>
                    <option value="bipc">BiPC (NEET Medical Prep)</option>
                    <option value="mec">MEC (Commerce & CA Prep)</option>
                    <option value="civils">Civils Foundation Program</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Preferred Campus Location</label>
                  <select
                    value={stuCampus}
                    onChange={(e) => setStuCampus(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #CBD5E1', outline: 'none', fontSize: '0.92rem', backgroundColor: '#F8FAFC' }}
                  >
                    <option value="hunter_road">Hanamkonda Hunter Road Central Campus</option>
                    <option value="bheemaram">Bheemaram Division Super-60 Campus</option>
                    <option value="erragattugutta_c1">Erragattugutta Campus C1</option>
                    <option value="erragattugutta_c2">Erragattugutta Campus C2</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#0A2540',
                    color: '#FFF',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 850,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    boxShadow: '0 4px 14px rgba(10, 37, 64, 0.25)'
                  }}
                  className="press-interactive"
                >
                  Submit Admission Enquiry →
                </button>
              </form>
            )}
          </div>

          {/* Contact Details Column */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.14em', marginBottom: '8px' }}>
              Direct Contact & Campus Desk
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 850, color: '#0A2540', lineHeight: 1.2, marginBottom: '20px' }}>
              Speak with Our Admissions Counselors
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.65, marginBottom: '2rem' }}>
              Have questions regarding stream selection, hostel facilities, or merit scholarship entrance tests? Our admissions counselors are available Monday through Saturday.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A2540" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px' }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Direct Admissions Helpline</div>
                  <a href={`tel:${collegePhone}`} style={{ fontSize: '1.1rem', fontWeight: 850, color: '#0A2540', textDecoration: 'none' }}>{collegePhone}</a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A2540" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Official Email Address</div>
                  <a href={`mailto:${collegeEmail}`} style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0A2540', textDecoration: 'none' }}>{collegeEmail}</a>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.8rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 850, fontSize: '1.05rem', color: '#1E40AF' }}>Authorized Staff & Faculty Gateway</div>
                <div style={{ fontSize: '0.85rem', color: '#3B82F6', marginTop: '2px' }}>Rector, Principals, Accountants & Security authenticators</div>
              </div>
              <a
                href="#/v1-portal-gate-x89f2a7b"
                style={{ backgroundColor: '#1E40AF', color: '#FFF', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, textDecoration: 'none', fontSize: '0.88rem' }}
                className="press-interactive"
              >
                Launch Portal →
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 8. FOOTER SECTION ─── */}
      <footer id="campuses" style={{ backgroundColor: '#0A2540', color: '#F1F5F9', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '5rem 1.5rem 3rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
            
            {/* Column 1: Brand & Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img src={collegeLogo} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#FFFFFF' }}>INSPIRE</div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Junior College • Hanamkonda & Bheemaram
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '14px', lineHeight: 1.6 }}>
                Pioneering academic domination across Hanamkonda, Hunter Road, Erragattugutta, and Bheemaram junior colleges.
              </p>
            </div>

            {/* Column 2: 4 Campus Locations */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Campus Locations (4 Divisions)
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#CBD5E1' }}>
                <li><strong>Erragattugutta C1:</strong> MPC & BiPC Central Division</li>
                <li><strong>Erragattugutta C2:</strong> BiPC Specialized Medical Wing</li>
                <li><strong>Beemaram C1:</strong> Super-60 IIT-JEE Advanced Wing</li>
                <li><strong>Beemaram C2:</strong> MEC Commerce & CA Academy</li>
                <li><strong>Hanamkonda Central:</strong> Hunter Road Hub</li>
              </ul>
            </div>

            {/* Column 3: Academic Programs */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Academic Programs
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#CBD5E1' }}>
                <li>MPC — IIT-JEE Main & Advanced</li>
                <li>BiPC — NEET (UG) Medical Coaching</li>
                <li>MEC — ICAI CA Foundation & IPMAT</li>
                <li>Civils Foundation — UPSC & State PSC Track</li>
              </ul>
            </div>

            {/* Column 4: Portals & Social Links */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Administrative & Social Links
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <li>
                  <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700 }}>
                    Universal Administrative Gateway
                  </a>
                </li>
                <li>
                  <a href="#/sec-auth-sys-9i0j7k8l" style={{ color: '#CBD5E1', textDecoration: 'none' }}>
                    Security Authenticator Gateway
                  </a>
                </li>
                <li>
                  <a href={instaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                    <span>Official @inspire_junior_college</span>
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem', color: '#94A3B8' }}>
            <div>&copy; 2026 Inspire Junior College. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>Privacy Policy</span>
              <span>Terms of Admissions</span>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700 }}>Staff Gateway</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

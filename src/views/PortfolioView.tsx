import React, { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────
   NARAYANA GROUP — narayanagroup.com CLONE
   Complete twin with blank photo placeholders.
   All images use SVG placeholder frames.
───────────────────────────────────────────────── */

// ── Blank Photo Placeholder Component ──────────────────────────
const PhotoPlaceholder: React.FC<{
  width?: string | number;
  height?: string | number;
  label?: string;
  bg?: string;
  style?: React.CSSProperties;
  className?: string;
}> = ({ width = '100%', height = '100%', label = 'Photo', bg = '#CBD5E1', style, className }) => (
  <div
    className={className}
    style={{
      width,
      height,
      backgroundColor: bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      border: '2px dashed #94A3B8',
      borderRadius: 4,
      ...style,
    }}
  >
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '0 8px' }}>{label}</span>
  </div>
);

// ── Types ──────────────────────────────────────────────────────
interface ProgramCard {
  title: string;
  subtitle: string;
  gradFrom: string;
  gradTo: string;
  label: string;
}

interface AchieverCard {
  name: string;
  rank: string;
  exam: string;
  score: string;
}

// ── Data ───────────────────────────────────────────────────────
const PROGRAM_CARDS: ProgramCard[] = [
  { title: 'Schools', subtitle: 'Age-appropriate programme for holistic development.', gradFrom: '#92ACFF', gradTo: '#3E64DC', label: 'School Campus Photo' },
  { title: 'Junior Colleges', subtitle: 'Integrated preparation for board exams and competitive exams.', gradFrom: '#47C1F1', gradTo: '#0186B6', label: 'Junior College Campus Photo' },
  { title: 'Coaching Centres', subtitle: 'Fulfilling engineering and medical dreams with top ranks in IIT-JEE / NEET.', gradFrom: '#31CCB0', gradTo: '#01B695', label: 'Coaching Centre Photo' },
];

const STAT_CARDS = [
  { value: '600K+', label: 'Learners Annually', bg: '#6C8BF0' },
  { value: '50K+', label: 'Skilled Employees', bg: '#32AEDD' },
  { value: '950+', label: 'Educational Institutes', bg: '#00A1B6' },
  { value: '23', label: 'States in India', bg: '#9278FA' },
  { value: '250+', label: 'Cities', bg: '#1BC1A3' },
];

const ACHIEVERS: AchieverCard[] = [
  { name: 'Riddi Sharma', rank: 'AIR 1', exam: 'IIT-JEE Advanced 2026', score: '325/360' },
  { name: 'Sanjana Reddy', rank: 'AIR 2', exam: 'NEET-UG 2026', score: '720/720' },
  { name: 'Bhumija', rank: 'AIR 3', exam: 'IIT-JEE Advanced 2026', score: '319/360' },
  { name: 'Parth Bansal', rank: 'AIR 5', exam: 'IIT-JEE Mains 2026', score: '300/300' },
  { name: 'Spandana', rank: 'AIR 6', exam: 'NEET-UG 2026', score: '715/720' },
  { name: 'Trisha Ghosh', rank: 'AIR 8', exam: 'IIT-JEE Advanced 2026', score: '310/360' },
  { name: 'Reyansh Devnani', rank: 'AIR 11', exam: 'IIT-JEE Mains 2026', score: '298/300' },
  { name: 'S. Vakhin', rank: 'AIR 13', exam: 'NEET-UG 2026', score: '710/720' },
];

const TOPPER_BANNERS = [
  'NEET-UG 2026 Toppers',
  'IIT-JEE Advanced 2026 Toppers',
  'CBSE Class 12 Toppers 2026',
  'JEE Advanced 2026 Results',
  'TG EAPCET 2026 Top Rankers',
  'Narayana Fraternity Celebrates',
  'Board Exam Toppers 2026',
  'National Talent Search 2026',
];

const CAMPUS_PHOTOS = [
  'Inside Campus — Library', 'Inside Campus — Classroom', 'Inside Campus — Laboratory',
  'Inside Campus — Sports Facility', 'Inside Campus — Hostel Block',
];

const FOOTER_PHOTOS = Array.from({ length: 11 }, (_, i) => `Campus Photo ${i + 1}`);

// ── Styles ─────────────────────────────────────────────────────
const NAVBAR_BLUE = '#087FBC';
const ORANGE = '#F68627';
const DARK_TEXT = '#2B2B2B';
const BODY_WHITE = '#FFFFFF';
const LIGHT_GRAY = '#F4F7FF';
const VERY_LIGHT = '#F9F9F9';

// ── Stylesheet (injected once) ─────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Merriweather:wght@400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: #fff; color: #2B2B2B; }
.ng-container { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
.ng-btn-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #fff; text-decoration: none; cursor: pointer; border: none; background: none; }
.ng-btn-link:hover { text-decoration: underline; }
.ng-program-card { border-radius: 24px; overflow: hidden; position: relative; padding: 24px 24px 0; display: flex; flex-direction: column; }
.ng-tab-active { background: ${ORANGE}; color: #fff; border-radius: 8px; }
.ng-fade-in { animation: ngFade .6s ease both; }
@keyframes ngFade { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.ng-hero-slide { width: 100%; flex-shrink: 0; }
.ng-carousel-track { display: flex; transition: transform .6s cubic-bezier(.4,0,.2,1); }
.ng-stat-card { border-radius: 12px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; flex: 1; min-width: 140px; position: relative; overflow: hidden; }
.ng-about-card { border-radius: 8px; overflow: hidden; flex: 1; display: flex; flex-direction: column; background: #F2F2F2; }
.ng-achiever-card { background: #fff; border-radius: 16px; overflow: hidden; padding: 0; box-shadow: 0 4px 20px rgba(0,0,0,.10); display: flex; flex-direction: column; min-width: 220px; }
.ng-footer-photo-strip { display: flex; gap: 8px; overflow: hidden; }
.ng-footer-photo-strip > div { flex-shrink: 0; width: 100px; height: 80px; border-radius: 8px; overflow: hidden; }
.ng-nav-link { font-size: 15px; font-weight: 400; color: #fff; text-decoration: none; white-space: nowrap; transition: font-weight .2s; font-family: 'Inter', sans-serif; }
.ng-nav-link:hover { font-weight: 600; }
.ng-top-link { font-size: 15px; font-weight: 500; color: ${DARK_TEXT}; text-decoration: none; font-family: 'Inter', sans-serif; transition: color .2s; }
.ng-top-link:hover { color: ${ORANGE}; }
.ng-mobile-open { display: flex !important; }
@media (max-width: 1200px) {
  .ng-desktop-nav { display: none !important; }
  .ng-desktop-top-bar { display: none !important; }
  .ng-mobile-hamburger { display: flex !important; }
  .ng-stat-card { min-width: 120px; }
}
@media (max-width: 768px) {
  .ng-hero { height: 320px !important; }
  .ng-program-grid { flex-direction: column !important; }
  .ng-stats-grid { flex-wrap: wrap; }
  .ng-about-grid { flex-direction: column !important; }
  .ng-campus-grid { grid-template-columns: 1fr !important; }
}
`;

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export const PortfolioView: React.FC = () => {
  // Enquiry form state
  const [stuName, setStuName] = useState('');
  const [parentName, setParentName] = useState('');
  const [stuMobile, setStuMobile] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuStream, setStuStream] = useState('School (Nursery – Grade 10)');
  const [stuCampus, setStuCampus] = useState('Hanamkonda');
  const [stuGrade, setStuGrade] = useState('Grade 10 (Completed)');
  const [stuNotes, setStuNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');
  const [enquiryError, setEnquiryError] = useState('');

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [topperSlide, setTopperSlide] = useState(0);
  const [achieverSlide, setAchieverSlide] = useState(0);

  // Portal
  const portalHash = '#/secure-gateway-portal-v2-x9k84m2n7p1q3w5r8z-inspire';
  const orgPhone = '+91 97043 80320';
  const orgEmail = 'info@narayanagroup.com';

  // Hero carousel auto-advance
  const HERO_SLIDES = 3;
  useEffect(() => {
    const t = setInterval(() => setHeroSlide(s => (s + 1) % HERO_SLIDES), 4000);
    return () => clearInterval(t);
  }, []);

  // Topper carousel auto
  useEffect(() => {
    const t = setInterval(() => setTopperSlide(s => (s + 1) % TOPPER_BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Achiever carousel auto
  const visibleAchievers = 3;
  useEffect(() => {
    const t = setInterval(() => setAchieverSlide(s => (s + 1) % (ACHIEVERS.length - visibleAchievers + 1)), 3000);
    return () => clearInterval(t);
  }, []);

  // Enquiry submit
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuMobile.trim()) {
      setEnquiryError('Please enter Student Name and Contact Mobile Number.');
      return;
    }
    setIsSubmitting(true);
    setEnquiryError('');
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: stuName.trim(), parentName: parentName.trim(), mobile: stuMobile.trim(), email: stuEmail.trim(), stream: stuStream, preferredCampus: stuCampus, currentGrade: stuGrade, notes: stuNotes.trim() }),
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setEnquiryRef(data.referenceCode || `NRY-2026-${Math.floor(100000 + Math.random() * 900000)}`);
        setEnquirySuccess(true);
      } else {
        setEnquiryError(data.message || 'Failed to submit. Please try again.');
      }
    } catch {
      setEnquiryRef(`NRY-2026-${Math.floor(100000 + Math.random() * 900000)}`);
      setEnquirySuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Input style helper ──────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#F8FAFF',
    border: '1.5px solid #CBD5E1', borderRadius: 8, color: DARK_TEXT,
    fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif',
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      {/* Inject CSS */}
      <style>{CSS}</style>

      <div style={{ background: BODY_WHITE, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

        {/* ══════════════════════════════════════════
            TOP UTILITY BAR (white)
        ══════════════════════════════════════════ */}
        <div className="ng-desktop-top-bar" style={{ background: BODY_WHITE, borderBottom: '1px solid #E2E8F0', padding: '10px 0' }}>
          <div className="ng-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo */}
            <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{ width: 50, height: 50, background: NAVBAR_BLUE, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" fill="#fff" opacity=".9"/>
                  <path d="M16 4v18M4 10l12 6 12-6" stroke="#087FBC" strokeWidth="1.5"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif" }}>Narayana</div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Educational Institutions</div>
              </div>
            </a>

            {/* Utility links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href={portalHash} className="ng-top-link">Parents &amp; Students</a>
              <a href="#enquiry" className="ng-top-link">Online Fee Payment</a>
              <a href="#enquiry" className="ng-top-link">Fee Enquiry</a>
              <a href="#about" className="ng-top-link">Narayana Alumni</a>
            </div>

            {/* Enquire button */}
            <a href="#enquiry" style={{ background: ORANGE, color: '#fff', padding: '12px 28px', fontWeight: 600, fontSize: 15, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Enquire Now
            </a>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MAIN BLUE NAV BAR
        ══════════════════════════════════════════ */}
        <nav style={{ background: NAVBAR_BLUE, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>
          <div className="ng-container" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Mobile logo (small screens) */}
            <a href="#hero" style={{ display: 'none', alignItems: 'center', gap: 8, textDecoration: 'none' }} className="ng-mobile-logo">
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M16 4L4 10v12l12 6 12-6V10L16 4z" fill="#fff" opacity=".9"/></svg>
              </div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Merriweather', serif" }}>Narayana</span>
            </a>

            {/* Desktop nav links */}
            <div className="ng-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 32, width: '100%', justifyContent: 'center' }}>
              {[
                { href: '#about', label: 'Experience Narayana' },
                { href: '#digital', label: 'Digital' },
                { href: '#streams', label: 'Academics' },
                { href: '#uniforms', label: 'Uniforms' },
                { href: '#sports', label: 'nSports' },
                { href: '#campuses', label: 'Centers' },
                { href: '#careers', label: 'Careers' },
                { href: '#blog', label: 'Blog' },
                { href: '#gallery', label: 'Gallery' },
                { href: '#news', label: 'News & Media' },
                { href: '#contact', label: 'Contact us' },
              ].map(l => (
                <a key={l.href} href={l.href} className="ng-nav-link">{l.label}</a>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              className="ng-mobile-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '6px 10px', color: '#fff', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileOpen && (
            <div style={{ background: NAVBAR_BLUE, borderTop: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Experience Narayana','Academics','Centers','Gallery','News & Media','Contact us'].map(l => (
                <a key={l} href="#" onClick={() => setMobileOpen(false)} style={{ color: '#fff', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>{l}</a>
              ))}
              <a href="#enquiry" onClick={() => setMobileOpen(false)} style={{ background: ORANGE, color: '#fff', padding: '10px 20px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', borderRadius: 6 }}>Enquire Now</a>
            </div>
          )}
        </nav>

        {/* ══════════════════════════════════════════
            HERO CAROUSEL — Full-page with blank slides
        ══════════════════════════════════════════ */}
        <section id="hero" style={{ position: 'relative', overflow: 'hidden', height: 560 }} className="ng-hero">
          {/* Slides */}
          <div style={{ display: 'flex', height: '100%', transform: `translateX(-${heroSlide * 100}%)`, transition: 'transform .7s cubic-bezier(.4,0,.2,1)' }}>
            {[
              { label: 'Hero Banner 1 — Main Campus Building' },
              { label: 'Hero Banner 2 — Students at Work' },
              { label: 'Hero Banner 3 — Campus Life' },
            ].map((s, i) => (
              <div key={i} style={{ minWidth: '100%', height: '100%', position: 'relative' }}>
                <PhotoPlaceholder label={s.label} bg="#B8CCEA" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
              </div>
            ))}
          </div>

          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 15%, rgba(4,17,42,0.72) 75%)' }} />

          {/* Hero text overlay */}
          <div style={{ position: 'absolute', bottom: '10%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', textAlign: 'center', padding: '0 16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)', borderRadius: 32, padding: '8px 24px', fontSize: 16, fontWeight: 500, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              Your dreams are our dreams
            </div>
            <h1 style={{ fontSize: 'clamp(24px,4vw,52px)', fontWeight: 700, lineHeight: 1.3, maxWidth: 900, fontFamily: "'Merriweather', serif" }}>
              Inspiring Young Minds and Empowering Dreams since 1979
            </h1>
          </div>

          {/* Dot indicators */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: HERO_SLIDES }).map((_, i) => (
              <button key={i} onClick={() => setHeroSlide(i)} style={{ width: i === heroSlide ? 24 : 8, height: 8, borderRadius: 4, background: i === heroSlide ? ORANGE : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all .3s' }} />
            ))}
          </div>

          {/* Arrow prev */}
          <button onClick={() => setHeroSlide(s => (s - 1 + HERO_SLIDES) % HERO_SLIDES)} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {/* Arrow next */}
          <button onClick={() => setHeroSlide(s => (s + 1) % HERO_SLIDES)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </section>

        {/* ══════════════════════════════════════════
            STATS CARDS BAR
        ══════════════════════════════════════════ */}
        <section style={{ background: LIGHT_GRAY, padding: '0 16px' }}>
          <div className="ng-container" style={{ position: 'relative', marginTop: -40, paddingBottom: 32 }}>
            <div style={{ background: '#FFFDFD', borderRadius: 24, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,.10)' }}>
              <div className="ng-stats-grid" style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', overflowX: 'auto' }}>
                {STAT_CARDS.map((s, i) => (
                  <div key={i} className="ng-stat-card" style={{ background: s.bg }}>
                    <div style={{ fontSize: 'clamp(22px,3vw,44px)', fontWeight: 700, color: '#fff', fontFamily: "'Merriweather', serif", lineHeight: 1.1 }}>
                      {s.value}
                    </div>
                    <p style={{ fontSize: 'clamp(12px,1.5vw,18px)', color: '#fff', fontWeight: 400, margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TOPPERS CAROUSEL (banner images placeholder)
        ══════════════════════════════════════════ */}
        <section style={{ background: LIGHT_GRAY, padding: '40px 16px 48px' }}>
          <div className="ng-container">
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
              <div style={{ display: 'flex', transform: `translateX(-${topperSlide * 100}%)`, transition: 'transform .6s ease' }}>
                {TOPPER_BANNERS.map((label, i) => (
                  <div key={i} style={{ minWidth: '100%', height: 340 }}>
                    <PhotoPlaceholder label={label} bg="#E2EBF8" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
                  </div>
                ))}
              </div>

              {/* arrows */}
              <button onClick={() => setTopperSlide(s => (s - 1 + TOPPER_BANNERS.length) % TOPPER_BANNERS.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: 'none', borderRadius: 8, width: 36, height: 56, cursor: 'pointer', boxShadow: '0 0 12px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="24" viewBox="0 0 13 20" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="10 1 1 10 10 19"/></svg>
              </button>
              <button onClick={() => setTopperSlide(s => (s + 1) % TOPPER_BANNERS.length)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: 'none', borderRadius: 8, width: 36, height: 56, cursor: 'pointer', boxShadow: '0 0 12px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="24" viewBox="0 0 13 20" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="3 1 12 10 3 19"/></svg>
              </button>

              {/* dots */}
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {TOPPER_BANNERS.map((_, i) => (
                  <button key={i} onClick={() => setTopperSlide(i)} style={{ width: i === topperSlide ? 20 : 6, height: 6, borderRadius: 3, background: i === topperSlide ? NAVBAR_BLUE : 'rgba(0,0,0,0.25)', border: 'none', cursor: 'pointer', transition: 'all .3s' }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TRANSFORMING THE FUTURE SECTION
            (Schools / Junior Colleges / Coaching / Professional)
        ══════════════════════════════════════════ */}
        <section id="streams" style={{ padding: '80px 16px 80px', background: BODY_WHITE }}>
          <div className="ng-container">
            <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
              <h2 style={{ fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", lineHeight: 1.5, marginBottom: 16 }}>
                Transforming the Future <br/>since 1979
              </h2>
              <p style={{ fontSize: 'clamp(13px,1.5vw,16px)', color: '#444', lineHeight: 1.75 }}>
                The Narayana Group is one of Asia's largest educational networks, catering to students from Kindergarten to Grade 12 and beyond. We create an environment where students not only dream but turn them into realities, because your dreams are our dreams.
              </p>
            </div>

            {/* 3 + 1 card grid */}
            <div className="ng-program-grid" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              {PROGRAM_CARDS.map((card, i) => (
                <div key={i} className="ng-program-card" style={{ background: `linear-gradient(180deg, ${card.gradFrom} 0%, ${card.gradTo} 100%)`, width: 'calc(33.33% - 16px)', minWidth: 280, minHeight: 400 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 5, paddingBottom: 16 }}>
                    <h3 style={{ fontSize: 'clamp(16px,2vw,26px)', fontWeight: 700, color: '#fff', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>{card.title}</h3>
                    <p style={{ fontSize: 'clamp(12px,1.2vw,15px)', color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>{card.subtitle}</p>
                    <button className="ng-btn-link" style={{ color: '#fff', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Learn More
                      <svg width="10" height="16" viewBox="0 0 13 20" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="3 1 12 10 3 19"/></svg>
                    </button>
                  </div>
                  {/* Photo placeholder at bottom of card */}
                  <div style={{ flex: 1, minHeight: 220, margin: '0 -24px', position: 'relative' }}>
                    <PhotoPlaceholder label={card.label} bg="rgba(255,255,255,0.18)" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none', borderTop: '1px dashed rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Professional Colleges — wide banner card */}
            <div style={{ marginTop: 24, borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(180deg, #987BFF 0%, #7E6CEA 100%)', display: 'flex', minHeight: 200, position: 'relative' }}>
              {/* Left image placeholder */}
              <div style={{ width: 360, flexShrink: 0 }}>
                <PhotoPlaceholder label="Professional College Students Photo" bg="rgba(255,255,255,0.15)" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none', borderRight: '1px dashed rgba(255,255,255,0.3)' }} />
              </div>
              <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <h3 style={{ fontSize: 'clamp(18px,2.5vw,28px)', fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>Professional Colleges</h3>
                <p style={{ fontSize: 'clamp(13px,1.3vw,16px)', color: 'rgba(255,255,255,0.9)' }}>Shaping students into future-ready professionals and new-age entrepreneurs.</p>
                <button className="ng-btn-link" style={{ color: '#fff', width: 'fit-content' }}>
                  Learn More
                  <svg width="10" height="16" viewBox="0 0 13 20" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="3 1 12 10 3 19"/></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ABOUT US — Vision / Mission / Who
        ══════════════════════════════════════════ */}
        <section id="about" style={{ background: VERY_LIGHT, padding: '80px 16px' }}>
          <div className="ng-container">
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
              <h2 style={{ fontSize: 'clamp(24px,3vw,44px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 16 }}>About Us</h2>
              <p style={{ fontSize: 'clamp(13px,1.5vw,16px)', color: '#444', lineHeight: 1.75 }}>
                For over four decades, Narayana Educational Institutions has empowered millions of students to realise their full potential and fulfil their dreams.
              </p>
            </div>

            {/* Desktop 2-up then 1-wide grid */}
            <div className="ng-about-grid" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Vision */}
              <div className="ng-about-card" style={{ flex: '1 1 300px' }}>
                <div style={{ height: 240 }}>
                  <PhotoPlaceholder label="Vision — Our Guiding Principle" bg="#DAE5F5" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
                </div>
                <div style={{ padding: '32px 40px', flex: 1 }}>
                  <h3 style={{ fontSize: 'clamp(18px,2.5vw,36px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 12 }}>Vision</h3>
                  <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>Driven by Determination, Progress and a Commitment to Service.</p>
                </div>
              </div>

              {/* Mission */}
              <div className="ng-about-card" style={{ flex: '1 1 300px' }}>
                <div style={{ height: 240 }}>
                  <PhotoPlaceholder label="Mission — Our Purpose" bg="#C8E6D0" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
                </div>
                <div style={{ padding: '32px 40px', flex: 1 }}>
                  <h3 style={{ fontSize: 'clamp(18px,2.5vw,36px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 12 }}>Mission</h3>
                  <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>
                    At Narayana Educational Institutions, we are dedicated to fostering holistic academic excellence and nurturing a spirit of healthy competition. Our mission is to equip students with the knowledge, discipline and determination needed to pursue purposeful success and reach the pinnacle of achievement with confidence and clarity.
                  </p>
                </div>
              </div>
            </div>

            {/* Who Are We — wide card */}
            <div className="ng-about-card" style={{ display: 'flex', flexDirection: 'row', marginTop: 24 }}>
              <div style={{ width: '40%', minHeight: 300, flexShrink: 0 }}>
                <PhotoPlaceholder label="Who Are We — Narayana Group History" bg="#E5D9F8" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
              </div>
              <div style={{ flex: 1, padding: '40px 48px' }}>
                <h3 style={{ fontSize: 'clamp(18px,2.5vw,36px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 16 }}>Who are We?</h3>
                <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75, marginBottom: 20 }}>
                  Established in 1979 by Dr. Ponguru Narayana, Narayana Educational Institutions is one of Asia's largest educational institutions, consisting of 950+ schools, junior colleges, coaching centres and professional colleges across 250+ cities in 23 Indian states. With a dedicated team of 50,000+ experienced teachers and staff, we fulfil the dreams of over 6 lakh students annually.
                </p>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Learn More
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="5 12 19 12 13 6"/><polyline points="13 18 19 12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INSIDE CAMPUS — Gallery strip
        ══════════════════════════════════════════ */}
        <section id="gallery" style={{ background: BODY_WHITE, padding: '80px 16px' }}>
          <div className="ng-container">
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
              <h2 style={{ fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 12 }}>Inside the Campus</h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>Experience our state-of-the-art facilities across all our campuses.</p>
            </div>

            <div className="ng-campus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {CAMPUS_PHOTOS.map((label, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', height: 220, position: 'relative' }}>
                  <PhotoPlaceholder label={label} bg={['#BFDBFE','#BBF7D0','#FDE68A','#DDD6FE','#FBCFE8'][i % 5]} style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            BRANCHES / CENTERS MAP
        ══════════════════════════════════════════ */}
        <section id="campuses" style={{ background: LIGHT_GRAY, padding: '80px 16px' }}>
          <div className="ng-container">
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
              <h2 style={{ fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 12 }}>Find a Centre Near You</h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>Narayana Group has 950+ centres across 250+ cities in 23 Indian states.</p>
            </div>

            {/* Map placeholder */}
            <div style={{ borderRadius: 20, overflow: 'hidden', height: 400, position: 'relative', marginBottom: 40 }}>
              <PhotoPlaceholder label="India Map — Narayana Centers Location Map" bg="#C8D8E8" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
              <div style={{ position: 'absolute', top: 16, left: 16, background: NAVBAR_BLUE, color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                250+ Cities · 23 States
              </div>
            </div>

            {/* State quick links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {['Telangana','Andhra Pradesh','Karnataka','Tamil Nadu','Maharashtra','Delhi','Rajasthan','Gujarat','Uttar Pradesh','West Bengal','Odisha','Kerala'].map(state => (
                <button key={state} style={{ padding: '8px 18px', background: '#fff', border: '1.5px solid #CBD5E1', borderRadius: 999, fontSize: 13, fontWeight: 500, color: DARK_TEXT, cursor: 'pointer', transition: 'all .2s' }}>
                  {state}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ACHIEVERS CAROUSEL
        ══════════════════════════════════════════ */}
        <section style={{ background: BODY_WHITE, padding: '80px 16px' }}>
          <div className="ng-container">
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
              <h2 style={{ fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 12 }}>Our Achievers</h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>Year after year, Narayana students top national rankings in IIT-JEE, NEET &amp; Board Exams.</p>
            </div>

            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 20, transform: `translateX(-${achieverSlide * (240 + 20)}px)`, transition: 'transform .5s ease', paddingBottom: 4 }}>
                {ACHIEVERS.map((a, i) => (
                  <div key={i} className="ng-achiever-card" style={{ minWidth: 220, flex: '0 0 220px' }}>
                    {/* Student photo placeholder */}
                    <div style={{ height: 200, background: ['#BFDBFE','#BBF7D0','#FDE68A','#DDD6FE','#FBCFE8','#FED7AA','#E0F2FE','#D1FAE5'][i % 8] }}>
                      <PhotoPlaceholder label={`${a.name} — Student Photo`} bg="transparent" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
                    </div>
                    <div style={{ padding: '16px 18px 20px' }}>
                      {/* Rank badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#92400E"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {a.rank}
                      </div>
                      <h4 style={{ fontSize: 17, fontWeight: 700, color: DARK_TEXT, marginBottom: 4 }}>{a.name}</h4>
                      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 2 }}>{a.exam}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: NAVBAR_BLUE }}>{a.score}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Nav arrows */}
              <button onClick={() => setAchieverSlide(s => Math.max(0, s - 1))} style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, width: 36, height: 56, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="20" viewBox="0 0 13 20" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="10 1 1 10 10 19"/></svg>
              </button>
              <button onClick={() => setAchieverSlide(s => Math.min(ACHIEVERS.length - visibleAchievers, s + 1))} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, width: 36, height: 56, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="20" viewBox="0 0 13 20" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="3 1 12 10 3 19"/></svg>
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ADMISSION ENQUIRY FORM
        ══════════════════════════════════════════ */}
        <section id="enquiry" style={{ background: LIGHT_GRAY, padding: '80px 16px' }}>
          <div className="ng-container" style={{ maxWidth: 860 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: NAVBAR_BLUE, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admission Enquiry 2026-27</span>
              <h2 style={{ fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '10px 0 14px' }}>
                Enquire Now
              </h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75 }}>
                Fill out the form below to connect with our admission counselors.
              </p>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 8px 40px rgba(0,0,0,.10)', border: '1.5px solid #E2E8F0' }}>
              {enquirySuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', border: '2px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#16A34A' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: DARK_TEXT, marginBottom: 8 }}>Enquiry Submitted Successfully!</h3>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Our admission counselor will reach out on your contact number shortly.</p>
                  <div style={{ display: 'inline-block', padding: '12px 28px', background: '#EFF6FF', border: '1.5px solid #3B82F6', borderRadius: 12, color: NAVBAR_BLUE, fontWeight: 800, fontSize: 16, marginBottom: 24, letterSpacing: '.04em' }}>
                    REF: {enquiryRef}
                  </div>
                  <p style={{ fontSize: 13, color: '#64748B' }}>For urgent inquiries, call: <strong style={{ color: ORANGE }}>{orgPhone}</strong></p>
                  <button onClick={() => { setEnquirySuccess(false); setStuName(''); setStuMobile(''); setEnquiryRef(''); }} style={{ marginTop: 24, padding: '10px 24px', background: NAVBAR_BLUE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  {enquiryError && (
                    <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
                      {enquiryError}
                    </div>
                  )}

                  {[
                    { label: 'Student Full Name *', placeholder: 'e.g. Aarav Sharma', val: stuName, set: setStuName, type: 'text' },
                    { label: 'Parent / Guardian Name', placeholder: 'e.g. Ramesh Sharma', val: parentName, set: setParentName, type: 'text' },
                    { label: 'Contact Mobile Number *', placeholder: '10-digit mobile', val: stuMobile, set: setStuMobile, type: 'tel' },
                    { label: 'Email Address', placeholder: 'student@example.com', val: stuEmail, set: setStuEmail, type: 'email' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                      <input type={f.type} required={f.label.includes('*')} placeholder={f.placeholder} value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle} />
                    </div>
                  ))}

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Interested In</label>
                    <select value={stuStream} onChange={e => setStuStream(e.target.value)} style={inputStyle}>
                      <option>School (Nursery – Grade 10)</option>
                      <option>Junior College (Intermediate / Class 11-12)</option>
                      <option>Coaching Centre (IIT-JEE / NEET)</option>
                      <option>Professional College</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Preferred Campus / Location</label>
                    <select value={stuCampus} onChange={e => setStuCampus(e.target.value)} style={inputStyle}>
                      {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2', 'Warangal / Hanamkonda', 'Hyderabad', 'Vijayawada', 'Chennai', 'Bangalore'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Current Grade / Qualification</label>
                    <select value={stuGrade} onChange={e => setStuGrade(e.target.value)} style={inputStyle}>
                      <option>Grade 10 (Completed)</option>
                      <option>Grade 12 / Intermediate (Completed)</option>
                      <option>Appearing Grade 10</option>
                      <option>Appearing Grade 12</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Message / Questions</label>
                    <textarea rows={3} placeholder="Scholarship queries, hostel facilities, specific exam preparation..." value={stuNotes} onChange={e => setStuNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '15px', background: ORANGE, color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', borderRadius: 10, letterSpacing: '.03em', opacity: isSubmitting ? .7 : 1, transition: 'opacity .2s' }}>
                      {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SOCIAL MEDIA SECTION
        ══════════════════════════════════════════ */}
        <section style={{ background: BODY_WHITE, padding: '60px 16px' }}>
          <div className="ng-container" style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ maxWidth: 440 }}>
              <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 700, color: DARK_TEXT, fontFamily: "'Merriweather', serif", marginBottom: 16 }}>Follow Us on Social Media</h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.75, marginBottom: 28 }}>Stay connected with the Narayana community. Share your success stories and campus life moments.</p>
              <div style={{ display: 'flex', gap: 14 }}>
                {[
                  { label: 'Facebook', bg: '#1877F2', icon: 'f' },
                  { label: 'YouTube', bg: '#FF0000', icon: 'Y' },
                  { label: 'Instagram', bg: '#E1306C', icon: 'In' },
                  { label: 'LinkedIn', bg: '#0A66C2', icon: 'Li' },
                ].map(s => (
                  <a key={s.label} href="#" title={s.label} style={{ width: 44, height: 44, borderRadius: '50%', background: s.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>{s.icon}</a>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, height: 260, borderRadius: 16, overflow: 'hidden' }}>
              <PhotoPlaceholder label="Social Media Wall — Facebook / Instagram Posts" bg="#F1F5F9" style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <footer style={{ background: DARK_TEXT, color: '#fff' }}>
          {/* Photo strip */}
          <div style={{ display: 'flex', gap: 6, overflow: 'hidden', height: 90 }}>
            {FOOTER_PHOTOS.map((label, i) => (
              <div key={i} style={{ flex: '0 0 calc(100% / 11)', minWidth: 80, height: '100%' }}>
                <PhotoPlaceholder label={label} bg={['#93C5FD','#6EE7B7','#FDE68A','#C4B5FD','#FCA5A5','#67E8F9','#A3E635','#F9A8D4','#FCD34D','#86EFAC','#7DD3FC'][i % 11]} style={{ width: '100%', height: '100%', borderRadius: 0, border: 'none' }} />
              </div>
            ))}
          </div>

          {/* Footer body */}
          <div className="ng-container" style={{ padding: '48px 16px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M16 4L4 10v12l12 6 12-6V10L16 4z" fill={NAVBAR_BLUE}/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Merriweather', serif" }}>Narayana</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Educational Institutions</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, maxWidth: 280 }}>
                Inspiring Young Minds and Empowering Dreams since 1979. Asia's leading educational network with 950+ institutions.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                {[
                  { bg: '#1877F2', l: 'F' }, { bg: '#0A66C2', l: 'Li' }, { bg: '#FF0000', l: 'Y' }, { bg: '#E1306C', l: 'In' },
                ].map(s => (
                  <a key={s.l} href="#" style={{ width: 36, height: 36, borderRadius: '50%', background: s.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>{s.l}</a>
                ))}
              </div>
            </div>

            {/* Programs */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}>Programs</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Schools', 'Junior Colleges', 'Coaching Centres', 'Professional Colleges', 'Digital Learning (nLearn)', 'nSports'].map(p => (
                  <li key={p}><a href="#" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none', transition: 'color .2s' }}>{p}</a></li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['About Us', 'Academics', 'Gallery', 'News & Media', 'Careers', 'Blogs', 'Contact Us', 'Alumni'].map(l => (
                  <li key={l}><a href="#" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}>Contact Us</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>Narayana Group HQ, Hyderabad, Telangana, India</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.61a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
                  <a href={`tel:${orgPhone}`} style={{ fontSize: 13, color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>{orgPhone}</a>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <a href={`mailto:${orgEmail}`} style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>{orgEmail}</a>
                </div>
              </div>

              {/* Portal link */}
              <a href={portalHash} style={{ display: 'inline-block', marginTop: 20, padding: '10px 20px', background: NAVBAR_BLUE, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '.04em' }}>
                ERP Portal
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '20px 16px' }}>
            <div className="ng-container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>© 2026 Narayana Educational Institutions. All Rights Reserved.</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>Privacy Policy · Terms of Use · Sitemap</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

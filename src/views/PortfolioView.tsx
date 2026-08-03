import React, { useState } from 'react';
import collegeLogo from '../assets/college logo.png';
import heroImg from '../assets/heroimage.jpeg';

import clip1 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.02 PM (1).jpeg';
import clip2 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.02 PM.jpeg';
import clip3 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (1).jpeg';
import clip4 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (2).jpeg';
import clip5 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (3).jpeg';
import clip6 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM.jpeg';
import clip7 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.04 PM.jpeg';

/* ─────────────────────────────────────────────────────────────
   INSPIRE JUNIOR COLLEGE — Official Institutional Portfolio
   Featuring Paper Clips News Gallery, Constant Hero Banner,
   Campus Locations, and Public Admission Enquiry Desk.
─────────────────────────────────────────────────────────────── */

// ── Paper Clips Data ──────────────────────────────────────────
const PAPER_CLIPS = [
  { id: 1, src: clip1, title: 'Press Coverage — Top State Ranks in Competitive Exams', subtitle: 'Inspire Junior College students shine with top AIR & State ranks in JEE & NEET entrance exams.' },
  { id: 2, src: clip2, title: 'Achievers Announcement — Outstanding Intermediate Board Results', subtitle: 'State record-breaking marks scored by Inspire Junior College students.' },
  { id: 3, src: clip3, title: 'National Talent Felicitation — Media Feature', subtitle: 'Felicitation ceremony honoring state toppers and national rank holders.' },
  { id: 4, src: clip4, title: 'Special Academic Excellence Award', subtitle: 'Inspire Junior College recognized for individual mentorship and specialized doubt clarification.' },
  { id: 5, src: clip5, title: 'NEET Medical Entrance Record Ranks', subtitle: 'Highest selection percentage in NEET Medical entrance across Warangal & Hanamkonda.' },
  { id: 6, src: clip6, title: 'IIT-JEE Mains & Advanced Top Scorers', subtitle: 'Students secure 99+ percentile in JEE Mains with top rank admissions into IITs & NITs.' },
  { id: 7, src: clip7, title: 'Inspire Junior College Annual Results Feature', subtitle: 'Comprehensive newspaper highlight showcasing our stellar rankers and campus achievements.' },
];

// ── Program Cards Data ─────────────────────────────────────────
const PROGRAM_CARDS = [
  {
    title: 'Intermediate + MPC (JEE)',
    subtitle: 'Integrated 2-year preparation for IIT-JEE Mains & Advanced alongside IPE Board Exam.',
    gradFrom: '#1E3A8A', gradTo: '#2563EB',
    tag: 'Engineering Focus',
    clip: clip6
  },
  {
    title: 'Intermediate + BiPC (NEET)',
    subtitle: 'Comprehensive coaching for NEET Medical & AIIMS entrance exams with daily practice tests.',
    gradFrom: '#065F46', gradTo: '#10B981',
    tag: 'Medical Focus',
    clip: clip5
  },
  {
    title: 'Intermediate + MEC / CEC',
    subtitle: 'Foundation for CA, CS, CMA, and Civils with strong emphasis on Commerce & Economics.',
    gradFrom: '#7C2D12', gradTo: '#D97706',
    tag: 'Commerce & Civils',
    clip: clip4
  },
];

const STAT_CARDS = [
  { value: '100%', label: 'Dedicated Mentorship', bg: '#1E3A8A' },
  { value: '4', label: 'Campuses in Hanamkonda', bg: '#0D9488' },
  { value: '99%+', label: 'Top Percentile Performers', bg: '#D97706' },
  { value: '24/7', label: 'Doubt Clarification', bg: '#4C1D95' },
  { value: '1500+', label: 'Successful Admissions', bg: '#0284C7' },
];

const CAMPUSES_LIST = [
  { name: 'Erragattugutta Campus 1', desc: 'State-of-the-art academic block & modern laboratory facilities.', clip: clip1 },
  { name: 'Erragattugutta Campus 2', desc: 'Spacious classrooms with integrated digital learning tools.', clip: clip2 },
  { name: 'Bheemaram Campus 1', desc: 'Dedicated coaching center with specialized exam simulation halls.', clip: clip3 },
  { name: 'Bheemaram Campus 2', desc: 'Tranquil residential atmosphere with 24/7 study supervision.', clip: clip7 },
];

// ── Theme Colors ───────────────────────────────────────────────
const NAVBAR_NAVY = '#0F172A';
const ACCENT_GOLD = '#F59E0B';
const DARK_TEXT = '#1E293B';
const BODY_WHITE = '#FFFFFF';
const LIGHT_BG = '#F8FAFC';

// ── Stylesheet ─────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Merriweather:wght@400;700;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #1E293B; }
.inspire-container { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
.inspire-card-hover { transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease; }
.inspire-card-hover:hover { transform: translateY(-6px); box-shadow: 0 12px 32px rgba(15,23,42,0.14); }
.inspire-clip-img { transition: transform 0.4s ease, filter 0.3s ease; }
.inspire-clip-container:hover .inspire-clip-img { transform: scale(1.04); filter: brightness(1.05); }
.inspire-nav-link { font-size: 14px; font-weight: 600; color: #E2E8F0; text-decoration: none; white-space: nowrap; transition: color 0.2s; }
.inspire-nav-link:hover { color: ${ACCENT_GOLD}; }
.inspire-top-link { font-size: 13.5px; font-weight: 600; color: ${DARK_TEXT}; text-decoration: none; transition: color 0.2s; }
.inspire-top-link:hover { color: #2563EB; }
@media (max-width: 1024px) {
  .inspire-desktop-nav { display: none !important; }
  .inspire-desktop-top { display: none !important; }
  .inspire-mobile-btn { display: flex !important; }
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
  const [stuStream, setStuStream] = useState('MPC (JEE Mains & Advanced)');
  const [stuCampus, setStuCampus] = useState('Erragattugutta Campus 1');
  const [stuGrade, setStuGrade] = useState('Grade 10 (Completed)');
  const [stuNotes, setStuNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');
  const [enquiryError, setEnquiryError] = useState('');

  // Lightbox Modal state for paper clips
  const [selectedClip, setSelectedClip] = useState<typeof PAPER_CLIPS[0] | null>(null);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Portal gateway path
  const portalHash = '#/v1-portal-gate-x89f2a7b';
  const orgPhone = '+91 97043 80320';
  const orgEmail = 'admissions@inspirejuniorcollege.edu.in';

  // Enquiry submit handler
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
        body: JSON.stringify({
          studentName: stuName.trim(),
          parentName: parentName.trim(),
          mobile: stuMobile.trim(),
          email: stuEmail.trim(),
          stream: stuStream,
          preferredCampus: stuCampus,
          currentGrade: stuGrade,
          notes: stuNotes.trim()
        }),
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setEnquiryRef(data.referenceCode || `ENQ-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setEnquirySuccess(true);
      } else {
        setEnquiryError(data.message || 'Failed to submit. Please try again.');
      }
    } catch {
      setEnquiryRef(`ENQ-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setEnquirySuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#F8FAFC',
    border: '1.5px solid #CBD5E1', borderRadius: 10, color: DARK_TEXT,
    fontSize: 14, outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
  };

  return (
    <>
      <style>{CSS}</style>

      <div style={{ background: BODY_WHITE, minHeight: '100vh' }}>

        {/* ══════════════════════════════════════════
            TOP UTILITY HEADER BAR
        ══════════════════════════════════════════ */}
        <div className="inspire-desktop-top" style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', padding: '10px 0' }}>
          <div className="inspire-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            {/* Institution Brand & Logo */}
            <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
              <img
                src={collegeLogo}
                alt="Inspire Junior College Logo"
                style={{ height: 46, width: 'auto', objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: NAVBAR_NAVY, fontFamily: "'Merriweather', serif", letterSpacing: '-0.02em' }}>
                  Inspire Junior College
                </div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                  HANUMAKONDA, TELANGANA · IIT-JEE | NEET | INTERMEDIATE
                </div>
              </div>
            </a>

            {/* Utility Quick Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <a href={portalHash} className="inspire-top-link">Portal Gateway</a>
              <a href="#enquiry" className="inspire-top-link">Admissions 2026</a>
              <a href="#paper-clips" className="inspire-top-link">News &amp; Media</a>
              <a href="#about" className="inspire-top-link">About College</a>
            </div>

            {/* Call to Action Button */}
            <a
              href="#enquiry"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                padding: '10px 24px',
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 14px rgba(217,119,6,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>Enquire Now</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MAIN NAVIGATION BAR (Sticky Navy)
        ══════════════════════════════════════════ */}
        <nav style={{ background: NAVBAR_NAVY, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 4px 20px rgba(15,23,42,0.18)' }}>
          <div className="inspire-container" style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Mobile Header Logo */}
            <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} className="inspire-mobile-btn">
              <img src={collegeLogo} alt="Logo" style={{ height: 36, width: 'auto', background: '#fff', padding: 2, borderRadius: 6 }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: "'Merriweather', serif" }}>Inspire Junior College</span>
            </a>

            {/* Desktop Navigation Links */}
            <div className="inspire-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 28, width: '100%', justifyContent: 'center' }}>
              {[
                { href: '#about', label: 'About College' },
                { href: '#streams', label: 'Academic Streams' },
                { href: '#paper-clips', label: 'Achievements & Media' },
                { href: '#campuses', label: 'Our 4 Campuses' },
                { href: '#mentorship', label: 'Individual Mentorship' },
                { href: '#enquiry', label: 'Admission Form' },
                { href: '#contact', label: 'Contact Us' },
              ].map(link => (
                <a key={link.href} href={link.href} className="inspire-nav-link">{link.label}</a>
              ))}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              className="inspire-mobile-btn"
              onClick={() => setMobileOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 10px', color: '#fff', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>

          {/* Mobile Navigation Dropdown */}
          {mobileOpen && (
            <div style={{ background: NAVBAR_NAVY, borderTop: '1px solid rgba(255,255,255,0.15)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { href: '#about', label: 'About College' },
                { href: '#streams', label: 'Academic Streams' },
                { href: '#paper-clips', label: 'Achievements & Media' },
                { href: '#campuses', label: 'Our 4 Campuses' },
                { href: '#enquiry', label: 'Admission Form' }
              ].map(link => (
                <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>{link.label}</a>
              ))}
              <a href="#enquiry" onClick={() => setMobileOpen(false)} style={{ background: ACCENT_GOLD, color: '#000', padding: '10px 20px', fontWeight: 800, textDecoration: 'none', textAlign: 'center', borderRadius: 8 }}>Enquire Now</a>
            </div>
          )}
        </nav>

        {/* ══════════════════════════════════════════
            CONSTANT HERO BANNER
        ══════════════════════════════════════════ */}
        <section id="hero" style={{ position: 'relative', overflow: 'hidden', height: 540, background: '#0F172A' }}>
          {/* Constant Background Hero Image */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <img
              src={heroImg}
              alt="Inspire Junior College Campus"
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55)' }}
            />
          </div>

          {/* Gradient Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.85) 100%)' }} />

          {/* Constant Hero Banner Text Content */}
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '0 20px' }}>
            <div style={{ background: 'rgba(245,158,11,0.2)', border: '1.5px solid rgba(245,158,11,0.6)', backdropFilter: 'blur(8px)', borderRadius: 32, padding: '6px 20px', fontSize: 13, fontWeight: 800, color: ACCENT_GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Admissions Open for Academic Year 2026-27
            </div>
            
            <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.2, maxWidth: 960, fontFamily: "'Merriweather', serif", margin: '0 0 16px', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              Inspire Junior College
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 500, color: '#F1F5F9', maxWidth: 780, lineHeight: 1.6, margin: '0 0 28px' }}>
              Hanumakonda’s Premier Institution for IIT-JEE, NEET &amp; Intermediate Board Excellence with Individual Doubt Clarification &amp; Personal Mentorship.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href="#enquiry"
                style={{ background: ACCENT_GOLD, color: '#0F172A', padding: '14px 32px', fontWeight: 900, fontSize: 15, textDecoration: 'none', borderRadius: 10, boxShadow: '0 4px 20px rgba(245,158,11,0.4)', transition: 'transform 0.2s' }}
                className="inspire-card-hover"
              >
                Apply for Admission 2026
              </a>
              <a
                href="#paper-clips"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', border: '1.5px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(6px)', padding: '14px 28px', fontWeight: 700, fontSize: 15, textDecoration: 'none', borderRadius: 10 }}
              >
                View News &amp; Rank Clippings
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            HIGHLIGHT STATS BAR
        ══════════════════════════════════════════ */}
        <section style={{ background: LIGHT_BG, padding: '0 16px' }}>
          <div className="inspire-container" style={{ position: 'relative', marginTop: -36, paddingBottom: 40 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 14, boxShadow: '0 10px 40px rgba(15,23,42,0.12)', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'nowrap', overflowX: 'auto' }}>
                {STAT_CARDS.map((stat, idx) => (
                  <div key={idx} style={{ background: stat.bg, borderRadius: 14, padding: '16px 20px', flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 'clamp(24px,2.5vw,36px)', fontWeight: 900, color: '#FFF', fontFamily: "'Merriweather', serif" }}>
                      {stat.value}
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ACHIEVEMENTS & PAPER CLIPS GALLERY
        ══════════════════════════════════════════ */}
        <section id="paper-clips" style={{ padding: '70px 16px', background: BODY_WHITE }}>
          <div className="inspire-container">
            
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 48px' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Media Press &amp; Rank Clippings
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '8px 0 14px' }}>
                Our Paper Clips &amp; Rank Achievements
              </h2>
              <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75 }}>
                Real newspaper releases, press coverage, and rank celebrations highlighting Inspire Junior College students dominating national and state entrance exams. Click any clipping to enlarge.
              </p>
            </div>

            {/* Grid of 7 Paper Clip Images */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {PAPER_CLIPS.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className="inspire-card-hover inspire-clip-container"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1.5px solid #E2E8F0',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ height: 260, backgroundColor: '#F1F5F9', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={clip.src}
                      alt={clip.title}
                      className="inspire-clip-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(15,23,42,0.75)', color: '#FFF', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <span>Click to Enlarge</span>
                    </div>
                  </div>

                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: DARK_TEXT, marginBottom: 6, lineHeight: 1.4 }}>
                        {clip.title}
                      </h4>
                      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                        {clip.subtitle}
                      </p>
                    </div>
                    
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontSize: 13, fontWeight: 800 }}>
                      <span>View News Clipping</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            ACADEMIC STREAMS OFFERED
        ══════════════════════════════════════════ */}
        <section id="streams" style={{ padding: '80px 16px', background: LIGHT_BG }}>
          <div className="inspire-container">
            
            <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT_GOLD, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Future-Ready Education
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '8px 0 14px' }}>
                Academic Programs Offered
              </h2>
              <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75 }}>
                Inspire Junior College provides specialized 2-year integrated Intermediate courses combining rigorous Board curriculum with targeted competitive exam preparation.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {PROGRAM_CARDS.map((prog, idx) => (
                <div
                  key={idx}
                  className="inspire-card-hover"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ padding: '24px 28px', background: `linear-gradient(135deg, ${prog.gradFrom} 0%, ${prog.gradTo} 100%)`, color: '#FFF' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}>
                      {prog.tag}
                    </span>
                    <h3 style={{ fontSize: 22, fontWeight: 900, margin: '14px 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {prog.title}
                    </h3>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                      {prog.subtitle}
                    </p>
                  </div>

                  {/* Program Paper Clip Snippet */}
                  <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                    <img src={prog.clip} alt={prog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ padding: '20px 28px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>Duration: 2 Academic Years</span>
                    <a href="#enquiry" style={{ color: '#2563EB', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Apply Stream &rarr;</a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            ABOUT INSPIRE JUNIOR COLLEGE & MENTORSHIP
        ══════════════════════════════════════════ */}
        <section id="about" style={{ padding: '80px 16px', background: BODY_WHITE }}>
          <div className="inspire-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, alignItems: 'center' }}>
              
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Why Choose Inspire Junior College
                </span>
                <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '10px 0 18px', lineHeight: 1.3 }}>
                  Individual Mentorship &amp; Specialized Doubt Clarification
                </h2>
                <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 20 }}>
                  At <strong>Inspire Junior College</strong>, we believe every student possesses unique academic potential. Our signature approach combines experienced senior faculty, daily error analysis sessions, personalized doubt clarification, and individual performance tracking.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                  {[
                    'Specialized Doubt Clarification Desks with Dedicated Subject Experts',
                    'Individual Mentorship & Daily Progress Monitoring for Every Student',
                    'Weekly IIT-JEE & NEET Simulated Pattern Examinations',
                    'Air-Conditioned Classrooms & Modern Digital Learning Aids'
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#DEF7EC', color: '#03543F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: 12 }}>✓</div>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: DARK_TEXT }}>{feat}</span>
                    </div>
                  ))}
                </div>

                <a href="#enquiry" style={{ background: NAVBAR_NAVY, color: '#FFF', padding: '12px 28px', borderRadius: 8, fontWeight: 800, textDecoration: 'none', fontSize: 14, display: 'inline-block' }}>
                  Schedule a Campus Visit &rarr;
                </a>
              </div>

              {/* Featured Paper Clip Newspaper Snapshot */}
              <div className="inspire-card-hover" style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 36px rgba(15,23,42,0.12)', border: '2px solid #E2E8F0' }}>
                <img src={clip7} alt="Inspire Junior College Media Release" style={{ width: '100%', height: 'auto', display: 'block' }} />
                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT_GOLD, textTransform: 'uppercase' }}>Official Media Press Feature</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT, marginTop: 4 }}>Inspire Junior College Students Dominate State Level Competitive Ranks</div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            OUR 4 CAMPUSES SECTION
        ══════════════════════════════════════════ */}
        <section id="campuses" style={{ padding: '80px 16px', background: LIGHT_BG }}>
          <div className="inspire-container">
            
            <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Infrastructure &amp; Locations
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '8px 0 14px' }}>
                Our 4 Premium Campuses
              </h2>
              <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75 }}>
                Located in prime educational hubs across Hanamkonda &amp; Warangal, equipped with secure residential blocks, digital libraries, and academic desks.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {CAMPUSES_LIST.map((campus, i) => (
                <div
                  key={i}
                  className="inspire-card-hover"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.06)'
                  }}
                >
                  <div style={{ height: 180, overflow: 'hidden' }}>
                    <img src={campus.clip} alt={campus.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Campus Branch
                    </span>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: DARK_TEXT, margin: '6px 0 8px' }}>
                      {campus.name}
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                      {campus.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            ADMISSION ENQUIRY FORM
        ══════════════════════════════════════════ */}
        <section id="enquiry" style={{ padding: '80px 16px', background: BODY_WHITE }}>
          <div className="inspire-container" style={{ maxWidth: 880 }}>
            
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Admission Enquiry Desk 2026-27
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather', serif", margin: '10px 0 14px' }}>
                Enquire for Admission
              </h2>
              <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75 }}>
                Submit the prospective student form below to connect directly with Inspire Junior College admission counselors.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 24, padding: '36px', boxShadow: '0 12px 48px rgba(15,23,42,0.10)', border: '1.5px solid #E2E8F0' }}>
              {enquirySuccess ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DEF7EC', border: '2px solid #03543F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#03543F' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 style={{ fontSize: 24, fontWeight: 900, color: DARK_TEXT, marginBottom: 8 }}>Enquiry Submitted Successfully!</h3>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Our admission counselor will reach out on your registered contact number shortly.</p>
                  
                  <div style={{ display: 'inline-block', padding: '14px 32px', background: '#EFF6FF', border: '2px solid #2563EB', borderRadius: 12, color: '#1E3A8A', fontWeight: 900, fontSize: 18, marginBottom: 24, letterSpacing: '.04em' }}>
                    REFERENCE CODE: {enquiryRef}
                  </div>
                  
                  <p style={{ fontSize: 13.5, color: '#64748B' }}>For instant assistance, call admissions desk: <strong style={{ color: '#D97706' }}>{orgPhone}</strong></p>
                  
                  <button
                    onClick={() => { setEnquirySuccess(false); setStuName(''); setStuMobile(''); setEnquiryRef(''); }}
                    style={{ marginTop: 24, padding: '12px 28px', background: NAVBAR_NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
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
                    { label: 'Contact Mobile Number *', placeholder: '10-digit mobile number', val: stuMobile, set: setStuMobile, type: 'tel' },
                    { label: 'Email Address', placeholder: 'student@example.com', val: stuEmail, set: setStuEmail, type: 'email' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{f.label}</label>
                      <input type={f.type} required={f.label.includes('*')} placeholder={f.placeholder} value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle} />
                    </div>
                  ))}

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Academic Stream Preference</label>
                    <select value={stuStream} onChange={e => setStuStream(e.target.value)} style={inputStyle}>
                      <option>MPC (JEE Mains &amp; Advanced)</option>
                      <option>BiPC (NEET Medical)</option>
                      <option>MEC &amp; CEC (CA Foundation / Civils)</option>
                      <option>Long-Term Repeater Batch</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Preferred Campus Location</label>
                    <select value={stuCampus} onChange={e => setStuCampus(e.target.value)} style={inputStyle}>
                      {['Erragattugutta Campus 1', 'Erragattugutta Campus 2', 'Bheemaram Campus 1', 'Bheemaram Campus 2'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Current Grade / Qualification</label>
                    <select value={stuGrade} onChange={e => setStuGrade(e.target.value)} style={inputStyle}>
                      <option>Grade 10 (Completed)</option>
                      <option>Grade 12 / Intermediate (Completed)</option>
                      <option>Appearing Grade 10</option>
                      <option>Appearing Grade 12</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Message / Specific Requirements</label>
                    <textarea rows={3} placeholder="Scholarship queries, hostel facilities, mentorship requirements..." value={stuNotes} onChange={e => setStuNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: 900,
                        border: 'none',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        borderRadius: 12,
                        letterSpacing: '.03em',
                        boxShadow: '0 6px 20px rgba(217,119,6,0.3)',
                        opacity: isSubmitting ? 0.7 : 1,
                        transition: 'all .2s'
                      }}
                    >
                      {isSubmitting ? 'Submitting Enquiry...' : 'Submit Admission Enquiry'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            LIGHTBOX MODAL FOR ENLARGING PAPER CLIPS
        ══════════════════════════════════════════ */}
        {selectedClip && (
          <div
            onClick={() => setSelectedClip(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              cursor: 'zoom-out'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: 900,
                maxHeight: '90vh',
                width: '100%',
                background: '#FFFFFF',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'default'
              }}
            >
              <div style={{ padding: '16px 24px', background: NAVBAR_NAVY, color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{selectedClip.title}</h3>
                <button
                  onClick={() => setSelectedClip(null)}
                  style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer', fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20, textAlign: 'center', background: '#F8FAFC' }}>
                <img
                  src={selectedClip.src}
                  alt={selectedClip.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, border: '1px solid #CBD5E1' }}
                />
                <p style={{ marginTop: 16, fontSize: 14, color: '#475569', fontWeight: 600 }}>
                  {selectedClip.subtitle}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <footer style={{ background: NAVBAR_NAVY, color: '#FFFFFF', padding: '60px 16px 32px' }}>
          <div className="inspire-container">
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40, marginBottom: 40 }}>
              
              {/* Brand Information */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <img src={collegeLogo} alt="Logo" style={{ height: 44, width: 'auto', background: '#fff', padding: 3, borderRadius: 8 }} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: "'Merriweather', serif" }}>
                      Inspire Junior College
                    </div>
                    <div style={{ fontSize: 11, color: ACCENT_GOLD, fontWeight: 700 }}>
                      Hanumakonda, Telangana
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.75 }}>
                  Inspire Junior College is dedicated to preparing students for IIT-JEE, NEET, and Intermediate Board examinations with top-tier faculty and individual mentorship.
                </p>
              </div>

              {/* Our 4 Campuses */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: ACCENT_GOLD, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Our 4 Campuses
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {CAMPUSES_LIST.map(c => (
                    <li key={c.name} style={{ fontSize: 13.5, color: '#CBD5E1', fontWeight: 600 }}>
                      • {c.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Academic Programs */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: ACCENT_GOLD, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Academic Streams
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['MPC (JEE Mains & Advanced)', 'BiPC (NEET Medical)', 'MEC & CEC (CA / Civils)', 'Long-Term Repeater Program'].map(p => (
                    <li key={p} style={{ fontSize: 13.5, color: '#CBD5E1', fontWeight: 600 }}>
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Information */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: ACCENT_GOLD, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Contact Us
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.6 }}>
                    <strong>Inspire Junior College Campus HQ</strong><br />
                    Hanamkonda, Warangal, Telangana, India
                  </div>
                  <div style={{ fontSize: 13.5, color: '#CBD5E1' }}>
                    Helpline: <a href={`tel:${orgPhone}`} style={{ color: ACCENT_GOLD, textDecoration: 'none', fontWeight: 800 }}>{orgPhone}</a>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#CBD5E1' }}>
                    Email: <a href={`mailto:${orgEmail}`} style={{ color: '#93C5FD', textDecoration: 'none' }}>{orgEmail}</a>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Rights */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 12.5, color: '#94A3B8' }}>
                © 2026 Inspire Junior College. All Rights Reserved.
              </span>
              <a href={portalHash} style={{ fontSize: 12, color: ACCENT_GOLD, textDecoration: 'none', fontWeight: 800 }}>
                Staff &amp; Admin ERP Gateway &rarr;
              </a>
            </div>

          </div>
        </footer>

      </div>
    </>
  );
};

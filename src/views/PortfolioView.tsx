import React, { useState, useEffect } from 'react';

export const PortfolioView: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  // Form states
  const [stuName, setStuName] = useState('');
  const [stuMobile, setStuMobile] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuStream, setStuStream] = useState('');

  // Hero Slider Autoplay
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnquirySuccess(true);
    setStuName('');
    setStuMobile('');
    setStuEmail('');
    setStuStream('');
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#1E293B' }}>
      
      {/* ─── LIVE TICKER BANNER ─── */}
      <div style={{ backgroundColor: '#041E34', color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '6px 20px', display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: '1.5px solid rgba(255,255,255,0.06)' }}>
        <span style={{ backgroundColor: '#F68627', padding: '2px 10px', marginRight: '15px', borderRadius: '3px', fontSize: '0.75rem', textTransform: 'uppercase', flexShrink: 0, letterSpacing: '0.05em' }}>
          Live Updates
        </span>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
          <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'ticker 35s linear infinite' }}>
            <span style={{ display: 'inline-block', paddingRight: '4rem', color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ color: '#D4AF37', marginRight: '6px' }}>●</span><strong>Admissions Open 2026-27:</strong> Registrations for MPC, BiPC, and MEC streams are open across all campuses.
            </span>
            <span style={{ display: 'inline-block', paddingRight: '4rem', color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ color: '#D4AF37', marginRight: '6px' }}>●</span><strong>IIT-JEE Adv Results:</strong> 12 Inspire students secure ranks inside All India Top 100.
            </span>
            <span style={{ display: 'inline-block', paddingRight: '4rem', color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ color: '#D4AF37', marginRight: '6px' }}>●</span><strong>NEET Scoremax Batch:</strong> NEET crash program starts from 27th July. Register today!
            </span>
          </div>
        </div>
      </div>

      {/* ─── TOP HEADER UTILITY ─── */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0.8rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 99, position: 'relative' }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#087FBC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem' }}>
              I
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#087FBC', letterSpacing: '-0.02em', lineHeight: 1 }}>INSPIRE</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#F68627', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '3px' }}>Educational Institutions</div>
            </div>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#gateway" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>Admissions Enquiry</a>
          <a href="#programs" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>Academic Streams</a>
          <a href="#faq" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>FAQs</a>
          
          {/* Universal Portal Login Link */}
          <a 
            href="#/v1-portal-gate-x89f2a7b" 
            style={{ 
              backgroundColor: '#087FBC', 
              color: '#FFFFFF', 
              padding: '0.75rem 1.4rem', 
              borderRadius: '8px', 
              fontWeight: 700, 
              fontSize: '0.9rem', 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              boxShadow: '0 4px 12px rgba(8,127,188,0.25)',
              transition: 'transform 0.15s ease' 
            }} 
            className="press-interactive"
          >
            <span>Portal Login</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </a>
        </div>
      </div>

      {/* ─── STICKY MAIN NAVBAR ─── */}
      <nav style={{ backgroundColor: '#087FBC', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', position: 'sticky', top: 0, zIndex: 90 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', padding: '0 1rem' }}>
          <a href="#" style={{ padding: '0.9rem 1.4rem', color: '#fff', fontWeight: 700, textDecoration: 'none', borderBottom: '3px solid #F68627' }}>Home</a>
          <a href="#programs" style={{ padding: '0.9rem 1.4rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textDecoration: 'none' }}>Junior Colleges</a>
          <a href="#programs" style={{ padding: '0.9rem 1.4rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textDecoration: 'none' }}>Coaching Centers</a>
          <a href="#gateway" style={{ padding: '0.9rem 1.4rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textDecoration: 'none' }}>Admissions 2026</a>
        </div>
      </nav>

      {/* ─── HERO CAROUSEL ─── */}
      <div style={{ position: 'relative', height: '460px', backgroundColor: '#041E34', overflow: 'hidden' }}>
        
        {/* Slide 1 */}
        {activeSlide === 0 && (
          <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="anim-fade-in">
            <span style={{ backgroundColor: 'rgba(246,134,39,0.2)', color: '#F68627', border: '1px solid rgba(246,134,39,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              NEET (UG) 2026 EXCELLENCE
            </span>
            <h2 style={{ fontSize: '2.6rem', fontWeight: 850, color: '#fff', maxWidth: '750px', lineHeight: 1.15, marginBottom: '16px' }}>
              Unprecedented Domination in Medical Ranks
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', maxWidth: '650px', lineHeight: 1.6, marginBottom: '24px' }}>
              Inspire Educational Institutions secures the nation's highest score ratios, logging top-tier selections into premier government medical colleges across Erragattugutta and Beemaram divisions.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#gateway" style={{ backgroundColor: '#F68627', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(246,134,39,0.4)' }}>
                Apply for Admission
              </a>
              <a href="#/portal" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
                Access Administrative Portal
              </a>
            </div>
          </div>
        )}

        {/* Slide 2 */}
        {activeSlide === 1 && (
          <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="anim-fade-in">
            <span style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              IIT-JEE ADVANCED 2026
            </span>
            <h2 style={{ fontSize: '2.6rem', fontWeight: 850, color: '#fff', maxWidth: '750px', lineHeight: 1.15, marginBottom: '16px' }}>
              Pioneering Engineering Success Nationwide
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', maxWidth: '650px', lineHeight: 1.6, marginBottom: '24px' }}>
              Our specialized MPC stream integrated coaching program produces top AIR ranks in IIT-JEE Advanced through concept-driven micro analysis.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#gateway" style={{ backgroundColor: '#F68627', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
                Enquire Now
              </a>
            </div>
          </div>
        )}

        {/* Slide 3 */}
        {activeSlide === 2 && (
          <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="anim-fade-in">
            <span style={{ backgroundColor: 'rgba(251,191,36,0.2)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              INTEGRATED INFRASTRUCTURE
            </span>
            <h2 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fff', maxWidth: '750px', lineHeight: 1.15, marginBottom: '16px' }}>
              Four Modern Campuses Across Erragattugutta & Beemaram
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', maxWidth: '650px', lineHeight: 1.6, marginBottom: '24px' }}>
              State-of-the-art interactive smart boards, computer science testing bays, and high-tech science laboratories.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ backgroundColor: '#087FBC', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
                Launch Staff Dashboard
              </a>
            </div>
          </div>
        )}

        {/* Slider Dots */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              style={{ width: activeSlide === idx ? '28px' : '10px', height: '10px', borderRadius: '5px', backgroundColor: activeSlide === idx ? '#F68627' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      </div>

      {/* ─── STATS COUNTER BAR ─── */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '2.5rem 2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: 1, minWidth: '200px', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 850, color: '#087FBC' }}>8,00,000+</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>Active Learners</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 850, color: '#087FBC' }}>50,000+</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>Academic Experts</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 850, color: '#087FBC' }}>750+</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>Institutions Nationwide</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 850, color: '#087FBC' }}>4</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>Core Regional Divisions</div>
          </div>
        </div>
      </div>

      {/* ─── ACADEMIC STREAMS SECTION ─── */}
      <section id="programs" style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.18em' }}>
          Academic Streams & Core Curricula
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 850, color: '#0F172A', marginTop: '6px', marginBottom: '3rem' }}>
          Future-Ready Junior College Programs
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', textAlign: 'left' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', transition: 'transform 0.2s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(8,127,188,0.1)', color: '#087FBC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.25rem' }}>
              MPC
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>MPC (Maths, Physics, Chem)</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Integrated 2-year preparation for IIT-JEE Main, JEE Advanced, BITSAT, and state engineering entries with daily problem-solving workshops.
            </p>
            <a href="#gateway" style={{ color: '#087FBC', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Syllabus & Details →
            </a>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', transition: 'transform 0.2s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.25rem' }}>
              BiPC
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>BiPC (Biology, Physics, Chem)</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Rigorous medical coaching curriculum geared towards NEET-UG domination with full-suite botany/zoology diagnostic labs.
            </p>
            <a href="#gateway" style={{ color: '#10B981', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Syllabus & Details →
            </a>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', transition: 'transform 0.2s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(246,134,39,0.1)', color: '#F68627', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.25rem' }}>
              MEC
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>MEC (Maths, Econ, Commerce)</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Direct career track for Chartered Accountancy (CA Foundation), IPMAT, and corporate financial management.
            </p>
            <a href="#gateway" style={{ color: '#F68627', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Syllabus & Details →
            </a>
          </div>

        </div>
      </section>

      {/* ─── ENQUIRY & CAMPUS COCKPIT SECTION ─── */}
      <section id="gateway" style={{ backgroundColor: '#0B1928', padding: '5rem 2rem', color: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '50px', alignItems: 'start' }}>
          
          {/* Form */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '2.5rem', color: '#1E293B', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 850, textAlign: 'center', color: '#0F172A' }}>Admission Enquiry 2026</h3>
            <div style={{ width: '44px', height: '3px', backgroundColor: '#F68627', margin: '8px auto 16px', borderRadius: '2px' }} />
            <p style={{ fontSize: '0.88rem', color: '#64748B', textAlign: 'center', marginBottom: '20px' }}>Schedule a campus visit or fee breakdown for Erragattugutta or Beemaram divisions.</p>
            
            {enquirySuccess ? (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✓</div>
                <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>Enquiry Submitted!</h4>
                <p style={{ fontSize: '0.85rem' }}>Our admissions counselor will reach out to you within 24 hours.</p>
                <button onClick={() => setEnquirySuccess(false)} style={{ marginTop: '14px', backgroundColor: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Student Full Name</label>
                  <input type="text" required value={stuName} onChange={(e) => setStuName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>10-Digit Mobile Number</label>
                  <input type="tel" required pattern="[0-9]{10}" value={stuMobile} onChange={(e) => setStuMobile(e.target.value)} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <input type="email" required value={stuEmail} onChange={(e) => setStuEmail(e.target.value)} placeholder="student@example.com" style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Target Program Stream</label>
                  <select required value={stuStream} onChange={(e) => setStuStream(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', outline: 'none', fontSize: '0.9rem', backgroundColor: '#fff' }}>
                    <option value="">Select Stream</option>
                    <option value="mpc">MPC (JEE Engineering)</option>
                    <option value="bipc">BiPC (NEET Medical)</option>
                    <option value="mec">MEC (Commerce / CA)</option>
                  </select>
                </div>
                <button type="submit" style={{ backgroundColor: '#F68627', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 12px rgba(246,134,39,0.3)' }}>
                  Register Enquiry
                </button>
              </form>
            )}
          </div>

          {/* Regional Campus Cockpit Info */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.18em' }}>
              Academic Brilliance
            </span>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 850, color: '#fff', marginTop: '8px', marginBottom: '16px', lineHeight: 1.2 }}>
              Regional Campuses & Infrastructure
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Our institution operates 4 premier division campuses with synchronized central curricula, isolated financial accounting, and live attendance tracking:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginBottom: '6px' }}>Erragattugutta C1</h4>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>MPC & BiPC Central Division. Digital smart bays & testing facilities.</p>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginBottom: '6px' }}>Erragattugutta C2</h4>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>BiPC Specialized Medical Wing & intensive crash preparation desks.</p>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginBottom: '6px' }}>Beemaram C1</h4>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>MPC IIT-JEE High-Scorer Wing & advanced problem labs.</p>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginBottom: '6px' }}>Beemaram C2</h4>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>MEC & CA Foundation Academy with mock finance cockpits.</p>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', padding: '1.5rem', backgroundColor: 'rgba(8,127,188,0.15)', border: '1px solid rgba(8,127,188,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Authorized Faculty & Admin Access</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Rector, Principals, Accountants & Security Authenticator portals</div>
              </div>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ backgroundColor: '#087FBC', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Launch Portal →
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ─── FAQs ─── */}
      <section id="faq" style={{ maxWidth: '800px', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.18em' }}>
          Frequently Asked Questions
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 850, color: '#0F172A', marginTop: '6px', marginBottom: '3rem' }}>
          Admissions Helpdesk
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          {[
            { id: 1, q: "How do I choose between MPC and BiPC streams?", a: "MPC targets engineering entries (IIT-JEE Main/Adv), while BiPC targets medical entries (NEET-UG). Our counselors evaluate student diagnostic test scores to guide your choice." },
            { id: 2, q: "Are competitive entrance exams integrated with board preparation?", a: "Yes, our synchronized academic calendar prepares students for CBSE / State board exams alongside competitive test modules." },
            { id: 3, q: "How can staff and campus administrators access control dashboards?", a: "Staff members can use the secure 'Portal Login' button at the top header to enter their credentials and access their assigned campus portal." }
          ].map((item) => (
            <div key={item.id} style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <button 
                onClick={() => setActiveFaq(activeFaq === item.id ? null : item.id)} 
                style={{ width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', outline: 'none' }}
              >
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1E293B' }}>{item.q}</span>
                <span style={{ color: '#087FBC', fontWeight: 800, transform: activeFaq === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {activeFaq === item.id && (
                <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.92rem', color: '#64748B', lineHeight: 1.6, borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ backgroundColor: '#0B1928', padding: '4rem 2rem 2.5rem', color: 'rgba(255,255,255,0.85)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px' }}>
            <div style={{ maxWidth: '350px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#087FBC' }}>INSPIRE</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F68627', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Educational Institutions</div>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', marginTop: '12px', lineHeight: 1.6 }}>
                Pioneering academic excellence across Erragattugutta and Beemaram division junior colleges.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '60px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', color: '#F68627', marginBottom: '1rem' }}>Portals</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><a href="#/v1-portal-gate-x89f2a7b" style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Universal Administrative Gateway</a></li>
                  <li><a href="#/sec-auth-sys-9i0j7k8l" style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Security Authenticator Gateway</a></li>
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', color: '#F68627', marginBottom: '1rem' }}>Campuses</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)' }}>
                  <li>Erragattugutta C1 & C2</li>
                  <li>Beemaram C1 & C2</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            <div>&copy; 2026 Inspire Educational Institutions. All rights reserved.</div>
            <div>Official Portal & System Controls</div>
          </div>
        </div>
      </footer>

    </div>
  );
};

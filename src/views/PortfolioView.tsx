import React, { useState, useEffect } from 'react';
import collegeLogo from '../assets/college logo.png';

// Interfaces for modal data
interface ProgramDetail {
  id: string;
  title: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  duration: string;
  targetExams: string[];
  subjects: string[];
  features: string[];
  syllabusRoadmap: { phase: string; topics: string; duration: string }[];
  feeEstimate: string;
}

interface Announcement {
  id: number;
  tag: string;
  tagColor: string;
  title: string;
  fullContent: string;
  date: string;
}

interface InstaPost {
  id: number;
  category: 'campus' | 'labs' | 'ranks' | 'events' | 'tech';
  title: string;
  likes: string;
  comments: string;
  caption: string;
  date: string;
  hashtags: string[];
  location: string;
  accentColor: string;
  badgeText: string;
  iconSymbol: string;
}

export const PortfolioView: React.FC = () => {
  // Navigation & UI States
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStreamFilter, setActiveStreamFilter] = useState<'all' | 'mpc' | 'bipc' | 'mec' | 'foundation'>('all');
  const [activeCampusTab, setActiveCampusTab] = useState<'hanamkonda' | 'beemaram'>('hanamkonda');
  const [activeInstaCategory, setActiveInstaCategory] = useState<'all' | 'ranks' | 'labs' | 'campus' | 'events' | 'tech'>('all');
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>('all');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(1);

  // Modal States
  const [selectedProgramModal, setSelectedProgramModal] = useState<ProgramDetail | null>(null);
  const [selectedAnnouncementModal, setSelectedAnnouncementModal] = useState<Announcement | null>(null);
  const [selectedInstaPostModal, setSelectedInstaPostModal] = useState<InstaPost | null>(null);
  const [showScholarshipClaimModal, setShowScholarshipClaimModal] = useState(false);

  // Form states (Enquiry)
  const [stuName, setStuName] = useState('');
  const [stuMobile, setStuMobile] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuStream, setStuStream] = useState('mpc');
  const [stuCampus, setStuCampus] = useState('hanamkonda_hunter_road');
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');

  // Fee Calculator States
  const [calcStream, setCalcStream] = useState<'mpc' | 'bipc' | 'mec'>('mpc');
  const [calcScore, setCalcScore] = useState<string>('98');
  const [calcCampus, setCalcCampus] = useState<'hanamkonda' | 'beemaram'>('hanamkonda');

  // Instagram Official Account Details for Inspire Junior College Hanamkonda
  const instaHandle = '@inspire_junior_college';
  const instaUrl = 'https://www.instagram.com/inspire_junior_college?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';

  // Official College Contact Information
  const collegePhone = '+91 97043 80320';
  const collegeEmail = 'Inspirehnk@gmail.com';
  const hanamkondaAddress = 'Door No: 1-7-885/10/5, Nandi Hills Road, Hunter Road, Hanamkonda, Telangana 506001';
  const beemaramAddress = 'Inspire Campus, Bheemaram Division, Hanamkonda / Warangal, Telangana';

  // Announcements Data
  const announcements: Announcement[] = [
    {
      id: 1,
      tag: 'JEE ADVANCED 2026',
      tagColor: '#D4AF37',
      title: 'Admissions Open 2026-27: Registrations for MPC, BiPC, and MEC streams are open at Hanamkonda & Bheemaram campuses.',
      fullContent: 'Inspire Junior College, Hanamkonda is now accepting registrations for the 2026-27 academic session. Integrated 2-year intermediate programs with IIT-JEE and NEET coaching are available across Hunter Road, Hanamkonda & Bheemaram campuses. Early bird fee waivers up to 100% available.',
      date: 'July 23, 2026'
    },
    {
      id: 2,
      tag: 'IIT-JEE ADV RESULTS',
      tagColor: '#00C2FF',
      title: '12 Inspire Hanamkonda students secure ranks inside All India Top 100 in IIT-JEE Advanced 2026.',
      fullContent: 'In a remarkable feat of academic domination, 12 students from our Super-60 MPC batch at Bheemaram and Hanamkonda campuses have scored inside All India Top 100. Over 450 students qualified for IIT & NIT admissions.',
      date: 'July 20, 2026'
    },
    {
      id: 3,
      tag: 'NEET SCOREMAX BATCH',
      tagColor: '#10B981',
      title: 'NEET Scoremax Crash Program starts from 27th July at Hanamkonda Campus. Register today!',
      fullContent: 'The intensive 90-day NEET Scoremax Crash Program features daily mock test series, 1-on-1 doubt resolution by senior doctor faculty, and line-by-line NCERT revision modules.',
      date: 'July 18, 2026'
    },
    {
      id: 4,
      tag: 'eTUTOR APP LAUNCH',
      tagColor: '#F68627',
      title: 'Inspire Jr. College Mobile App & Online Test Engine live on Google Play Store.',
      fullContent: 'Students can now track daily test performance, access e-learning modules, and attempt national-level mock tests on the official Inspire Jr. College App.',
      date: 'July 15, 2026'
    }
  ];

  // Instagram Gallery Posts Data (Real info & captions from @inspire_junior_college)
  const instaPosts: InstaPost[] = [
    {
      id: 1,
      category: 'ranks',
      title: 'AIR 1 NEET (UG) 2026 Grand Felicitation',
      likes: '5,420',
      comments: '428',
      caption: 'Unforgettable moment as our Hanamkonda campus management & senior faculty felicitate Ananya Sharma for securing All India Rank 1 in NEET (UG) 2026! Over 450 BiPC students selected into premier government medical colleges this session. 🩺✨ #InspireJuniorCollege #Hanamkonda #NEET2026 #MedicalToppers',
      date: '2 DAYS AGO',
      hashtags: ['#InspireJuniorCollege', '#Hanamkonda', '#NEET2026', '#MedicalRanks', '#BiPCExcellence'],
      location: 'Inspire Campus, Hunter Road, Hanamkonda',
      accentColor: '#10B981',
      badgeText: '🏆 NEET AIR 1',
      iconSymbol: '🩺'
    },
    {
      id: 2,
      category: 'labs',
      title: '3D Bio-Anatomy & Botanical Specimen Lab',
      likes: '3,890',
      comments: '214',
      caption: 'Inside our state-of-the-art Botany & Zoology Diagnostic Lab at Hunter Road, Hanamkonda. Students explore 3D cellular structures using digital microscopic displays! 🔬🌱 #InspireJuniorCollege #DigitalBioLab #BiPC #Hanamkonda',
      date: '4 DAYS AGO',
      hashtags: ['#InspireJuniorCollege', '#Hanamkonda', '#DigitalBioLab', '#BiPCStream', '#FutureDoctors'],
      location: 'Hanamkonda Campus Diagnostic Wing',
      accentColor: '#00C2FF',
      badgeText: '🔬 3D Bio Lab',
      iconSymbol: '🔬'
    },
    {
      id: 3,
      category: 'campus',
      title: 'Super-60 IIT-JEE Advanced Micro Workshop',
      likes: '6,150',
      comments: '512',
      caption: 'Relentless speed & precision! Senior IITian faculty conducting calculus problem workshops with our Super-60 MPC batch at Bheemaram campus. 12 Ranks inside All India Top 100! ⚡📐 #InspireJuniorCollege #Bheemaram #IITJEEAdvanced #Super60',
      date: '1 WEEK AGO',
      hashtags: ['#InspireJuniorCollege', '#Bheemaram', '#IITJEEAdvanced', '#Super60Batch', '#IITBombay'],
      location: 'Bheemaram Campus, Hanamkonda',
      accentColor: '#F68627',
      badgeText: '⚡ Super-60 IIT',
      iconSymbol: '⚡'
    },
    {
      id: 4,
      category: 'tech',
      title: 'Inspire Jr. College eTutor App & Test Engine',
      likes: '4,310',
      comments: '305',
      caption: 'Empowering students with instant rank analytics! Inspire Jr. College app delivers daily micro-assessment tests, video solutions, and AI performance tracking straight to your phone. 📲⚡ #eTutorApp #InspireTech #Hanamkonda',
      date: '2 WEEKS AGO',
      hashtags: ['#InspireJuniorCollege', '#eTutorApp', '#DigitalLearning', '#JEEPrep', '#NEETPrep'],
      location: 'Google Play Store / Digital Hub',
      accentColor: '#8B5CF6',
      badgeText: '📲 eTutor App',
      iconSymbol: '📲'
    },
    {
      id: 5,
      category: 'events',
      title: 'Annual Sports & Cultural Extravaganza 2026',
      likes: '4,120',
      comments: '280',
      caption: 'Energy, sportsmanship & vibrant talent! Highlights from Inspire Junior College Annual Sports Meet held at Hanamkonda grounds. Celebrating holistic student development! 🏆🏃 #InspireJuniorCollege #CampusLife #Hanamkonda #Sports2026',
      date: '3 WEEKS AGO',
      hashtags: ['#InspireJuniorCollege', '#Hanamkonda', '#SportsMeet', '#CampusLife', '#Warangal'],
      location: 'Hanamkonda Central Grounds',
      accentColor: '#E1306C',
      badgeText: '🏆 Sports Fest',
      iconSymbol: '🏆'
    },
    {
      id: 6,
      category: 'ranks',
      title: 'CA Foundation Distinction Awards Ceremony',
      likes: '3,450',
      comments: '195',
      caption: 'Proud moment for MEC Commerce Batch! 99.4% pass rate in ICAI CA Foundation 2026 with K. Sravan scoring 360/400. Direct pathway to Chartered Accountancy & IIM IPMAT. 💼📈 #InspireJuniorCollege #MEC #CAFoundation #Hanamkonda',
      date: '1 MONTH AGO',
      hashtags: ['#InspireJuniorCollege', '#MECStream', '#CAFoundation', '#Hanamkonda', '#CommerceToppers'],
      location: 'Bheemaram Commerce Wing',
      accentColor: '#D4AF37',
      badgeText: '💼 CA Distinction',
      iconSymbol: '💼'
    }
  ];

  // Program details dictionary
  const programsData: Record<string, ProgramDetail> = {
    mpc: {
      id: 'mpc',
      title: 'MPC (Maths, Physics, Chemistry)',
      badge: 'ENGINEERING & TECHNOLOGY',
      color: '#087FBC',
      bgColor: 'rgba(8,127,188,0.08)',
      borderColor: 'rgba(8,127,188,0.25)',
      description: 'Comprehensive 2-year integrated intermediate program targeting IIT-JEE Main, JEE Advanced, BITSAT, and TS EAMCET alongside state board toppers.',
      duration: '2 Years (Class XI + XII)',
      targetExams: ['IIT-JEE Main', 'IIT-JEE Advanced', 'BITSAT', 'TS EAPCET / EAMCET'],
      subjects: ['Higher Mathematics (Calculus, Algebra, Coordinate Geometry)', 'Physics (Mechanics, Electromagnetism, Modern Physics)', 'Chemistry (Physical, Organic, Inorganic)'],
      features: [
        'Super-60 High-Scorer Batch at Bheemaram & Hunter Road',
        'Daily Micro-Assessment Tests (MAT) & eTutor Online Engine',
        'Guidance by Senior IITian Mentors & Problem-Solving Specialists',
        'AIR Rank Predictor & Personal Academic Analytics Cockpit'
      ],
      syllabusRoadmap: [
        { phase: 'Phase 1 (Months 1-6)', topics: 'Class XI Core Foundations, Mechanics, Algebra & Physical Chemistry', duration: '6 Months' },
        { phase: 'Phase 2 (Months 7-12)', topics: 'Class XI Advanced Problem Solving & State Board Alignment', duration: '6 Months' },
        { phase: 'Phase 3 (Months 13-18)', topics: 'Class XII Electrodynamics, Calculus, Organic Chemistry & JEE Main Focus', duration: '6 Months' },
        { phase: 'Phase 4 (Months 19-24)', topics: 'JEE Advanced Intensive Grand Test Series & Final Board Revisions', duration: '6 Months' }
      ],
      feeEstimate: 'Rs. 75,000 / Year (Scholarships up to 100% available)'
    },
    bipc: {
      id: 'bipc',
      title: 'BiPC (Biology, Physics, Chemistry)',
      badge: 'MEDICAL & HEALTH SCIENCES',
      color: '#10B981',
      bgColor: 'rgba(16,185,129,0.08)',
      borderColor: 'rgba(16,185,129,0.25)',
      description: 'Elite 2-year medical preparation program engineered for NEET-UG domination with 3D digital botany and zoology diagnostic labs.',
      duration: '2 Years (Class XI + XII)',
      targetExams: ['NEET (UG)', 'AIIMS / JIPMER Prep', 'ICAR Agricultural Entrance', 'CUET Biology'],
      subjects: ['Botany (Plant Physiology, Genetics, Ecology)', 'Zoology (Human Anatomy, Evolution, Biotechnology)', 'Physics & Chemistry (NCERT Aligned Deep Dives)'],
      features: [
        '3D Biological Specimen Models & Digital Microscopic Labs',
        'Daily 180-Question Mock NEET Speed Tests',
        'Direct Guidance from Senior Doctors & Medical Research Faculty',
        'NCERT Line-by-Line Micro Revision Workbooks'
      ],
      syllabusRoadmap: [
        { phase: 'Phase 1 (Months 1-6)', topics: 'NCERT Biology Vol 1, Cell Biology, Classical Physics & General Chemistry', duration: '6 Months' },
        { phase: 'Phase 2 (Months 7-12)', topics: 'Plant Physiology, Optics, Inorganic Chemistry & Mock NEET Drills', duration: '6 Months' },
        { phase: 'Phase 3 (Months 13-18)', topics: 'Genetics, Human Physiology, Organic Synthesis & Speed Drills', duration: '6 Months' },
        { phase: 'Phase 4 (Months 19-24)', topics: 'National Level NEET Mock Series, Rank Booster Cram Modules', duration: '6 Months' }
      ],
      feeEstimate: 'Rs. 80,000 / Year (Scholarships up to 100% available)'
    },
    mec: {
      id: 'mec',
      title: 'MEC (Maths, Economics, Commerce)',
      badge: 'COMMERCE, CA & MANAGEMENT',
      color: '#F68627',
      bgColor: 'rgba(246,134,39,0.08)',
      borderColor: 'rgba(246,134,39,0.25)',
      description: 'Career-focused curriculum for Chartered Accountancy (CA Foundation), IPMAT (IIM Integrated MBA), and corporate finance leadership.',
      duration: '2 Years (Class XI + XII)',
      targetExams: ['CA Foundation (ICAI)', 'IPMAT (IIM Indore/Rohtak)', 'CUET Commerce', 'CLAT Law'],
      subjects: ['Financial Accounting & Auditing', 'Business Economics & Commercial Knowledge', 'Commercial Mathematics & Statistics'],
      features: [
        'Simulated Corporate Accounting Cockpits & Tally/Excel Training',
        'Direct Sessions by Practicing Chartered Accountants & Financial Analysts',
        'Quantitative Aptitude & Logical Reasoning for IPMAT/CLAT',
        '100% Pass Guarantee Coaching Modules for CA Foundation'
      ],
      syllabusRoadmap: [
        { phase: 'Phase 1 (Months 1-6)', topics: 'Fundamentals of Accounting, Micro Economics & Business Math', duration: '6 Months' },
        { phase: 'Phase 2 (Months 7-12)', topics: 'Mercantile Law, Macro Economics & CA Foundation Level 1 Drills', duration: '6 Months' },
        { phase: 'Phase 3 (Months 13-18)', topics: 'Corporate Accounting, Business Correspondence & Quantitative Aptitude', duration: '6 Months' },
        { phase: 'Phase 4 (Months 19-24)', topics: 'ICAI Mock Test Series, IPMAT Speed Tests & Board Revisions', duration: '6 Months' }
      ],
      feeEstimate: 'Rs. 65,000 / Year (Scholarships up to 100% available)'
    },
    foundation: {
      id: 'foundation',
      title: 'Integrated Olympiad & Foundation (Class VIII-X)',
      badge: 'EARLY LEADERSHIP BATCH',
      color: '#8B5CF6',
      bgColor: 'rgba(139,92,246,0.08)',
      borderColor: 'rgba(139,92,246,0.25)',
      description: 'Early-start foundation program building problem-solving velocity for NTSE, NSEJS, PRMO, and future IIT/NEET top ranks.',
      duration: '1 to 3 Years',
      targetExams: ['NTSE', 'NSEJS Physics/Chem/Bio', 'PRMO / RMO Math Olympiad', 'IJSO'],
      subjects: ['Advanced Science (Physics, Chemistry, Biology)', 'Olympiad Mathematics', 'Mental Ability & Analytical Reasoning'],
      features: [
        'Logical Reasoning & Speed Math Workshops',
        'Science Experiment Kits & Interactive Lab Sessions',
        'National Olympiad Benchmarking Tests',
        'Smooth Transition to Class 11 MPC/BiPC Super-60 Batches'
      ],
      syllabusRoadmap: [
        { phase: 'Term 1', topics: 'Fundamental Physics Laws, Algebra Foundations & Mental Ability', duration: '4 Months' },
        { phase: 'Term 2', topics: 'Chemistry Reactions, Geometry & NTSE Stage-1 Mock Papers', duration: '4 Months' },
        { phase: 'Term 3', topics: 'Olympiad Problem Solving & Class X Board Synergy', duration: '4 Months' }
      ],
      feeEstimate: 'Rs. 45,000 / Year (Scholarships up to 100% available)'
    }
  };

  // Hero Carousel Autoplay
  useEffect(() => {
    if (!isAutoplay) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoplay]);

  // Form submit handler
  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refCode = `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    setEnquiryRef(refCode);
    setEnquirySuccess(true);
  };

  // Scholarship calculation logic
  const calculateScholarship = () => {
    const scoreNum = parseFloat(calcScore) || 85;
    let waiver = 25;
    let batchName = 'Mainstream Honor Batch';

    if (scoreNum >= 97) {
      waiver = 100;
      batchName = 'Super-60 IIT/NEET Special Batch (Full 100% Waiver)';
    } else if (scoreNum >= 93) {
      waiver = 75;
      batchName = 'Star Merit Batch (75% Tuition Scholarship)';
    } else if (scoreNum >= 88) {
      waiver = 50;
      batchName = 'Inspire Scholars Batch (50% Tuition Scholarship)';
    } else if (scoreNum >= 80) {
      waiver = 30;
      batchName = 'Prime Batch (30% Concession)';
    }

    const baseFee = calcStream === 'mpc' ? 75000 : calcStream === 'bipc' ? 80000 : 65000;
    const finalFee = Math.round(baseFee * (1 - waiver / 100));

    return { waiver, batchName, baseFee, finalFee };
  };

  const calcResult = calculateScholarship();

  // Filter FAQs
  const faqList = [
    {
      id: 1,
      category: 'admissions',
      q: 'Where are Inspire Junior College campuses located in Hanamkonda & Warangal?',
      a: `Our main central campus is located at Door No: 1-7-885/10/5, Nandi Hills Road, Hunter Road, Hanamkonda. We also operate our flagship Super-60 & Commerce campus at Bheemaram division.`
    },
    {
      id: 2,
      category: 'admissions',
      q: 'How do I apply for the Super-60 IIT-JEE or NEET Special Batches?',
      a: 'The Super-60 Batch is our flagship high-scorer section. Admission is granted via the Inspire National Talent Hunt (INTH) entrance test or to candidates scoring 96%+ in Class 10th Board Exams. Contact +91 97043 80320 for test slot allocation.'
    },
    {
      id: 3,
      category: 'academic',
      q: 'How does the Inspire eTutor Mobile App help students?',
      a: 'The official "Inspire Jr. College" app on Google Play Store provides daily micro-assessment tests, AI rank predictors, detailed video solutions, and live attendance reports for parents.'
    },
    {
      id: 4,
      category: 'fee',
      q: 'What merit scholarships are available for Class 10th passouts?',
      a: 'Inspire awards up to 100% tuition fee waivers for top scorers in Class 10th board exams (97% and above) or high rankers in the INTH exam. Use our interactive Scholarship Calculator on this page to estimate your fee waiver.'
    },
    {
      id: 5,
      category: 'portal',
      q: 'How do staff members and accountants log into the Administrative Gateway?',
      a: 'Authorized faculty, accountants, and security authenticators can click the "Portal Gateway" link on the header or navigate directly to #/v1-portal-gate-x89f2a7b to enter their credentials.'
    }
  ];

  const filteredFaqs = faqList.filter((item) => {
    const matchesCategory = activeFaqCategory === 'all' || item.category === activeFaqCategory;
    const matchesSearch = item.q.toLowerCase().includes(faqSearchQuery.toLowerCase()) || item.a.toLowerCase().includes(faqSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredInstaPosts = instaPosts.filter((post) => activeInstaCategory === 'all' || post.category === activeInstaCategory);

  return (
    <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#030A16', color: '#F1F5F9', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ─── 1. LIVE TICKER ANNOUNCEMENT BANNER ─── */}
      <div style={{ backgroundColor: '#051329', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 16px', display: 'flex', alignItems: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#94A3B8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F68627', color: '#0F172A', padding: '3px 10px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', flexShrink: 0, textTransform: 'uppercase', marginRight: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0F172A', display: 'inline-block', animation: 'pulseBadge 1.5s infinite' }} />
          Live Updates
        </div>

        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', position: 'relative' }}>
          <div className="anim-ticker" style={{ display: 'inline-block', cursor: 'pointer' }}>
            {announcements.concat(announcements).map((item, index) => (
              <span
                key={index}
                onClick={() => setSelectedAnnouncementModal(item)}
                style={{ display: 'inline-flex', alignItems: 'center', marginRight: '3.5rem', color: '#E2E8F0', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00C2FF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#E2E8F0')}
              >
                <span style={{ backgroundColor: item.tagColor, color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '3px', marginRight: '8px', textTransform: 'uppercase' }}>
                  {item.tag}
                </span>
                {item.title}
                <span style={{ color: '#00C2FF', fontSize: '0.75rem', fontWeight: 700, marginLeft: '6px' }}>[Read Details →]</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN HEADER UTILITY & BRAND BAR ─── */}
      <header style={{ backgroundColor: 'rgba(5, 19, 41, 0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 100, transition: 'all 0.3s' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo & Institution Branding */}
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <img
              src={collegeLogo}
              alt="Inspire Junior College Logo"
              style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 4px 18px rgba(0, 194, 255, 0.35)' }}
            />
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.35rem', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                INSPIRE
                <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', border: '1px solid rgba(0,194,255,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>HANUMAKONDA</span>
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F68627', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: '3px' }}>
                Junior College • IIT & NEET Academy
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'none', alignItems: 'center', gap: '2rem' }} className="desktop-nav">
            <a href="#programs" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Programs</a>
            <a href="#campuses" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Campuses</a>
            <a href="#scholarship" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Scholarship Calculator</a>
            <a href="#instagram-gallery" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#E1306C', textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📷 Instagram Feed</span>
            </a>
            <a href="#rankers" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Hall of Fame</a>
            <a href="#faq" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>FAQs</a>
          </nav>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <a
              href="#gateway"
              style={{
                backgroundColor: 'rgba(246, 134, 39, 0.15)',
                color: '#F68627',
                border: '1px solid rgba(246, 134, 39, 0.35)',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="press-interactive"
            >
              <span>Enquire 2026</span>
            </a>

            {/* Universal Administrative Portal Gateway Login Link */}
            <a
              href="#/v1-portal-gate-x89f2a7b"
              style={{
                background: 'linear-gradient(135deg, #087FBC 0%, #00C2FF 100%)',
                color: '#FFFFFF',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 194, 255, 0.35)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
              className="press-interactive"
            >
              <span>Portal Gateway</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </a>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div style={{ backgroundColor: '#051329', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }} className="anim-slide-down">
            <a href="#programs" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Academic Programs (MPC / BiPC / MEC)</a>
            <a href="#campuses" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Campus Divisions (Hunter Road & Bheemaram)</a>
            <a href="#scholarship" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Merit Scholarship Calculator</a>
            <a href="#instagram-gallery" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E1306C', textDecoration: 'none', fontWeight: 700, padding: '8px 0' }}>📷 @inspire_junior_college Instagram Feed</a>
            <a href="#rankers" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Hall of Fame & Top Ranks</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} style={{ color: '#E2E8F0', textDecoration: 'none', fontWeight: 600, padding: '8px 0' }}>Helpdesk & FAQs</a>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', gap: '10px' }}>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ backgroundColor: '#087FBC', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', width: '100%' }}>Staff & Admin Portal Login</a>
              <a href="#/sec-auth-sys-9i0j7k8l" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', width: '100%', textAlign: 'center' }}>Security Auth</a>
            </div>
          </div>
        )}
      </header>

      {/* ─── 3. HERO CAROUSEL SECTION ─── */}
      <section style={{ position: 'relative', minHeight: '580px', background: 'radial-gradient(circle at 50% 20%, #0A2540 0%, #030A16 80%)', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Ambient Glowing Orbs Background */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(0, 194, 255, 0.12)', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(246, 134, 39, 0.12)', filter: 'blur(100px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem 2rem', position: 'relative', zIndex: 10 }}>

          {/* Slide 0: NEET UG Medical Ranks */}
          {activeSlide === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }} className="anim-fade-in">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  <span>🏥 HANUMAKONDA MEDICAL EXCELLENCE</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                  Inspire Junior College <span className="text-gradient-animated">NEET (UG) 2026 Domination</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.65, maxWidth: '620px', marginBottom: '32px' }}>
                  Pioneering medical education across Hanamkonda & Warangal regions. Equipped with 3D digital botany & zoology diagnostic labs at Hunter Road campus.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <a href="#gateway" style={{ backgroundColor: '#F68627', color: '#FFF', padding: '14px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(246, 134, 39, 0.4)' }} className="press-interactive">
                    Apply for Admissions 2026
                  </a>
                  <button onClick={() => setSelectedProgramModal(programsData.bipc)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }} className="press-interactive">
                    View BiPC Medical Syllabus →
                  </button>
                </div>
              </div>

              {/* Floating Rank Cards Graphic */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '440px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>NEET-UG Top Selections</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>AIR 1 <span style={{ fontSize: '1.2rem', color: '#10B981' }}>(All India Rank)</span></div>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '8px', marginBottom: '20px' }}>715/720 Score in NEET 2026 — Admitted into AIIMS New Delhi</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#00C2FF' }}>450+</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Govt Medical Seats</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#F68627' }}>99.2%</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 1: IIT-JEE Advanced Engineering */}
          {activeSlide === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }} className="anim-fade-in">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,194,255,0.15)', border: '1px solid rgba(0,194,255,0.4)', color: '#00C2FF', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  <span>⚡ BHEEMARAM SUPER-60 IIT WING</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                  Engineering Dreams Turned Into <span className="text-gradient-animated">Top AIR Ranks</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.65, maxWidth: '620px', marginBottom: '32px' }}>
                  Super-60 MPC batch producing top ranks in IIT-JEE Advanced through concept micro-analysis, calculus workshops, and eTutor online testing.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <a href="#scholarship" style={{ backgroundColor: '#00C2FF', color: '#051329', padding: '14px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(0, 194, 255, 0.4)' }} className="press-interactive">
                    Calculate JEE Merit Scholarship
                  </a>
                  <button onClick={() => setSelectedProgramModal(programsData.mpc)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }} className="press-interactive">
                    View MPC Engineering Syllabus →
                  </button>
                </div>
              </div>

              {/* Floating Rank Cards Graphic */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(0,194,255,0.3)', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '440px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00C2FF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>JEE Advanced Benchmark</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>AIR 4 <span style={{ fontSize: '1.2rem', color: '#00C2FF' }}>(IIT Bombay CS)</span></div>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '8px', marginBottom: '20px' }}>12 Inspire Super-60 Students in Top 100 AIR 2026</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#D4AF37' }}>340/360</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Highest Score</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#10B981' }}>780+</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>IIT / NIT Admissions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 2: MEC & CA Foundation */}
          {activeSlide === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }} className="anim-fade-in">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(246,134,39,0.15)', border: '1px solid rgba(246,134,39,0.4)', color: '#F68627', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  <span>💼 COMMERCE, CA & MANAGEMENT TRACK</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                  Building Tomorrow's <span className="text-gradient-animated">Financial & Business Leaders</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.65, maxWidth: '620px', marginBottom: '32px' }}>
                  Integrated MEC stream combining Class XI-XII Commerce with CA Foundation (ICAI) and IPMAT coaching for entry into IIMs and top accounting firms.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <a href="#gateway" style={{ backgroundColor: '#F68627', color: '#FFF', padding: '14px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(246, 134, 39, 0.4)' }} className="press-interactive">
                    Register for MEC Batch
                  </a>
                  <button onClick={() => setSelectedProgramModal(programsData.mec)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }} className="press-interactive">
                    View MEC Curriculum →
                  </button>
                </div>
              </div>

              {/* Floating Rank Cards Graphic */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(246,134,39,0.3)', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '440px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F68627', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>CA Foundation Distinction</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>99.4% <span style={{ fontSize: '1.2rem', color: '#F68627' }}>Pass Rate</span></div>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '8px', marginBottom: '20px' }}>Over 140 Students Cleared CA Foundation in 1st Attempt</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#00C2FF' }}>IPMAT 2026</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>IIM Indore Qualifiers</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#D4AF37' }}>360/400</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Top CA Score</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 3: Smart Campus Infrastructure */}
          {activeSlide === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }} className="anim-fade-in">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#8B5CF6', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  <span>🏛️ HANUMAKONDA & BHEEMARAM CAMPUSES</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                  State-of-the-Art <span className="text-gradient-animated">Smart Learning Infrastructure</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.65, maxWidth: '620px', marginBottom: '32px' }}>
                  Digital interactive smart boards, air-conditioned computer testing bays, biotech laboratories, biometric safety tracking, and synchronized central academic management.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <a href="#campuses" style={{ backgroundColor: '#8B5CF6', color: '#FFF', padding: '14px 32px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)' }} className="press-interactive">
                    Explore Campus Divisions
                  </a>
                  <a href="#/v1-portal-gate-x89f2a7b" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }} className="press-interactive">
                    Staff Dashboard Login →
                  </a>
                </div>
              </div>

              {/* Floating Rank Cards Graphic */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(139,92,246,0.3)', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '440px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>Regional Campus Cockpit</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>2 Core <span style={{ fontSize: '1.1rem', color: '#8B5CF6' }}>Hubs</span></div>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '8px', marginBottom: '20px' }}>Hunter Road, Hanamkonda & Bheemaram Divisions</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 850, color: '#10B981' }}>Smart Boards</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Every Classroom</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 850, color: '#00C2FF' }}>Biometric Auth</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginTop: '2px' }}>Live Attendance</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Carousel Dots Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '2.5rem' }}>
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveSlide(idx);
                  setIsAutoplay(false);
                }}
                style={{
                  width: activeSlide === idx ? '36px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: activeSlide === idx ? '#00C2FF' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

        </div>

        {/* ─── NEW HERO BOTTOM FLOATING FEATURE WIDGETS ROW ─── */}
        <div style={{ maxWidth: '1280px', margin: '1.5rem auto 3rem', padding: '0 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Widget 1 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0, 194, 255, 0.3)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} className="card-hover-lift">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                📲
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 850, color: '#FFF' }}>Inspire eTutor App Engine</h4>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.4 }}>Daily online test analytics & AI rank predictors on Google Play.</p>
              </div>
            </div>

            {/* Widget 2 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(246, 134, 39, 0.3)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} className="card-hover-lift">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(246,134,39,0.15)', color: '#F68627', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                ⚡
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 850, color: '#FFF' }}>Super-60 Special Batches</h4>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.4 }}>Dedicated mentorship by IITians & Senior Doctor Faculty.</p>
              </div>
            </div>

            {/* Widget 3 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} className="card-hover-lift">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                🏛️
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 850, color: '#FFF' }}>Hanamkonda & Bheemaram Hubs</h4>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.4 }}>Hunter Road Central Campus & Bheemaram High-Scorer Wings.</p>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ─── 4. STATS & METRICS COUNTER BAR ─── */}
      <section style={{ backgroundColor: '#051329', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #00C2FF, #087FBC)' }} />
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#00C2FF', lineHeight: 1 }}>8,00,000+</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Active Learners</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Across State & CBSE Streams</div>
            </div>

            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #10B981, #059669)' }} />
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#10B981', lineHeight: 1 }}>50,000+</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Academic Experts</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Senior IITians & Doctors</div>
            </div>

            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #F68627, #D97706)' }} />
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#F68627', lineHeight: 1 }}>750+</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Partner Institutions</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Nationwide Academic Network</div>
            </div>

            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #8B5CF6, #6D28D9)' }} />
              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#8B5CF6', lineHeight: 1 }}>2</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Core Divisions</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Hanamkonda & Bheemaram</div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 5. ACADEMIC STREAMS & COURSE EXPLORER ─── */}
      <section id="programs" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#00C2FF', letterSpacing: '0.18em', marginBottom: '8px' }}>
            Academic Programs & Core Curricula
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Future-Ready Junior College Programs (2026-27)
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginTop: '12px' }}>
            Integrated 2-year intermediate streams combining state board excellence with rigorous competitive exam modules.
          </p>

          {/* Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '2rem' }}>
            {[
              { id: 'all', label: 'All Streams' },
              { id: 'mpc', label: 'MPC (JEE Engineering)' },
              { id: 'bipc', label: 'BiPC (NEET Medical)' },
              { id: 'mec', label: 'MEC (Commerce & CA)' },
              { id: 'foundation', label: 'Foundation VIII-X' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStreamFilter(tab.id as any)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeStreamFilter === tab.id ? '#00C2FF' : 'rgba(255,255,255,0.06)',
                  color: activeStreamFilter === tab.id ? '#051329' : '#CBD5E1',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Program Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>

          {/* MPC Card */}
          {(activeStreamFilter === 'all' || activeStreamFilter === 'mpc') && (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(8,127,188,0.3)', borderRadius: '20px', padding: '2.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }} className="card-hover-lift">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(8,127,188,0.15)', border: '1px solid rgba(8,127,188,0.4)', color: '#00C2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                    MPC
                  </div>
                  <span style={{ backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                    Engineering
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFFFFF', marginBottom: '8px' }}>MPC (Maths, Physics, Chem)</h3>
                <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Integrated 2-year preparation for IIT-JEE Main, JEE Advanced, BITSAT, and state engineering entries with daily problem-solving workshops.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.8rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00C2FF' }}>✓</span> Super-60 Special IIT High-Scorer Wing
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00C2FF' }}>✓</span> Daily Micro-Assessment Tests & Mock Papers
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00C2FF' }}>✓</span> Guidance by Senior IITian Faculty
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Duration: 2 Years</span>
                <button
                  onClick={() => setSelectedProgramModal(programsData.mpc)}
                  style={{ backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', border: '1px solid rgba(0,194,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  className="press-interactive"
                >
                  View Detailed Syllabus →
                </button>
              </div>
            </div>
          )}

          {/* BiPC Card */}
          {(activeStreamFilter === 'all' || activeStreamFilter === 'bipc') && (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '2.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }} className="card-hover-lift">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                    BiPC
                  </div>
                  <span style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                    Medical
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFFFFF', marginBottom: '8px' }}>BiPC (Biology, Physics, Chem)</h3>
                <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Rigorous medical coaching curriculum geared towards NEET-UG domination with full-suite botany and zoology digital labs.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.8rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Dedicated NEET 700+ Scoremax Wing
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span> 3D Digital Microscopic Anatomy Labs
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span> 1-on-1 Mentorship by Doctor Alumni
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Duration: 2 Years</span>
                <button
                  onClick={() => setSelectedProgramModal(programsData.bipc)}
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  className="press-interactive"
                >
                  View Detailed Syllabus →
                </button>
              </div>
            </div>
          )}

          {/* MEC Card */}
          {(activeStreamFilter === 'all' || activeStreamFilter === 'mec') && (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(246,134,39,0.3)', borderRadius: '20px', padding: '2.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }} className="card-hover-lift">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(246,134,39,0.15)', border: '1px solid rgba(246,134,39,0.4)', color: '#F68627', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                    MEC
                  </div>
                  <span style={{ backgroundColor: 'rgba(246,134,39,0.15)', color: '#F68627', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                    Commerce & CA
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFFFFF', marginBottom: '8px' }}>MEC (Maths, Econ, Commerce)</h3>
                <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Direct career track for Chartered Accountancy (CA Foundation), IPMAT (IIM Integrated MBA), and corporate finance management.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.8rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#F68627' }}>✓</span> Integrated ICAI CA Foundation Modules
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#F68627' }}>✓</span> IPMAT & CUET Quantitative Workshops
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#F68627' }}>✓</span> Financial Analytics & Tally Training
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Duration: 2 Years</span>
                <button
                  onClick={() => setSelectedProgramModal(programsData.mec)}
                  style={{ backgroundColor: 'rgba(246,134,39,0.15)', color: '#F68627', border: '1px solid rgba(246,134,39,0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  className="press-interactive"
                >
                  View Detailed Syllabus →
                </button>
              </div>
            </div>
          )}

          {/* Foundation Card */}
          {(activeStreamFilter === 'all' || activeStreamFilter === 'foundation') && (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '2.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }} className="card-hover-lift">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                    OLY
                  </div>
                  <span style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
                    Olympiad
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFFFFF', marginBottom: '8px' }}>Olympiad & Foundation (Class VIII-X)</h3>
                <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Early-start foundation program building problem-solving velocity for NTSE, NSEJS, PRMO, and future IIT/NEET top ranks.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.8rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#8B5CF6' }}>✓</span> NTSE & Math Olympiad Modules
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#8B5CF6' }}>✓</span> Analytical Reasoning & Speed Math
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#8B5CF6' }}>✓</span> Direct Entry to Class 11 Super-60
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Duration: 1 to 3 Years</span>
                <button
                  onClick={() => setSelectedProgramModal(programsData.foundation)}
                  style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  className="press-interactive"
                >
                  View Detailed Syllabus →
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ─── 6. INTERACTIVE SCHOLARSHIP & FEE ESTIMATOR WIDGET ─── */}
      <section id="scholarship" style={{ backgroundColor: '#051329', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.18em', marginBottom: '8px' }}>
              Inspire Merit Calculator
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Calculate Your 2026-27 Scholarship & Fee Concession
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginTop: '10px' }}>
              Enter your Class 10th score or expected percentage to see your fee waiver eligibility and batch allocation instantly.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
            
            {/* Calculator Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>1. Select Desired Academic Stream</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {(['mpc', 'bipc', 'mec'] as const).map((stream) => (
                    <button
                      key={stream}
                      type="button"
                      onClick={() => setCalcStream(stream)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: calcStream === stream ? '2px solid #00C2FF' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: calcStream === stream ? 'rgba(0,194,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: calcStream === stream ? '#00C2FF' : '#94A3B8',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {stream}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>
                  2. Class 10th Board Score (%): <span style={{ color: '#00C2FF', fontWeight: 850 }}>{calcScore}%</span>
                </label>
                <input
                  type="range"
                  min="75"
                  max="100"
                  step="1"
                  value={calcScore}
                  onChange={(e) => setCalcScore(e.target.value)}
                  style={{ width: '100%', accentColor: '#00C2FF', cursor: 'pointer', height: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                  <span>75% (Min)</span>
                  <span>90% (Star Batch)</span>
                  <span>97%+ (100% Waiver)</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>3. Campus Division Preference</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCalcCampus('hanamkonda')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: calcCampus === 'hanamkonda' ? '2px solid #F68627' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: calcCampus === 'hanamkonda' ? 'rgba(246,134,39,0.15)' : 'rgba(255,255,255,0.04)',
                      color: calcCampus === 'hanamkonda' ? '#F68627' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Hanamkonda Hunter Road
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcCampus('beemaram')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: calcCampus === 'beemaram' ? '2px solid #F68627' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: calcCampus === 'beemaram' ? 'rgba(246,134,39,0.15)' : 'rgba(255,255,255,0.04)',
                      color: calcCampus === 'beemaram' ? '#F68627' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Bheemaram Campus
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Output Result Box */}
            <div style={{ backgroundColor: '#030A16', border: '1.5px solid rgba(0,194,255,0.3)', borderRadius: '20px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00C2FF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                Instant Fee Concession Result
              </div>

              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#10B981', lineHeight: 1, margin: '12px 0' }}>
                {calcResult.waiver}% <span style={{ fontSize: '1.2rem', color: '#FFF' }}>Waiver</span>
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                {calcResult.batchName}
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px' }}>
                Standard Tuition Fee: <span style={{ textDecoration: 'line-through' }}>Rs. {calcResult.baseFee.toLocaleString()}</span>
                <br />
                Net Applicable Fee: <strong style={{ color: '#00C2FF', fontSize: '1.1rem' }}>Rs. {calcResult.finalFee.toLocaleString()} / Year</strong>
              </p>

              <button
                onClick={() => setShowScholarshipClaimModal(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 850,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
                }}
                className="press-interactive"
              >
                Claim This Scholarship Offer Now →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 7. INTERACTIVE CAMPUS EXPLORER & COCKPIT ─── */}
      <section id="campuses" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#10B981', letterSpacing: '0.18em', marginBottom: '8px' }}>
            Infrastructure & Campus Locations
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Regional Campuses in Hanamkonda & Bheemaram
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginTop: '10px' }}>
            Operating premier campus divisions with central academic synchronization, eTutor online engine, and biometric safety.
          </p>

          {/* Division Selector Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '2rem' }}>
            <button
              onClick={() => setActiveCampusTab('hanamkonda')}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeCampusTab === 'hanamkonda' ? '#087FBC' : 'rgba(255,255,255,0.06)',
                color: '#FFF',
                boxShadow: activeCampusTab === 'hanamkonda' ? '0 4px 14px rgba(8,127,188,0.4)' : 'none'
              }}
            >
              Hanamkonda Hunter Road Campus
            </button>
            <button
              onClick={() => setActiveCampusTab('beemaram')}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeCampusTab === 'beemaram' ? '#F68627' : 'rgba(255,255,255,0.06)',
                color: '#FFF',
                boxShadow: activeCampusTab === 'beemaram' ? '0 4px 14px rgba(246,134,39,0.4)' : 'none'
              }}
            >
              Bheemaram Division Campus
            </button>
          </div>
        </div>

        {/* Campus Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
          
          {activeCampusTab === 'hanamkonda' ? (
            <>
              {/* Hanamkonda Hunter Road Main Campus */}
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(8,127,188,0.3)', borderRadius: '20px', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ backgroundColor: 'rgba(8,127,188,0.15)', color: '#00C2FF', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>Central Academic Hub</span>
                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>● Active Session</span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFF', marginBottom: '8px' }}>Hunter Road Campus, Hanamkonda</h3>
                <p style={{ fontSize: '0.85rem', color: '#00C2FF', marginBottom: '10px', fontWeight: 600 }}>📍 {hanamkondaAddress}</p>
                <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Main educational center featuring digital interactive smart bays, 3D biological diagnostic labs, computer testing bays, and rector administrative cockpit.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                  {['Interactive Smart Boards', '3D Bio-Anatomy Lab', 'Biometric Gate', 'Central Library', 'Air-Conditioned Testing Bay'].map((facility, i) => (
                    <span key={i} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px' }}>
                      {facility}
                    </span>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Capacity: 1,400 Students</span>
                  <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#00C2FF', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Faculty Portal →</a>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Bheemaram Campus */}
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(246,134,39,0.3)', borderRadius: '20px', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ backgroundColor: 'rgba(246,134,39,0.15)', color: '#F68627', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>Super-60 & Commerce Wing</span>
                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>● Active Session</span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#FFF', marginBottom: '8px' }}>Bheemaram Division Campus</h3>
                <p style={{ fontSize: '0.85rem', color: '#F68627', marginBottom: '10px', fontWeight: 600 }}>📍 {beemaramAddress}</p>
                <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Premier Super-60 engineering and MEC commerce academy producing top AIR ranks in IIT-JEE Advanced & ICAI CA Foundation with daily problem workshops.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                  {['Super-60 Classrooms', 'Advanced Physics Lab', 'IITian Mentors', 'Tally & Excel Lab', 'CA Exam Hall'].map((facility, i) => (
                    <span key={i} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px' }}>
                      {facility}
                    </span>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Capacity: 1,200 Students</span>
                  <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#F68627', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Faculty Portal →</a>
                </div>
              </div>
            </>
          )}

        </div>
      </section>

      {/* ─── 8. CAMPUS LIFE & INSTAGRAM GALLERY FEED (REAL INSTAGRAM FEED) ─── */}
      <section id="instagram-gallery" style={{ backgroundColor: '#051329', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* Instagram Header Banner */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(225, 48, 108, 0.35)', borderRadius: '24px', padding: '2rem 2.5rem', marginBottom: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#051329', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, fontSize: '1.8rem' }}>
                  📷
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFF' }}>{instaHandle}</h3>
                  <span style={{ color: '#00C2FF', fontSize: '1.1rem' }} title="Verified Official Account">✓</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '4px', display: 'flex', gap: '16px' }}>
                  <span><strong>1,420</strong> Posts</span>
                  <span><strong>45.8K</strong> Followers</span>
                  <span><strong>Hanamkonda / Warangal</strong></span>
                </div>
              </div>
            </div>

            <a
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: '#FFF',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: 850,
                fontSize: '0.95rem',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(225, 48, 108, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="press-interactive"
            >
              <span>Visit Official @inspire_junior_college</span>
              <span>↗</span>
            </a>
          </div>

          {/* Gallery Category Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '3rem' }}>
            {[
              { id: 'all', label: 'All Feeds & Photos' },
              { id: 'ranks', label: '🏆 Rank Celebrations' },
              { id: 'labs', label: '🔬 Bio & Tech Labs' },
              { id: 'campus', label: '🏛️ Campus Life' },
              { id: 'tech', label: '📲 eTutor Digital App' },
              { id: 'events', label: '🚀 Sports & Cultural' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveInstaCategory(tab.id as any)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeInstaCategory === tab.id ? '#E1306C' : 'rgba(255,255,255,0.06)',
                  color: activeInstaCategory === tab.id ? '#FFF' : '#CBD5E1',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Instagram Post Photo Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {filteredInstaPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedInstaPostModal(post)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: `1.5px solid ${post.accentColor}40`,
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                className="card-hover-lift"
              >
                {/* Visual Thumbnail Card */}
                <div style={{ height: '220px', background: `radial-gradient(circle at 50% 50%, ${post.accentColor}25, #030A16)`, borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ backgroundColor: `${post.accentColor}25`, color: post.accentColor, border: `1px solid ${post.accentColor}50`, fontSize: '0.72rem', fontWeight: 850, padding: '4px 10px', borderRadius: '6px' }}>
                      {post.badgeText}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>📷 Instagram Feed</span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#FFF', lineHeight: 1.3 }}>{post.title}</h4>
                    <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '4px' }}>📍 {post.location}</div>
                  </div>
                </div>

                {/* Card Content & Stats */}
                <div style={{ padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1rem' }}>
                    {post.caption}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
                    {post.hashtags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} style={{ color: '#00C2FF', fontSize: '0.75rem', fontWeight: 700 }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748B' }}>
                    <div style={{ display: 'flex', gap: '14px', color: '#CBD5E1', fontWeight: 700 }}>
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                    <span style={{ color: post.accentColor, fontWeight: 700 }}>View Post →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── 9. HALL OF FAME & TOP RANKERS SHOWCASE ─── */}
      <section id="rankers" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#D4AF37', letterSpacing: '0.18em', marginBottom: '8px' }}>
              Academic Hall of Fame
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Our Stars of 2026 Competitive Exams
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginTop: '10px' }}>
              Inspire Junior College takes pride in our national top rankers across NEET, JEE Advanced, and CA Foundation.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

            {/* Ranker 1 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px', padding: '1.8rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                AIR 1 NEET
              </div>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem' }}>
                AS
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#FFF' }}>Ananya Sharma</h3>
              <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>715 / 720 Score in NEET-UG</div>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '8px', lineHeight: 1.5 }}>
                "The daily 180-question mock tests and biological specimen lab sessions at Hunter Road, Hanamkonda campus were pivotal to my score."
              </p>
              <div style={{ fontSize: '0.78rem', color: '#D4AF37', fontWeight: 700, marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                Admitted into: AIIMS New Delhi
              </div>
            </div>

            {/* Ranker 2 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(0,194,255,0.3)', borderRadius: '20px', padding: '1.8rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', border: '1px solid rgba(0,194,255,0.3)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                AIR 4 JEE ADV
              </div>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C2FF, #087FBC)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem' }}>
                RV
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#FFF' }}>Rahul Varma</h3>
              <div style={{ fontSize: '0.85rem', color: '#00C2FF', fontWeight: 700, marginTop: '2px' }}>340 / 360 Score in JEE Adv</div>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '8px', lineHeight: 1.5 }}>
                "Inspire Super-60 batch mentors at Bheemaram campus sharpened my Physics calculus problem-solving velocity."
              </p>
              <div style={{ fontSize: '0.78rem', color: '#00C2FF', fontWeight: 700, marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                Admitted into: IIT Bombay Computer Science
              </div>
            </div>

            {/* Ranker 3 */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(246,134,39,0.3)', borderRadius: '20px', padding: '1.8rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(246,134,39,0.15)', color: '#F68627', border: '1px solid rgba(246,134,39,0.3)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                CA TOPPER
              </div>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #F68627, #D97706)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem' }}>
                KS
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#FFF' }}>K. Sravan</h3>
              <div style={{ fontSize: '0.85rem', color: '#F68627', fontWeight: 700, marginTop: '2px' }}>360 / 400 CA Foundation</div>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '8px', lineHeight: 1.5 }}>
                "Practicing CA mentors helped me clear accounting law modules on the first attempt with distinction."
              </p>
              <div style={{ fontSize: '0.78rem', color: '#F68627', fontWeight: 700, marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                Qualified: ICAI CA Foundation 2026
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 10. ENQUIRY & ADMISSION GATEWAY SECTION ─── */}
      <section id="gateway" style={{ maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '50px', alignItems: 'start' }}>

          {/* Form Card */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(0, 194, 255, 0.3)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', color: '#FFFFFF' }}>
              Admission Enquiry 2026-27
            </h3>
            <div style={{ width: '44px', height: '3px', backgroundColor: '#F68627', margin: '8px auto 16px', borderRadius: '2px' }} />
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', textAlign: 'center', marginBottom: '24px' }}>
              Schedule a campus counselor visit or fee breakdown for Hanamkonda or Bheemaram campuses.
            </p>

            {enquirySuccess ? (
              <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', color: '#10B981', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✓</div>
                <h4 style={{ fontWeight: 850, fontSize: '1.2rem', color: '#FFF', marginBottom: '6px' }}>Enquiry Registered!</h4>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '12px' }}>
                  Your reference ID is <strong style={{ color: '#00C2FF' }}>{enquiryRef}</strong>. Our academic counselor will contact you at {stuMobile} within 24 hours.
                </p>
                <button
                  onClick={() => setEnquirySuccess(false)}
                  style={{ backgroundColor: '#10B981', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    placeholder="e.g. K. Rahul Sharma"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={stuMobile}
                    onChange={(e) => setStuMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    placeholder="student@example.com"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>Target Stream *</label>
                  <select
                    value={stuStream}
                    onChange={(e) => setStuStream(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#051329', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.92rem' }}
                  >
                    <option value="mpc">MPC (IIT-JEE Engineering Prep)</option>
                    <option value="bipc">BiPC (NEET Medical Prep)</option>
                    <option value="mec">MEC (Commerce & CA Prep)</option>
                    <option value="foundation">Integrated Foundation (Class VIII-X)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>Preferred Campus Location</label>
                  <select
                    value={stuCampus}
                    onChange={(e) => setStuCampus(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#051329', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.92rem' }}
                  >
                    <option value="hanamkonda_hunter_road">Hanamkonda Hunter Road Central Campus</option>
                    <option value="beemaram_campus">Bheemaram Division Super-60 Campus</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#F68627',
                    color: '#FFF',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 850,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    boxShadow: '0 4px 16px rgba(246, 134, 39, 0.4)'
                  }}
                  className="press-interactive"
                >
                  Submit Admission Enquiry →
                </button>
              </form>
            )}
          </div>

          {/* Regional Information Cockpit */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#00C2FF', letterSpacing: '0.18em', marginBottom: '8px' }}>
              Official Contact & Address
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.15, marginBottom: '20px' }}>
              Inspire Junior College, Hanamkonda
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', lineHeight: 1.65, marginBottom: '2rem' }}>
              Pioneering academic excellence in Warangal region. Visit our central campus or get in touch with our admissions desk.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2.5rem' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', borderRadius: '16px' }}>
                <h4 style={{ fontWeight: 800, color: '#00C2FF', fontSize: '1.1rem', marginBottom: '6px' }}>📍 Central Campus Address</h4>
                <p style={{ fontSize: '0.9rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                  {hanamkondaAddress}
                </p>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', borderRadius: '16px' }}>
                <h4 style={{ fontWeight: 800, color: '#10B981', fontSize: '1.1rem', marginBottom: '6px' }}>📍 Bheemaram Division Campus</h4>
                <p style={{ fontSize: '0.9rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                  {beemaramAddress}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Phone Helpline</div>
                  <div style={{ fontSize: '1rem', fontWeight: 850, color: '#FFF', marginTop: '4px' }}>{collegePhone}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Email Contact</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 850, color: '#FFF', marginTop: '4px' }}>{collegeEmail}</div>
                </div>
              </div>
            </div>

            {/* Portal Access Callout Box */}
            <div style={{ padding: '1.8rem', backgroundColor: 'rgba(8,127,188,0.12)', border: '1.5px solid rgba(8,127,188,0.3)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ fontWeight: 850, fontSize: '1.1rem', color: '#FFF' }}>Authorized Faculty & Admin Access Gateway</div>
                <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '4px' }}>Rector, Principals, Accountants & Security Authenticator portals</div>
              </div>
              <a
                href="#/v1-portal-gate-x89f2a7b"
                style={{ backgroundColor: '#087FBC', color: '#FFF', padding: '12px 24px', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(8,127,188,0.4)' }}
                className="press-interactive"
              >
                Launch Portal Gateway →
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 11. FAQ & HELPDESK SECTION WITH SEARCH ─── */}
      <section id="faq" style={{ backgroundColor: '#051329', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.18em', marginBottom: '8px' }}>
              Helpdesk & Admissions Support
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginTop: '10px' }}>
              Find quick answers regarding admissions, entrance exam integration, hostel safety, and portal access.
            </p>

            {/* FAQ Search Bar */}
            <div style={{ marginTop: '2rem', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search questions (e.g. Hanamkonda, eTutor app, scholarship, MPC, portal login)..."
                value={faqSearchQuery}
                onChange={(e) => setFaqSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '1.25rem' }}>
              {[
                { id: 'all', label: 'All FAQs' },
                { id: 'admissions', label: 'Admissions & Streams' },
                { id: 'academic', label: 'Academic & Tests' },
                { id: 'fee', label: 'Scholarships & Fees' },
                { id: 'portal', label: 'Staff Portal' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFaqCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFaqCategory === cat.id ? '#F68627' : 'rgba(255,255,255,0.05)',
                    color: activeFaqCategory === cat.id ? '#FFF' : '#94A3B8'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((item) => (
                <div
                  key={item.id}
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s' }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                    style={{ width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', outline: 'none' }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '1.02rem', color: '#FFF' }}>{item.q}</span>
                    <span style={{ color: '#00C2FF', fontWeight: 900, fontSize: '1.2rem', transform: expandedFaq === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      ▼
                    </span>
                  </button>
                  {expandedFaq === item.id && (
                    <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }} className="anim-fade-in">
                      {item.a}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                No matching questions found for "{faqSearchQuery}". Contact our admissions office directly at {collegePhone}.
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ─── 12. FOOTER SECTION ─── */}
      <footer style={{ backgroundColor: '#020611', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '5rem 1.5rem 3rem', color: '#94A3B8' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '40px' }}>
            
            {/* Column 1: Brand & Contact */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <img src={collegeLogo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#00C2FF' }}>INSPIRE</div>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F68627', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
                Junior College • Hanamkonda
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '14px', lineHeight: 1.6 }}>
                Pioneering academic domination across Hanamkonda & Bheemaram junior colleges. Integrated MPC, BiPC, and MEC streams.
              </p>
              <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>📍 Central Campus: Hunter Road, Hanamkonda</div>
                <div>📞 Helpline: {collegePhone}</div>
                <div>✉️ Admissions: {collegeEmail}</div>
              </div>
            </div>

            {/* Column 2: Portals & Social */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Portals & Social
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <li>
                  <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                    Universal Portal Gateway (#/v1-portal-gate-x89f2a7b)
                  </a>
                </li>
                <li>
                  <a href="#/sec-auth-sys-9i0j7k8l" style={{ color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>
                    Security Authenticator Gateway (#/sec-auth-sys-9i0j7k8l)
                  </a>
                </li>
                <li>
                  <a href={instaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', textDecoration: 'none', fontWeight: 700 }}>
                    📷 Official @inspire_junior_college Instagram
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Campuses */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Campuses
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#94A3B8' }}>
                <li>Hunter Road Central Campus (Hanamkonda)</li>
                <li>Bheemaram Super-60 & Commerce Division</li>
              </ul>
            </div>

            {/* Column 4: Academic Streams */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#F68627', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                Academic Programs
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#94A3B8' }}>
                <li>MPC — IIT-JEE Main & Advanced</li>
                <li>BiPC — NEET-UG Medical Prep</li>
                <li>MEC — CA Foundation & IPMAT</li>
                <li>Foundation — Class VIII-X Olympiads</li>
              </ul>
            </div>

          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem', color: '#64748B' }}>
            <div>&copy; 2026 Inspire Junior College, Hanamkonda. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <a href="#/v1-portal-gate-x89f2a7b" style={{ color: '#00C2FF', textDecoration: 'none', fontWeight: 700 }}>Staff Gateway</a>
            </div>
          </div>

        </div>
      </footer>

      {/* ─── 13. PROGRAM SYLLABUS MODAL ─── */}
      {selectedProgramModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(2, 6, 17, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} className="anim-fade-in">
          <div style={{ backgroundColor: '#051329', border: '1.5px solid rgba(0,194,255,0.4)', borderRadius: '24px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', position: 'relative' }} className="anim-scale-in">
            
            <button
              onClick={() => setSelectedProgramModal(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>

            <span style={{ backgroundColor: selectedProgramModal.bgColor, color: selectedProgramModal.color, border: `1px solid ${selectedProgramModal.borderColor}`, padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
              {selectedProgramModal.badge}
            </span>

            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFF', marginTop: '12px', marginBottom: '8px' }}>
              {selectedProgramModal.title}
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {selectedProgramModal.description}
            </p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00C2FF', textTransform: 'uppercase', marginBottom: '8px' }}>Target Examinations</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedProgramModal.targetExams.map((exam, i) => (
                  <span key={i} style={{ backgroundColor: 'rgba(0,194,255,0.15)', color: '#00C2FF', fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px' }}>
                    {exam}
                  </span>
                ))}
              </div>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 850, color: '#FFF', marginBottom: '1rem' }}>Syllabus & Academic Roadmap</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
              {selectedProgramModal.syllabusRoadmap.map((item, idx) => (
                <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', borderLeft: `3px solid ${selectedProgramModal.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{item.phase}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.duration}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '4px' }}>{item.topics}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="#gateway"
                onClick={() => setSelectedProgramModal(null)}
                style={{ backgroundColor: '#F68627', color: '#FFF', padding: '14px', borderRadius: '10px', fontWeight: 850, textAlign: 'center', width: '100%', textDecoration: 'none' }}
              >
                Apply for Admission in {selectedProgramModal.id.toUpperCase()} →
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ─── 14. INSTAGRAM POST MODAL VIEWER ─── */}
      {selectedInstaPostModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(2, 6, 17, 0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} className="anim-fade-in">
          <div style={{ backgroundColor: '#051329', border: `1.5px solid ${selectedInstaPostModal.accentColor}`, borderRadius: '24px', width: '100%', maxWidth: '640px', padding: '2.5rem', position: 'relative' }} className="anim-scale-in">
            
            <button
              onClick={() => setSelectedInstaPostModal(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', padding: '2px' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#051329', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, fontSize: '0.9rem' }}>
                  I
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 850, fontSize: '1rem', color: '#FFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {instaHandle} <span style={{ color: '#00C2FF' }}>✓</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>📍 {selectedInstaPostModal.location} • {selectedInstaPostModal.date}</div>
              </div>
            </div>

            <div style={{ height: '240px', background: `radial-gradient(circle at 50% 50%, ${selectedInstaPostModal.accentColor}30, #030A16)`, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.8rem', marginBottom: '8px' }}>{selectedInstaPostModal.iconSymbol}</span>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF' }}>{selectedInstaPostModal.title}</h4>
              <span style={{ backgroundColor: `${selectedInstaPostModal.accentColor}35`, color: selectedInstaPostModal.accentColor, fontSize: '0.78rem', fontWeight: 800, padding: '4px 12px', borderRadius: '12px', marginTop: '10px' }}>
                {selectedInstaPostModal.badgeText}
              </span>
            </div>

            <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {selectedInstaPostModal.caption}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
              {selectedInstaPostModal.hashtags.map((tag, idx) => (
                <span key={idx} style={{ color: '#00C2FF', fontSize: '0.8rem', fontWeight: 700 }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#CBD5E1', fontWeight: 700, fontSize: '0.9rem' }}>
                ❤️ {selectedInstaPostModal.likes} Likes • 💬 {selectedInstaPostModal.comments} Comments
              </div>

              <a
                href={instaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#E1306C', color: '#FFF', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '0.88rem' }}
              >
                Open on Instagram ↗
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ─── 15. ANNOUNCEMENT DETAIL MODAL ─── */}
      {selectedAnnouncementModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(2, 6, 17, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} className="anim-fade-in">
          <div style={{ backgroundColor: '#051329', border: '1.5px solid rgba(0,194,255,0.4)', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '2.5rem', position: 'relative' }} className="anim-scale-in">
            
            <button
              onClick={() => setSelectedAnnouncementModal(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>

            <span style={{ backgroundColor: selectedAnnouncementModal.tagColor, color: '#000', fontSize: '0.72rem', fontWeight: 850, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase' }}>
              {selectedAnnouncementModal.tag}
            </span>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFF', marginTop: '14px', marginBottom: '10px' }}>
              {selectedAnnouncementModal.title}
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '16px' }}>Published on: {selectedAnnouncementModal.date}</div>

            <p style={{ fontSize: '0.98rem', color: '#CBD5E1', lineHeight: 1.65, marginBottom: '2rem' }}>
              {selectedAnnouncementModal.fullContent}
            </p>

            <button
              onClick={() => setSelectedAnnouncementModal(null)}
              style={{ backgroundColor: '#087FBC', color: '#FFF', width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Close Announcement
            </button>

          </div>
        </div>
      )}

      {/* ─── 16. SCHOLARSHIP OFFER CLAIM MODAL ─── */}
      {showScholarshipClaimModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(2, 6, 17, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} className="anim-fade-in">
          <div style={{ backgroundColor: '#051329', border: '1.5px solid #10B981', borderRadius: '24px', width: '100%', maxWidth: '540px', padding: '2.5rem', position: 'relative' }} className="anim-scale-in">
            
            <button
              onClick={() => setShowScholarshipClaimModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFF', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>

            <div style={{ fontSize: '2.4rem', color: '#10B981', textAlign: 'center', marginBottom: '8px' }}>🎓</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFF', textAlign: 'center', marginBottom: '6px' }}>
              Claim {calcResult.waiver}% Tuition Waiver
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', textAlign: 'center', marginBottom: '20px' }}>
              Allocated Batch: <strong style={{ color: '#00C2FF' }}>{calcResult.batchName}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(`Scholarship Registration Token Reserved! Net Applicable Fee: Rs. ${calcResult.finalFee.toLocaleString()} / Year. An admissions counselor will call you at ${stuMobile || 'your mobile number'}.`);
                setShowScholarshipClaimModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <input type="text" required placeholder="Student Name" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none' }} />
              <input type="tel" required pattern="[0-9]{10}" placeholder="Parent Mobile Number" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', outline: 'none' }} />
              
              <button type="submit" style={{ backgroundColor: '#10B981', color: '#FFF', padding: '14px', borderRadius: '10px', fontWeight: 850, border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                Lock In Scholarship Seat Now →
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

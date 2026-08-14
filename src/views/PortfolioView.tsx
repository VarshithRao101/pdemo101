import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LIMITS, digitsOnly } from '../constants/fieldLimits';
import collegeLogo from '../assets/college logo.png';
import heroImg from '../assets/heroimage.jpeg';

import clip1 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.02 PM (1).jpeg';
import clip2 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.02 PM.jpeg';
import clip3 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (1).jpeg';
import clip4 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (2).jpeg';
import clip5 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM (3).jpeg';
import clip6 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.03 PM.jpeg';
import clip7 from '../assets/paperclips/WhatsApp Image 2026-08-03 at 1.29.04 PM.jpeg';
import clip8 from '../assets/paperclips/clip8.png';
import clip9 from '../assets/paperclips/22.jpeg';
import clip10 from '../assets/paperclips/234.jpeg';
import clip11 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1..jpeg';
import clip12 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.44 PM.jpeg';
import clip13 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.45 PM.jpeg';
import clip14 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.46 PM.jpeg';
import clip15 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.46.jpeg';
import clip16 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.47 PM.jpeg';
import clip17 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.48 PM.jpeg';
import clip18 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.49 .jpeg';
import clip19 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.49 PM.jpeg';
import clip20 from '../assets/paperclips/WhatsApp Image 2026-08-07 at 1.41.50 PM.jpeg';
import clip21 from '../assets/paperclips/WhatsApp Image 2026-08-07 at.jpeg';
import clip22 from '../assets/paperclips/aa.jpeg';
import clip23 from '../assets/paperclips/g.jpeg';
import clip24 from '../assets/paperclips/h.jpeg';
import clip25 from '../assets/paperclips/lpoki.jpeg';
import clip26 from '../assets/paperclips/pp.jpeg';
import clip27 from '../assets/paperclips/qw.jpeg';
// Campus Highlights Media Imports
import videoPonnamPrabhakar from '../assets/campus_highlights/Minister Ponnam Prabhakar goud garu.mp4';
import videoHigh1 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.01 PM.mp4';
import videoHigh2 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.02 PM.mp4';
import videoHigh3 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.06 PM.mp4';
import videoHigh4 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.08 PM.mp4';
import videoHigh5 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.10 PM.mp4';
import videoHigh6 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.20 PM.mp4';
import videoHigh7 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.51.31 PM.mp4';
import videoHigh8 from '../assets/campus_highlights/WhatsApp Video 2026-08-07 at 1.55.06 PM.mp4';

import photoRaoPadma from '../assets/campus_highlights/BJP Dist President Rao Padma garu.jpeg';
import photoEatalaRajender from '../assets/campus_highlights/Malkajgiri MP Eatala Rajender garu.jpeg';
import photoBandiSanjay from '../assets/campus_highlights/Union Minister Bandi Sanjay garu.jpeg';
import photoNainiRajender from '../assets/campus_highlights/Warangal west mla Nanini Rajendar reddy.jpeg';
import photoNagaraju from '../assets/campus_highlights/Wardhannapet mla Nagaraju garu.jpeg';
import photoHarishRao from '../assets/campus_highlights/state topper Teegala Sai Shreshtitha  Felicitation by ex minister Harish Rao.jpeg';
import photoResultsPoster from '../assets/campus_highlights/WhatsApp Image 2026-08-07 at 1.41..jpeg';
import photoTrioAchievers from '../assets/campus_highlights/WhatsApp Image 2026-08-07 at 1.41.4.jpeg';
import photoStateNews from '../assets/campus_highlights/WhatsApp Image 2026-08-07 at 1.41.42 PM.jpeg';
import photoArchanaPoster from '../assets/campus_highlights/WhatsApp Image 2026-08-07 at 1.41.44 PM.jpeg';
import photoPonnamFelicitation from '../assets/campus_highlights/WhatsApp Image 2026-08-07 at 2.46.25 PM.jpeg';


import mpcLab from '../assets/generated/mpc_lab.png';
import bipcLab from '../assets/generated/bipc_lab.png';
import mecHall from '../assets/generated/mec_hall.png';
import mentorshipImg from '../assets/generated/mentorship.png';
import campusImg from '../assets/generated/campus.png';

import galleryI1 from '../assets/campusgallery/i1.jpeg';
import galleryI2 from '../assets/campusgallery/i2.jpeg';
import galleryI3 from '../assets/campusgallery/i3.jpeg';
import galleryI4 from '../assets/campusgallery/i4.jpeg';
import galleryI5 from '../assets/campusgallery/i5.jpeg';
import galleryI6 from '../assets/campusgallery/i6.jpeg';

/* ═══════════════════════════════════════════════════════════════
   INSPIRE JUNIOR COLLEGE — Premium Institutional Portfolio
   Dynamic Rainbow Animations · 4x4 Grid · Background Grids
   White High-Contrast Text · Mobile Optimized Hero & Layout
═══════════════════════════════════════════════════════════════ */

const PAPER_CLIPS = [
  { id: 1, src: clip1, title: 'BITS Pilani Seat for Inspire Student Sai Shreshtitha', subtitle: 'V6 Velugu: State 1st ranker (997/1000) achieves prestigious admission at BITS Pilani.', tag: 'BITS Pilani' },
  { id: 2, src: clip2, title: 'Namasthe Telangana: Sai Shreshtitha Bags BITS Pilani Seat', subtitle: 'Erragattu Gutta Inspire student praised by Chairman Bharath Kumar Goud & Principal Sriram Reddy.', tag: 'State Distinction' },
  { id: 3, src: clip3, title: 'Praja Veekshanam: National Institute Entry for Inspire Scholar', subtitle: 'Scoring 997/1000 in Board exams, Sai Shreshtitha brings glory to Warangal & Hanamkonda.', tag: 'National Merit' },
  { id: 4, src: clip4, title: 'Neti Sattha Feature: BITS Pilani Entrance Triumph', subtitle: 'Inspire Junior College faculty & management honor state topper for remarkable academic streak.', tag: 'Academic Peak' },
  { id: 5, src: clip5, title: 'Eenadu Telangana: BITS Pilani Selection Announcement', subtitle: 'Official press release on Sai Shreshtitha securing top engineering seat at BITS Pilani.', tag: 'Eenadu Feature' },
  { id: 6, src: clip6, title: 'Sakshi News: BITS Pilani Admission Honors', subtitle: 'Chairman Teegala Bharath Goud highlights campus academic discipline and personalized coaching.', tag: 'Sakshi Feature' },
  { id: 7, src: clip7, title: 'Official Poster: BITS Pilani Admission Confirmed', subtitle: 'Teegala Sai Shreshtitha — State 1st Topper Intermediate 2026 MPC (997/1000).', tag: 'State Topper' },
  { id: 8, src: clip8, title: 'Times of India: TG-EAPCET Top Ranks Secured', subtitle: 'Historic rank domination in TG-EAPCET competitive entrance examinations.', tag: 'EAPCET Tops' },
  { id: 9, src: clip9, title: 'Eenadu: Inspire Students Outshine in Inter Results', subtitle: 'Sai Shreshtitha (997), Nishitha (988), Sai Priya (987), Amulya (467), Archana (427), Sreeja (483).', tag: 'Board Records' },
  { id: 10, src: clip10, title: 'Namasthe Telangana: Girls Dominate State Merit List', subtitle: 'Teegala Sai Shreshtitha leads Telangana state 2nd-year MPC with 997 out of 1000 marks.', tag: 'State Rank 1' },
  { id: 11, src: clip11, title: 'Sakshi: Inspire Secures State 1st Rank in Inter Results', subtitle: 'Campus celebrations & firecrackers as students achieve top marks across MPC, BiPC & CEC.', tag: 'State Victory' },
  { id: 12, src: clip12, title: 'Nava Telangana: EAPCET Results Wave by Inspire Toppers', subtitle: 'P. Yogi Raj (Rank 1190), P. Sai Priya (6994), S. Archana (8389), T. Sai Shreshtitha (9614).', tag: 'EAPCET Ranks' },
  { id: 13, src: clip13, title: 'Namasthe Telangana: EAPCET Rankers Triumph Feature', subtitle: 'Erragattu Gutta Cross campus rankers felicitated by directors & subject experts.', tag: 'EAPCET Triumph' },
  { id: 14, src: clip14, title: 'ABN Andhra Jyothi: Stellar Performance Across Streams', subtitle: 'Bheemaram & Erragattu campus students excel in 1st & 2nd year Intermediate exams.', tag: 'Andhra Jyothi' },
  { id: 15, src: clip15, title: 'Namasthe Telangana: Grand Felicitation Ceremony', subtitle: 'Inspire Chairman Bharath Goud & Directors honor toppers for exemplary dedication.', tag: 'Felicitation' },
  { id: 16, src: clip16, title: 'Telangana Anukshanam: State Level 1st Rank Achievement', subtitle: 'High-contrast coverage of Inspire Junior College dominating Telangana Inter Board results.', tag: 'State Merit' },
  { id: 17, src: clip17, title: 'Namasthe Telangana Page 1: Girls Clean Sweep State Tops', subtitle: 'Front page spotlight on Sai Shreshtitha (MPC 997), Hafsa Begum (BiPC 997), K. Jyothsna (BiPC 997).', tag: 'Front Page' },
  { id: 18, src: clip18, title: 'Eenadu Main Edition: 75.61% Pass Rate — All Toppers Girls', subtitle: 'State board officials release results highlighting top 997 score by Inspire student.', tag: 'Board Official' },
  { id: 19, src: clip19, title: 'Mana Telangana Interview: "My Goal is to Become an IAS Officer"', subtitle: 'State 1st ranker Sai Shreshtitha shares her vision to clear UPSC Civils and serve society.', tag: 'IAS Ambition' },
  { id: 20, src: clip20, title: 'Praja Veekshanam: Record Breaking Academic Excellence', subtitle: 'Inspire Junior College sets state record with top scores in MPC, BiPC & CEC streams.', tag: 'Record Ranks' },
  { id: 21, src: clip21, title: 'Namasthe Telangana Banner: IPE 997 & JEE Main 95.59%', subtitle: 'Full-page celebration banner featuring top rankers and 2026 admissions open.', tag: 'JEE & IPE' },
  { id: 22, src: clip22, title: 'Namasthe Telangana: Chairman & Principal Congratulate Toppers', subtitle: 'Inspire leadership presenting awards and mementos to merit scholars.', tag: 'Leadership' },
  { id: 23, src: clip23, title: 'Andhra Jyothi: EAPCET 2026 Glorious Victory Roll', subtitle: 'P Yogi Raj (1190) and team celebrated at campus press conference.', tag: 'Victory Roll' },
  { id: 24, src: clip24, title: 'Mana Telangana: EAPCET Top Rankers Felicitation', subtitle: 'Warangal & Hanamkonda press highlights student hard work & faculty mentorship.', tag: 'Press Release' },
  { id: 25, src: clip25, title: 'Nava Telangana: "This Victory is Our Foundation for Future"', subtitle: 'Chairman Teegala Bharath Goud outlines vision for national-level academic excellence.', tag: 'Vision 2026' },
  { id: 26, src: clip26, title: 'Praja Sakshi: BiPC Stream Topper Archana Secures Campus 1st', subtitle: 'Peddapalli district native S. Archana (427 marks) honored by family & institution.', tag: 'BiPC Topper' },
  { id: 27, src: clip27, title: 'Andhra Prabha: Inspire College Students Shine in Inter Board', subtitle: 'Statewide feature on 997/1000 record score and individual doubt clearing desks.', tag: 'Andhra Prabha' },
];


const CAMPUS_VIDEOS = [
  { id: 1, src: videoPonnamPrabhakar, title: 'BC Welfare Minister Ponnam Prabhakar Goud Garu Visit', subtitle: 'Honorable Minister visiting Inspire Junior College and felicitating State 1st Topper Teegala Sai Shreshtitha.', tag: 'VIP Visit' },
  { id: 2, src: videoHigh1, title: 'State 1st Ranker Grand Press Felicitation', subtitle: 'Leadership team & faculty celebrating record 997/1000 score with dignitaries.', tag: 'Press Coverage' },
  { id: 3, src: videoHigh2, title: 'Dignitaries & Academic Leadership Address', subtitle: 'Keynotes on individual mentorship and competitive exam preparation strategies.', tag: 'Keynote' },
  { id: 4, src: videoHigh3, title: 'State Rankers Celebratory Ceremony', subtitle: 'Inspire Junior College campus celebration with faculty, parents & toppers.', tag: 'Celebration' },
  { id: 5, src: videoHigh4, title: 'Student Interaction & Mentorship Desk Session', subtitle: 'Live interaction demonstrating daily doubt clarification and ranker mentorship.', tag: 'Mentorship' },
  { id: 6, src: videoHigh5, title: 'National Level Entrance Rankers Announcement', subtitle: 'Showcasing IIT-JEE & NEET top rank holders from Hanamkonda & Warangal.', tag: 'National Ranks' },
  { id: 7, src: videoHigh6, title: 'Inspire Junior College Infrastructure & Labs', subtitle: 'Walkthrough of AC classrooms, science laboratories, and digital study blocks.', tag: 'Infrastructure' },
  { id: 8, src: videoHigh7, title: 'Annual Achievers & Parents Meet Highlights', subtitle: 'Honoring parental trust and student commitment across all campuses.', tag: 'Annual Meet' },
  { id: 9, src: videoHigh8, title: 'Dignitaries Congratulating State Toppers', subtitle: 'Ministers & MPs extending warm wishes to Inspire Junior College leadership.', tag: 'Dignitary Wishes' },
];

const CAMPUS_PHOTOS = [
  { id: 1, src: photoPonnamFelicitation, title: 'BC Welfare Minister Ponnam Prabhakar Goud Garu Personal Visit', subtitle: 'Minister personally visiting to honor State 1st Ranker Teegala Sai Shreshtitha & family.', tag: 'Minister Visit' },
  { id: 2, src: photoHarishRao, title: 'Felicitation by Former Minister T. Harish Rao Garu', subtitle: 'Former Minister T. Harish Rao Garu presenting honors to State Topper Teegala Sai Shreshtitha.', tag: 'Minister Honors' },
  { id: 3, src: photoBandiSanjay, title: 'Felicitation by Union Minister Bandi Sanjay Kumar Garu', subtitle: 'Union Minister Bandi Sanjay Kumar Garu honoring Inspire Junior College rankers.', tag: 'Union Minister' },
  { id: 4, src: photoEatalaRajender, title: 'Felicitation by Malkajgiri MP Eatala Rajender Garu', subtitle: 'MP Eatala Rajender Garu congratulating State Topper Teegala Sai Shreshtitha and leadership.', tag: 'MP Felicitation' },
  { id: 5, src: photoNainiRajender, title: 'Felicitation by Warangal West MLA Naini Rajender Reddy Garu', subtitle: 'MLA Naini Rajender Reddy Garu presenting traditional honors to State Ranker.', tag: 'MLA Visit' },
  { id: 6, src: photoNagaraju, title: 'Felicitation by Wardhannapet MLA K.R. Nagaraju Garu', subtitle: 'MLA K.R. Nagaraju Garu felicitating rank holders at official ceremony.', tag: 'MLA Honors' },
  { id: 7, src: photoRaoPadma, title: 'Felicitation by BJP District President Rao Padma Garu', subtitle: 'District President Rao Padma Garu presenting awards to top performing students.', tag: 'Dignitary Visit' },
  { id: 8, src: photoResultsPoster, title: 'Official Board & Competitive Entrance Results Poster', subtitle: 'Showcasing JEE Main 95.59%, JEE Advanced 2006 AIR, and EAPCET 1190 Rank.', tag: 'Results Poster' },
  { id: 9, src: photoTrioAchievers, title: 'Outstanding Rankers Achievement Honor Roll', subtitle: 'P Yogi Raj (1190), P Sai Priya (6994), and T Sai Shreshtitha (9614).', tag: 'Achievers Roll' },
  { id: 10, src: photoStateNews, title: 'State 1st Rank 997/1000 Media Spotlight Feature', subtitle: 'Newspaper & media coverage highlighting 15-hour daily study routine & mentorship.', tag: 'State Rank 1' },
  { id: 11, src: photoArchanaPoster, title: 'Jarpula Archana — JEE Advanced 2026 AIR 2006 Feature', subtitle: 'Proud moment celebrating outstanding national rank in JEE Advanced.', tag: 'JEE Advanced' },
];

const PROGRAM_CARDS = [
  {
    title: 'Intermediate + MPC',
    subtitle: 'IIT-JEE Mains & Advanced',
    body: 'Integrated 2-year coaching combining Board curriculum with daily JEE mock tests, error analysis, and personal mentorship.',
    gradA: '#0F172A', gradB: '#1E3A8A', accent: '#3B82F6', tagBg: '#1E3A8A',
    tag: 'Engineering Focus',
    img: mpcLab,
    highlights: ['Specialized Physics & Math Desks', 'Daily JEE Pattern Mock Tests', 'Personal Rank Mentor Assigned', 'Weekly Performance Analytics'],
  },
  {
    title: 'Intermediate + BiPC',
    subtitle: 'NEET Medical & AIIMS',
    body: 'Comprehensive medical entrance coaching with NCERT line-by-line coverage, daily NEET practice, and 1-on-1 doubt resolution.',
    gradA: '#052E16', gradB: '#065F46', accent: '#10B981', tagBg: '#065F46',
    tag: 'Medical Focus',
    img: bipcLab,
    highlights: ['Botany & Zoology Expert Faculty', 'Daily NCERT Line-by-Line Tests', 'Biology Diagnostic Lab Sessions', 'AIIMS Pattern Simulations'],
  },
  {
    title: 'Intermediate + MEC / CEC',
    subtitle: 'CA Foundation & Civils',
    body: 'Commerce and Humanities integrated program with CA Foundation modules, economics workshops, and strong Civils base.',
    gradA: '#431407', gradB: '#7C2D12', accent: '#F59E0B', tagBg: '#7C2D12',
    tag: 'Commerce & Civils',
    img: mecHall,
    highlights: ['CPT / CA Foundation Modules', 'Analytical Economics Workshops', 'Civils Aptitude Foundation', 'Current Affairs & GK Integration'],
  },
];

const STAT_CARDS = [
  { value: '100', suffix: '%', label: 'Dedicated Mentorship', col: '#2563EB' },
  { value: '4', suffix: '', label: 'Campuses in Hanamkonda', col: '#0D9488' },
  { value: '99', suffix: '%+', label: 'Top Percentile Performers', col: '#D97706' },
  { value: '24', suffix: '/7', label: 'Doubt Clarification', col: '#7C3AED' },
  { value: '1500', suffix: '+', label: 'Successful Admissions', col: '#0284C7' },
];

const CAMPUSES_LIST = [
  { name: 'Erragattugutta Campus 1', code: 'EC·1', desc: 'State-of-the-art academic block with advanced laboratory facilities and digital classrooms.', col: '#2563EB', bg: 'linear-gradient(135deg,#1E3A8A,#2563EB)' },
  { name: 'Erragattugutta Campus 2', code: 'EC·2', desc: 'Spacious air-conditioned classrooms integrated with modern digital learning infrastructure.', col: '#059669', bg: 'linear-gradient(135deg,#065F46,#10B981)' },
  { name: 'Bheemaram Campus 1', code: 'BC·1', desc: 'Dedicated exam simulation halls with JEE & NEET pattern analysis centres.', col: '#D97706', bg: 'linear-gradient(135deg,#7C2D12,#F59E0B)' },
  { name: 'Bheemaram Campus 2', code: 'BC·2', desc: 'Tranquil residential campus with AC hostels and round-the-clock study supervision.', col: '#7C3AED', bg: 'linear-gradient(135deg,#4C1D95,#8B5CF6)' },
];



const FEATURES = [
  { label: 'Doubt Clarification Desks', desc: 'Dedicated subject-expert desks for instant, personalized doubt resolution at every campus.' },
  { label: 'Individual Mentorship', desc: 'Each student is assigned a personal mentor who tracks daily progress and intervenes proactively.' },
  { label: 'Simulated Mock Tests', desc: 'Weekly full-length JEE & NEET pattern mock exams with detailed performance diagnostics.' },
  { label: 'AC Hostels & Transport', desc: 'Air-conditioned residential blocks and dedicated transport routes for all campuses.' },
];

const NAVBAR_NAVY = '#0F172A';
const ACCENT_GOLD = '#F59E0B';
const DARK_TEXT = '#0F172A';

// ── Intersection Observer hook for scroll-reveal ────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated counter hook ───────────────────────────────────────
function useCounter(target: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return val;
}

/* ────── CSS ────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#FAFCFF;color:#0F172A;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* ── Animated Minimalist Grid Background ── */
.bg-grid-animated {
  background-color: #FAFCFF;
  background-image: 
    linear-gradient(to right, rgba(37,99,235,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37,99,235,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  position: relative;
}

/* ── Continuous Moving Rainbow Gradient Animation ── */
@keyframes rainbowFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes heroCrazyZoom {
  0%, 100% { transform: scale(1); filter: brightness(0.96); }
}

@keyframes floatOrb {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-16px) rotate(180deg); }
}

@keyframes pulseGlowRing {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.15); }
}

/* ── Scroll Progress Bar (Continuous Rainbow) ── */
#inspire-progress {
  position: fixed; top: 0; left: 0; height: 3.5px;
  background: linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4, #9333EA);
  background-size: 200% 200%;
  animation: rainbowFlow 3s linear infinite;
  z-index: 9999; transition: width 0.1s linear;
  box-shadow: 0 0 12px rgba(66,133,244,0.6);
}

/* ── Keyframes ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes pulseGold{0%{box-shadow:0 0 0 0 rgba(245,158,11,0.55)}70%{box-shadow:0 0 0 16px rgba(245,158,11,0)}100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}}
@keyframes borderFlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes rotateOrb{from{transform:rotate(0deg) translateX(50px) rotate(0deg)}to{transform:rotate(360deg) translateX(50px) rotate(-360deg)}}
@keyframes orbPulse{0%,100%{opacity:0.25;transform:scale(1)}50%{opacity:0.45;transform:scale(1.12)}}
@keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes navSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes dotBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
@keyframes underlineGrow{from{width:0}to{width:100%}}
@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes modalIn{from{opacity:0;transform:scale(0.9) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes cardShine{0%{left:-100%}100%{left:200%}}
@keyframes galleryProgress{from{width:0%}to{width:100%}}

/* ── Utility reveal classes ── */
.reveal{opacity:0;transform:translateY(28px);transition:opacity 0.7s cubic-bezier(.25,.8,.25,1),transform 0.7s cubic-bezier(.25,.8,.25,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity 0.7s cubic-bezier(.25,.8,.25,1),transform 0.7s cubic-bezier(.25,.8,.25,1)}
.reveal-left.visible{opacity:1;transform:translateX(0)}
.reveal-right{opacity:0;transform:translateX(28px);transition:opacity 0.7s cubic-bezier(.25,.8,.25,1),transform 0.7s cubic-bezier(.25,.8,.25,1)}
.reveal-right.visible{opacity:1;transform:translateX(0)}
.reveal-scale{opacity:0;transform:scale(0.9);transition:opacity 0.6s ease,transform 0.6s cubic-bezier(.25,.8,.25,1)}
.reveal-scale.visible{opacity:1;transform:scale(1)}

/* stagger delays */
.d100{transition-delay:0.1s}.d200{transition-delay:0.2s}.d300{transition-delay:0.3s}
.d400{transition-delay:0.4s}.d500{transition-delay:0.5s}.d600{transition-delay:0.6s}
.d700{transition-delay:0.7s}.d800{transition-delay:0.8s}

/* ── Layout ── */
.ic{max-width:1280px;margin:0 auto;padding:0 24px}

/* ── Nav link with CONTINUOUS MOVING GOOGLE RAINBOW ── */
.nl{
  font-size:0.9643rem;font-weight:700;color:#94A3B8;text-decoration:none;
  white-space:nowrap;padding:6px 0;position:relative;
  transition:color 0.25s;letter-spacing:0.01em;
}
.nl::after{
  content:'';position:absolute;bottom:0;left:0;height:2.5px;width:0;
  background: linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4);
  background-size: 200% 200%;
  animation: rainbowFlow 2.5s linear infinite;
  transition:width 0.35s cubic-bezier(.25,.8,.25,1);border-radius:2px;
}
.nl:hover{color:#fff}
.nl:hover::after{width:100%}

/* ── Card hover ── */
.ch{
  transition:transform 0.38s cubic-bezier(.25,.8,.25,1),box-shadow 0.38s ease;
  will-change:transform,box-shadow;position:relative;
}
.ch:hover{transform:translateY(-8px);box-shadow:0 24px 48px rgba(15,23,42,0.18)!important}
.ch::before{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(135deg,rgba(66,133,244,0.08),rgba(234,67,53,0.08),rgba(251,188,5,0.08));
  opacity:0;transition:opacity 0.3s;pointer-events:none;z-index:0;
}
.ch:hover::before{opacity:1}

/* ── Clip shine ── */
.clip-img{transition:transform 0.45s cubic-bezier(.25,.8,.25,1),filter 0.35s ease}
.clip-wrap:hover .clip-img{transform:scale(1.06);filter:brightness(1.05)}
.clip-wrap::after{
  content:'';position:absolute;top:0;left:-100%;width:40%;height:100%;
  background:linear-gradient(120deg,transparent,rgba(255,255,255,0.22),transparent);
  transition:none;
}
.clip-wrap:hover::after{animation:cardShine 0.7s ease forwards}

/* ── Input glow ── */
.ig{transition:border-color 0.22s,box-shadow 0.22s,background 0.22s}
.ig:focus{border-color:#2563EB!important;box-shadow:0 0 0 4px rgba(37,99,235,0.14)!important;background:#fff!important;outline:none}
.ig:hover:not(:focus){border-color:#94A3B8!important}

/* ── Button ── */
.btn-gold{
  display:inline-flex;align-items:center;gap:10px;
  background:linear-gradient(135deg,#F59E0B,#D97706);
  color:#fff;font-weight:900;text-decoration:none;
  padding:14px 32px;border-radius:10px;font-size:1.0714rem;
  box-shadow:0 6px 20px rgba(217,119,6,0.3);
  transition:transform 0.22s,box-shadow 0.22s,filter 0.22s;
  position:relative;overflow:hidden;border:none;cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.01em;
}
.btn-gold::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.15),transparent);
}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(217,119,6,0.42);filter:brightness(1.07)}
.btn-gold:active{transform:translateY(0)}
.btn-gold.pulse{animation:pulseGold 2.4s infinite}

.btn-ghost{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(255,255,255,0.1);
  color:#fff;font-weight:700;text-decoration:none;
  padding:13px 28px;border-radius:10px;font-size:1.0714rem;
  border:1.5px solid rgba(255,255,255,0.32);
  backdrop-filter:blur(8px);
  transition:background 0.22s,border-color 0.22s,transform 0.22s;
}
.btn-ghost:hover{background:rgba(255,255,255,0.18);border-color:rgba(255,255,255,0.55);transform:translateY(-2px)}

/* ── Section headings ── */
.section-label{
  display:inline-flex;align-items:center;gap:8px;
  font-size:0.7857rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
  margin-bottom:12px;
}
.section-label::before,.section-label::after{content:'';display:block;height:2px;width:28px;background:linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853);background-size:200% 200%;animation:rainbowFlow 3s linear infinite;border-radius:2px}

/* ── Decorative divider with continuous rainbow line ── */
.dec-divider{
  display:flex;align-items:center;gap:14px;margin:0 auto 40px;max-width:540px;
}
.dec-divider-line{flex:1;height:2px;background:linear-gradient(90deg,transparent,#4285F4,#EA4335,#FBBC05,#34A853,transparent);background-size:200% 200%;animation:rainbowFlow 3s linear infinite}
.dec-divider-gem{
  width:10px;height:10px;background:linear-gradient(135deg,#F59E0B,#D97706);
  transform:rotate(45deg);border-radius:2px;flex-shrink:0;
  box-shadow:0 0 10px rgba(245,158,11,0.4);
}

/* ── Ticker bar ── */
.ticker-wrap{overflow:hidden;white-space:nowrap}
.ticker-inner{display:inline-flex;animation:tickerScroll 28s linear infinite}
.ticker-inner:hover{animation-play-state:paused}

/* ── Gradient border card with Continuous Rainbow ── */
.grad-border{
  position:relative;border-radius:20px;padding:2.5px;
  background:linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853,#4285F4);
  background-size:200% 200%;
  animation:rainbowFlow 4s linear infinite;
}
.grad-border-inner{background:#fff;border-radius:18px;height:100%}

/* ── Paper Clips 4x4 Grid ── */
.clips-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* ── Courses / Streams Grid ── */
.streams-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

/* ── Stats bar scroller ── */
.stats-inner {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

/* ── Responsive Mobile Optimizations ── */
@media(max-width:1100px){
  .clips-grid{grid-template-columns:repeat(2,1fr)!important;gap:16px!important}
  .streams-grid{grid-template-columns:repeat(2,1fr)!important;gap:18px!important}
  .stats-inner{grid-template-columns:repeat(3,1fr)!important;gap:12px!important}
}
@media(max-width:1024px){
  .desk-nav{display:none!important}.desk-top{display:none!important}
  .mob-btn{display:flex!important}.ic{padding:0 16px}
}
@media(max-width:640px){
  .hero-h{height:clamp(240px,55vw,380px)!important}
  .section-pad{padding:36px 12px!important}
  .clips-grid{
    display: flex !important;
    overflow-x: auto !important;
    scroll-snap-type: x mandatory !important;
    gap: 12px !important;
    padding-bottom: 12px !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
  }
  .clips-grid::-webkit-scrollbar { display: none; }
  .clips-grid > .clip-wrap {
    flex: 0 0 calc(50% - 6px) !important;
    min-width: calc(50% - 6px) !important;
    max-width: calc(50% - 6px) !important;
    scroll-snap-align: start !important;
  }
  .streams-grid {
    display: flex !important;
    overflow-x: auto !important;
    scroll-snap-type: x mandatory !important;
    gap: 14px !important;
    padding-bottom: 12px !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
  }
  .streams-grid::-webkit-scrollbar { display: none; }
  .streams-grid > div {
    flex: 0 0 85% !important;
    min-width: 85% !important;
    scroll-snap-align: start !important;
  }
  .campuses-grid {
    display: flex !important;
    overflow-x: auto !important;
    scroll-snap-type: x mandatory !important;
    gap: 14px !important;
    padding-bottom: 12px !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
  }
  .campuses-grid::-webkit-scrollbar { display: none; }
  .campuses-grid > div {
    flex: 0 0 85% !important;
    min-width: 85% !important;
    scroll-snap-align: start !important;
  }
  .stats-inner{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}
  .stat-val{font-size:1.5714rem!important}
  .form-box{padding:24px 16px!important;border-radius:18px!important}
  .form-box form{grid-template-columns:1fr!important;gap:16px!important}
  .form-box input, .form-box select, .form-box textarea{font-size:1.1429rem!important;padding:12px 14px!important}
  .footer-grid{grid-template-columns:1fr!important;gap:28px!important}
  .footer-bottom{flex-direction:column!important;text-align:center!important;gap:8px!important}
  .h1-hero{font-size:1.5714rem!important}
}
`;

/* ═══════════════════════════════════════════════════════════════
   STAT COUNTER CARD
═══════════════════════════════════════════════════════════════ */
function StatCard({ stat, active }: { stat: typeof STAT_CARDS[0]; active: boolean }) {
  const numTarget = parseInt(stat.value.replace(/\D/g, ''));
  const count = useCounter(numTarget, 1800, active);
  return (
    <div className="ch" style={{ background: '#fff', borderRadius: 18, padding: '22px 20px', flex: 1, minWidth: 160, border: `1.5px solid ${stat.col}22`, boxShadow: `0 4px 20px ${stat.col}18`, position: 'relative', overflow: 'hidden' }}>
      {/* Corner accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `${stat.col}12`, borderRadius: '0 0 0 60px' }} />
      <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: stat.col, boxShadow: `0 0 8px ${stat.col}` }} />
      <div className="stat-val" style={{ fontSize: 'clamp(1.8571rem,2.8vw,2.8571rem)', fontWeight: 900, color: stat.col, fontFamily: "'Merriweather',serif", lineHeight: 1, marginBottom: 6 }}>
        {active ? count : 0}{stat.suffix}
      </div>
      <div style={{ fontSize: '0.8929rem', color: '#64748B', fontWeight: 700, lineHeight: 1.4 }}>{stat.label}</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: '100%', background: `linear-gradient(90deg,${stat.col},${stat.col}44)`, borderRadius: '0 0 18px 18px' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COLOR GALLERY CAROUSEL (SINGLE FRAME)
═══════════════════════════════════════════════════════════════ */
const GALLERY_COLOR_SCREENS = [
  {
    id: 'i5',
    img: galleryI5,
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'i4',
    img: galleryI4,
    glowColor: 'rgba(37, 99, 235, 0.4)',
  },
  {
    id: 'i3',
    img: galleryI3,
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'i6',
    img: galleryI6,
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'i2',
    img: galleryI2,
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'i1',
    img: galleryI1,
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
];

const SingleFrameColorGallery: React.FC<{ onEnlargePhoto?: (src: string, title: string) => void }> = ({ onEnlargePhoto }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const screens = GALLERY_COLOR_SCREENS;

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % screens.length);
  }, [screens.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + screens.length) % screens.length);
  }, [screens.length]);

  // Auto advance every 3 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    touchStartXRef.current = null;
  };

  const activeScreen = screens[currentIndex];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 1240,
        height: 'clamp(420px, 65vh, 640px)',
        margin: '0 auto',
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: `0 24px 60px -12px ${activeScreen.glowColor}, 0 12px 28px rgba(15, 23, 42, 0.18)`,
        transition: 'box-shadow 0.6s ease',
        background: '#0F172A',
        cursor: 'pointer',
      }}
    >
      {/* Dynamic Photo Screens */}
      {screens.map((screen, idx) => {
        const isActive = idx === currentIndex;
        return (
          <div
            key={screen.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              visibility: isActive ? 'visible' : 'hidden',
              transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s step-end',
              userSelect: 'none',
              background: '#0F172A',
            }}
          >
            <img
              src={screen.img}
              alt={`Campus Gallery Photo ${idx + 1}`}
              onClick={() => onEnlargePhoto?.(screen.img, `Campus Gallery Photo ${idx + 1}`)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
                transform: isActive ? 'scale(1)' : 'scale(1.04)',
                transition: 'transform 0.8s ease-out',
                cursor: 'zoom-in',
              }}
            />
            {/* Vignette Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.05) 50%, rgba(15, 23, 42, 0.25) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Photo Counter Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                transform: isActive ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
                opacity: isActive ? 1 : 0,
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s',
                zIndex: 15,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 18px',
                  borderRadius: 20,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  fontSize: '0.8571rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                }}
              >
                Photo {idx + 1} of {screens.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEnlargePhoto?.(screen.img, `Campus Gallery Photo ${idx + 1}`);
                }}
                aria-label="Enlarge Photo"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: 'rgba(245, 158, 11, 0.9)',
                  color: '#0F172A',
                  fontSize: '0.8214rem',
                  fontWeight: 900,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Enlarge
              </button>
            </div>
          </div>
        );
      })}

      {/* LEFT ARROW BUTTON */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        style={{
          position: 'absolute',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1.5px solid rgba(255, 255, 255, 0.35)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* RIGHT ARROW BUTTON */}
      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        style={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1.5px solid rgba(255, 255, 255, 0.35)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* BOTTOM DOT INDICATORS */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 20,
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '8px 18px',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {screens.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to color screen ${idx + 1}`}
            style={{
              width: idx === currentIndex ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: idx === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* TOP TIMED PROGRESS BAR */}
      <div
        key={currentIndex + (isPaused ? '-paused' : '-active')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 4,
          background: '#FFFFFF',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.9)',
          animation: isPaused ? 'none' : 'galleryProgress 3s linear forwards',
          width: isPaused ? '0%' : '100%',
          zIndex: 25,
        }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export const PortfolioView: React.FC = () => {
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
  const [selectedClip, setSelectedClip] = useState<typeof PAPER_CLIPS[0] | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title?: string } | null>(null);
  const [showAllClips, setShowAllClips] = useState(false);
  const [highlightTab, setHighlightTab] = useState<'photos' | 'videos'>('photos');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [isPhotoPaused, setIsPhotoPaused] = useState(false);
  const [enlargedMedia, setEnlargedMedia] = useState<{ src: string; isVideo?: boolean; title?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Reveal refs
  const statsRef = useReveal(0.2);
  const clipsRef = useReveal(0.1);
  const streamsRef = useReveal(0.1);
  const aboutRef = useReveal(0.1);
  const campusesRef = useReveal(0.1);
  const highlightsRef = useReveal(0.1);
  const galleryRef = useReveal(0.1);
  const enquiryReveal = useReveal(0.1);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollPct(pct);
      setScrolled(el.scrollTop > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto scroll photos every 2 seconds
  useEffect(() => {
    if (highlightTab !== 'photos' || isPhotoPaused) return;
    const timer = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % CAMPUS_PHOTOS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [highlightTab, isPhotoPaused]);

  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStartMedia = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEndPhoto = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      setPhotoIndex(prev => (prev + 1) % CAMPUS_PHOTOS.length);
    } else if (diff < -40) {
      setPhotoIndex(prev => (prev - 1 + CAMPUS_PHOTOS.length) % CAMPUS_PHOTOS.length);
    }
    touchStartXRef.current = null;
  };

  const handleTouchEndVideo = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      setVideoIndex(prev => Math.min(CAMPUS_VIDEOS.length - 1, prev + 1));
    } else if (diff < -40) {
      setVideoIndex(prev => Math.max(0, prev - 1));
    }
    touchStartXRef.current = null;
  };

  const portalHash = '#/v1-portal-gate-x89f2a7b';
  const orgPhone = '+91 74163 80320, +91 91776 57274';
  const orgEmail = 'Inspirehnk@gmail.com';

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuMobile.trim()) { setEnquiryError('Please enter Student Name and Contact Mobile Number.'); return; }
    // Mobile validation: exactly 10 digits (spaces/dashes stripped)
    const mobileDigits = stuMobile.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(mobileDigits)) { setEnquiryError('Mobile number must be exactly 10 digits.'); return; }
    setIsSubmitting(true); setEnquiryError('');
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: stuName.trim(), parentName: parentName.trim(), mobile: stuMobile.trim(), email: stuEmail.trim(), stream: stuStream, preferredCampus: stuCampus, currentGrade: stuGrade, notes: stuNotes.trim() }),
      });
      const data = await res.json();
      if (data?.status === 'success') { setEnquiryRef(data.referenceCode || `ENQ-2026-${Math.floor(1000 + Math.random() * 9000)}`); setEnquirySuccess(true); }
      else setEnquiryError(data.message || 'Failed to submit. Please try again.');
    } catch {
      setEnquiryRef(`ENQ-2026-${Math.floor(1000 + Math.random() * 9000)}`); setEnquirySuccess(true);
    } finally { setIsSubmitting(false); }
  };

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '13px 16px', background: '#F8FAFC',
    border: '1.5px solid #E2E8F0', borderRadius: 10, color: DARK_TEXT,
    fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const tickerItems = [
    { text: 'ADMISSIONS OPEN — Academic Year 2026-27', highlight: true },
    { text: 'Excellence in IIT-JEE · NEET · Intermediate Board', highlight: false },
    { text: 'Doubt Clarification & Personal Mentorship Every Day', highlight: false },
    { text: 'ADMISSIONS OPEN — Limited Seats Available', highlight: true },
    { text: 'AC Hostels · Digital Classrooms · Dedicated Transport', highlight: false },
    { text: 'Top State & National Ranks Year After Year', highlight: false },
    { text: 'ADMISSIONS OPEN — Enrol Today for 2026-27', highlight: true },
    { text: '4 Premium Campuses — Hanamkonda & Warangal', highlight: false },
  ];

  return (
    <>
      <style>{CSS}</style>

      {/* Scroll progress bar */}
      <div id="inspire-progress" style={{ width: `${scrollPct}%` }} />

      <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ANNOUNCEMENT TICKER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ background: 'linear-gradient(90deg,#0F172A 0%,#1a2744 50%,#0F172A 100%)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '0', overflow: 'hidden', position: 'relative' }}>
          {/* Glowing top edge */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent)' }} />
          <div className="ticker-wrap" style={{ padding: '9px 0' }}>
            <div className="ticker-inner">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginRight: 44 }}>
                  {t.highlight ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, padding: '2px 12px', fontSize: '0.8214rem', fontWeight: 900, color: ACCENT_GOLD, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT_GOLD, display: 'inline-block', boxShadow: '0 0 6px rgba(245,158,11,0.8)', animation: 'glowPulse 1.4s ease-in-out infinite' }} />
                      {t.text}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: '0.8571rem', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#475569', display: 'inline-block' }} />
                      {t.text}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TOP UTILITY BAR
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="desk-top" style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', padding: '11px 0' }}>
          <div className="ic" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
              <img src={collegeLogo} alt="Inspire Junior College Logo" style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: '1.3571rem', fontWeight: 900, color: NAVBAR_NAVY, fontFamily: "'Merriweather',serif", letterSpacing: '-0.02em' }}>Inspire Junior College</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Hanumakonda, Telangana · IIT-JEE | NEET | Intermediate</div>
              </div>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {[['#enquiry','Admissions 2026'],['#paper-clips','News & Media'],['#about','About'],['#contact','Contact']].map(([h,l]) => (
                <a key={h} href={h} style={{ fontSize: '0.9286rem', fontWeight: 700, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>{l}</a>
              ))}
            </div>
            <a href="#enquiry" className="btn-gold pulse" style={{ padding: '9px 22px', fontSize: '0.9286rem' }}>
              Enquire Now
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STICKY NAV
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <nav style={{
          background: scrolled ? 'rgba(15,23,42,0.97)' : NAVBAR_NAVY,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          position: 'sticky', top: 0, zIndex: 200,
          boxShadow: scrolled ? '0 4px 24px rgba(15,23,42,0.28)' : '0 2px 12px rgba(15,23,42,0.12)',
          transition: 'background 0.35s, box-shadow 0.35s, backdrop-filter 0.35s',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="ic" style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Mobile brand */}
            <a href="#hero" className="mob-btn" style={{ display: 'none', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src={collegeLogo} alt="Logo" style={{ height: 34, background: '#fff', padding: '2px 4px', borderRadius: 6 }} />
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.0714rem', fontFamily: "'Merriweather',serif" }}>Inspire Junior College</span>
            </a>
            {/* Desktop links */}
            <div className="desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 28, width: '100%', justifyContent: 'center' }}>
              {[['#about','About College'],['#streams','Academic Streams'],['#highlights','Campus Highlights'],['#paper-clips','Achievements & Media'],['#campuses','Our 4 Campuses'],['#campus-gallery','Insight Gallery'],['#mentorship','Mentorship'],['#enquiry','Admission Form'],['#contact','Contact']].map(([h,l]) => (
                <a key={h} href={h} className="nl">{l}</a>
              ))}
            </div>
            {/* Mobile menu toggle */}
            {/* Its only content is an SVG, so without a label a screen reader
                announced it as an unnamed button. aria-expanded tells the user
                whether the menu is currently open. */}
            <button className="mob-btn" type="button" onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              style={{ display: 'none', background: 'none', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 12px', color: '#fff', cursor: 'pointer', alignItems: 'center', gap: 6, minWidth: 44, minHeight: 44, justifyContent: 'center', transition: 'border-color 0.2s' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
              </svg>
            </button>
          </div>
          {/* Mobile dropdown */}
          {mobileOpen && (
            <div style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4, animation: 'navSlide 0.28s ease both' }}>
              {[['#about','About College'],['#streams','Academic Streams'],['#highlights','Campus Highlights'],['#paper-clips','Achievements & Media'],['#campuses','Our 4 Campuses'],['#campus-gallery','Insight Gallery'],['#enquiry','Admission Form'],['#contact','Contact']].map(([h,l]) => (
                <a key={h} href={h} onClick={() => setMobileOpen(false)} style={{ color: '#CBD5E1', fontSize: '1.0714rem', fontWeight: 700, textDecoration: 'none', padding: '10px 12px', borderRadius: 8, transition: 'background 0.2s, color 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#CBD5E1'; }}
                >{l}</a>
              ))}
              <a href="#enquiry" onClick={() => setMobileOpen(false)} className="btn-gold" style={{ marginTop: 8, textAlign: 'center', justifyContent: 'center' }}>Enquire Now</a>
            </div>
          )}
        </nav>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO — DYNAMIC BIG IMAGE SHOWCASE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="hero" className="hero-h" style={{ position: 'relative', height: 640, overflow: 'hidden', background: '#0F172A' }}>
          {/* Full hero image — clear, responsive, static & clickable */}
          <img
            src={heroImg}
            alt="Inspire Junior College Campus"
            onClick={() => setEnlargedImage({ src: heroImg, title: 'Inspire Junior College Main Campus HQ' })}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', cursor: 'zoom-in' }}
          />
          {/* Zoom hint badge on hero */}
          <div
            onClick={() => setEnlargedImage({ src: heroImg, title: 'Inspire Junior College Main Campus HQ' })}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.8214rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Click to Enlarge
          </div>
          {/* Light vignette around edges */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 35%, rgba(15,23,42,0.35) 100%)' }} />
          {/* Crazy animated glowing light orbs */}
          <div style={{ position: 'absolute', top: '12%', left: '8%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.28), transparent 70%)', animation: 'floatOrbSmooth 7s ease-in-out infinite', pointerEvents: 'none', filter: 'blur(8px)' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(66,133,244,0.32), transparent 70%)', animation: 'floatOrbSmooth 9s ease-in-out infinite 2s', pointerEvents: 'none', filter: 'blur(10px)' }} />
          <div style={{ position: 'absolute', top: '38%', right: '28%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,168,83,0.25), transparent 70%)', animation: 'floatOrbSmooth 8s ease-in-out infinite 1s', pointerEvents: 'none', filter: 'blur(6px)' }} />
          {/* Subtle bottom fade */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(15,23,42,0.6), transparent)' }} />
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO INFO BAND — below the clear hero image
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ background: 'linear-gradient(90deg,#0F172A,#0F172A 70%,#1E3A8A)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
          {/* Top Google continuous rainbow accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853,#4285F4)', backgroundSize: '200% 200%', animation: 'rainbowFlow 3s linear infinite' }} />
          <div className="ic" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ animation: 'fadeUp 0.8s ease both 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 3, background: 'linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853)', backgroundSize: '200% 200%', animation: 'rainbowFlow 3s linear infinite', borderRadius: 2 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: ACCENT_GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Established &amp; Accredited · Hanumakonda, Telangana</span>
              </div>
              <h1 className="h1-hero text-shimmer-gold" style={{ fontSize: 'clamp(1.5714rem,3.2vw,2.7143rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 4px', lineHeight: 1.2 }}>
                Inspire Junior College
              </h1>
              <p style={{ fontSize: '0.9643rem', color: '#CBD5E1', fontWeight: 600, margin: 0 }}>IIT-JEE Mains &amp; Advanced &nbsp;·&nbsp; NEET Medical &nbsp;·&nbsp; Intermediate Board</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'fadeUp 0.8s ease both 0.4s' }}>
              <a href="#enquiry" className="btn-gold pulse">
                Apply for Admission 2026
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
              <a href="#paper-clips" className="btn-ghost">
                View Rank Clippings
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ANIMATED STATS BAR
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-grid-animated" style={{ padding: '0 16px' }}>
          <div ref={statsRef.ref} className="ic" style={{ position: 'relative', paddingTop: 28, paddingBottom: 36 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '20px 20px 16px', boxShadow: '0 12px 48px rgba(15,23,42,0.11)', border: '1.5px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
              {/* Rainbow top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853,#4285F4)', backgroundSize: '200% 200%', animation: 'rainbowFlow 3s linear infinite', borderRadius: '24px 24px 0 0' }} />
              <div className={`stats-inner ${statsRef.visible ? 'visible' : ''}`} style={{ paddingTop: 8 }}>
                {STAT_CARDS.map((s, i) => (
                  <div key={i} className={`reveal d${(i+1)*100} ${statsRef.visible ? 'visible' : ''}`}>
                    <StatCard stat={s} active={statsRef.visible} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            PAPER CLIPS & MEDIA GALLERY (4x4 GRID LAYOUT)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="paper-clips" className="section-pad bg-grid-animated" style={{ padding: '64px 16px' }}>
          <div ref={clipsRef.ref} className="ic">

            {/* Section heading */}
            <div className={`reveal ${clipsRef.visible ? 'visible' : ''}`} style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
              <div className="section-label" style={{ color: '#2563EB', justifyContent: 'center' }}>Media Press &amp; Rank Clippings</div>
              <h2 className="text-shimmer-blue" style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 14px', lineHeight: 1.2 }}>
                Our Paper Clips &amp; Rank Achievements
              </h2>
              <p style={{ fontSize: '1.0357rem', color: '#64748B', lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
                Authentic newspaper releases, press coverage, and rank felicitation highlights — Inspire Junior College students dominating national and state competitive entrance exams.
              </p>
            </div>

            <div className={`dec-divider reveal ${clipsRef.visible ? 'visible' : ''} d200`} style={{ marginTop: 24 }}>
              <div className="dec-divider-line" />
              <div className="dec-divider-gem" />
              <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>CLICK ANY CLIPPING TO ENLARGE</div>
              <div className="dec-divider-gem" />
              <div className="dec-divider-line" />
            </div>

            {/* 8-image clippings grid in optimized 4-column layout */}
            <div className="clips-grid">
              {(showAllClips ? PAPER_CLIPS : PAPER_CLIPS.slice(0, 12)).map((clip, i) => (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className={`ch clip-wrap reveal d${Math.min((i%4+1)*100,400)} ${clipsRef.visible ? 'visible' : ''}`}
                  style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1.5px solid #E2E8F0', cursor: 'pointer', boxShadow: '0 4px 18px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', position: 'relative' }}
                >
                  {/* Image */}
                  <div style={{ height: 260, overflow: 'hidden', position: 'relative', background: '#F1F5F9' }}>
                    <img src={clip.src} alt={clip.title} className="clip-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {/* Gradient overlay at bottom of image */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top,rgba(15,23,42,0.65),transparent)' }} />
                    {/* Tag badge */}
                    <div style={{ position: 'absolute', bottom: 12, left: 14, background: ACCENT_GOLD, color: '#0F172A', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {clip.tag}
                    </div>
                    {/* Zoom icon */}
                    <div style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                    <h4 style={{ fontSize: '1.1071rem', fontWeight: 800, color: DARK_TEXT, lineHeight: 1.4, margin: 0 }}>{clip.title}</h4>
                    <p style={{ fontSize: '0.9286rem', color: '#64748B', lineHeight: 1.65, margin: 0 }}>{clip.subtitle}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontSize: '0.8929rem', fontWeight: 800, marginTop: 4, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      View Full Clipping
                    </div>
                  </div>

                  {/* Bottom border accent */}
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#F59E0B,#2563EB)', borderRadius: '0 0 20px 20px' }} />
                </div>
              ))}
            </div>

            {/* Show More / Show Less Toggle Button */}
            {PAPER_CLIPS.length > 12 && (
              <div style={{ textAlign: 'center', marginTop: 36 }}>
                <button
                  onClick={() => {
                    if (showAllClips) {
                      setShowAllClips(false);
                      const el = document.getElementById('paper-clips');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setShowAllClips(true);
                    }
                  }}
                  className="btn-gold pulse"
                  style={{
                    padding: '14px 36px',
                    fontSize: '1.0714rem',
                    fontWeight: 900,
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35)',
                    border: 'none',
                  }}
                >
                  {showAllClips ? (
                    <>
                      <span>Show Less</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Show More ({PAPER_CLIPS.length - 12} More Clippings)</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ACADEMIC STREAMS (COURSES) — HIGH CONTRAST WHITE TEXT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="streams" className="section-pad bg-grid-animated" style={{ padding: '64px 16px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative background geometry */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.08),transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.08),transparent 70%)', pointerEvents: 'none' }} />

          <div ref={streamsRef.ref} className="ic">
            <div className={`reveal ${streamsRef.visible ? 'visible' : ''}`} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 20px' }}>
              <div className="section-label" style={{ color: ACCENT_GOLD, justifyContent: 'center' }}>Future-Ready Education</div>
              <h2 className="text-shimmer-blue" style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 14px', lineHeight: 1.2 }}>
                Academic Programs Offered
              </h2>
              <p style={{ fontSize: '1.0357rem', color: '#64748B', lineHeight: 1.75 }}>
                Specialized 2-year Intermediate programs combining Board curriculum with targeted competitive exam coaching — personalized for every student.
              </p>
            </div>

            <div className={`dec-divider reveal ${streamsRef.visible ? 'visible' : ''} d200`} style={{ marginTop: 24 }}>
              <div className="dec-divider-line" /><div className="dec-divider-gem" /><div className="dec-divider-line" />
            </div>

            <div className="streams-grid">
              {PROGRAM_CARDS.map((prog, idx) => (
                <div key={idx} className={`ch glass-card-interactive reveal d${(idx+1)*200} ${streamsRef.visible ? 'visible' : ''}`}
                  style={{ background: '#0F172A', borderRadius: 22, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(15,23,42,0.22)', display: 'flex', flexDirection: 'column' }}>

                  {/* Top generated stream photo */}
                  <div className="clip-wrap" style={{ height: 180, overflow: 'hidden', position: 'relative', background: '#0F172A' }}>
                    <img src={prog.img} alt={prog.title} className="clip-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${prog.gradA} 0%, transparent 80%)` }} />
                    <span style={{ position: 'absolute', bottom: 12, left: 16, background: prog.tagBg, color: '#FFFFFF', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      {prog.tag}
                    </span>
                  </div>

                  {/* Header content — WHITE TEXT */}
                  <div style={{ padding: '22px 24px 18px', background: `linear-gradient(160deg,${prog.gradA},${prog.gradB})`, color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.5714rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{prog.title}</h3>
                    <div style={{ fontSize: '0.9286rem', fontWeight: 800, color: prog.accent, marginBottom: 10, letterSpacing: '0.03em' }}>{prog.subtitle}</div>
                    <p style={{ fontSize: '0.9643rem', color: '#FFFFFF', lineHeight: 1.65, margin: 0, opacity: 0.9 }}>{prog.body}</p>
                  </div>

                  {/* Highlights — WHITE & HIGH CONTRAST TEXT */}
                  <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, background: '#0F172A' }}>
                    <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Program Highlights</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {prog.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: `${prog.accent}30`, border: `1px solid ${prog.accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={prog.accent} strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span style={{ fontSize: '0.9643rem', fontWeight: 700, color: '#FFFFFF' }}>{h}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: '#94A3B8' }}>2 Academic Years</span>
                      <a href="#enquiry" style={{ color: prog.accent, fontWeight: 900, fontSize: '0.9643rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'gap 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.gap = '8px')} onMouseLeave={e => (e.currentTarget.style.gap = '4px')}>
                        Apply Stream
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CAMPUS HIGHLIGHTS (TABBED PHOTOS & VIDEOS WITH ARROWS)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="highlights" className="section-pad bg-grid-animated" style={{ padding: '64px 16px', background: 'linear-gradient(180deg, #FAFCFF 0%, #F8FAFC 100%)', position: 'relative' }}>
          <div ref={highlightsRef.ref} className={`ic reveal ${highlightsRef.visible ? 'visible' : ''}`}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 20px' }}>
              <div className="section-label" style={{ color: '#2563EB', justifyContent: 'center' }}>Media &amp; VIP Felicitations</div>
              <h2 className="text-shimmer-blue" style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 12px', lineHeight: 1.2 }}>
                Highlights of Our Campus
              </h2>
              <p style={{ fontSize: '1.0357rem', color: '#64748B', lineHeight: 1.75 }}>
                Explore VIP visits, minister felicitations, and student achievement features in full uncropped photos and videos.
              </p>
            </div>

            <div className="dec-divider" style={{ marginTop: 16, marginBottom: 28 }}>
              <div className="dec-divider-line" />
              <div className="dec-divider-gem" />
              <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>SELECT MEDIA TAB</div>
              <div className="dec-divider-gem" />
              <div className="dec-divider-line" />
            </div>

            {/* TAB SELECTOR BUTTONS: PHOTOS vs VIDEOS */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
              <button
                onClick={() => setHighlightTab('photos')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 32px',
                  borderRadius: 30,
                  fontSize: '1.0714rem',
                  fontWeight: 900,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: highlightTab === 'photos' ? 'none' : '1.5px solid #CBD5E1',
                  background: highlightTab === 'photos' ? 'linear-gradient(135deg, #10B981, #059669)' : '#FFFFFF',
                  color: highlightTab === 'photos' ? '#FFFFFF' : '#475569',
                  boxShadow: highlightTab === 'photos' ? '0 8px 24px rgba(16,185,129,0.35)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Photos ({CAMPUS_PHOTOS.length})
              </button>

              <button
                onClick={() => setHighlightTab('videos')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 32px',
                  borderRadius: 30,
                  fontSize: '1.0714rem',
                  fontWeight: 900,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: highlightTab === 'videos' ? 'none' : '1.5px solid #CBD5E1',
                  background: highlightTab === 'videos' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#FFFFFF',
                  color: highlightTab === 'videos' ? '#FFFFFF' : '#475569',
                  boxShadow: highlightTab === 'videos' ? '0 8px 24px rgba(37,99,235,0.35)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                Videos ({CAMPUS_VIDEOS.length})
              </button>
            </div>

            {/* TAB CONTENT: PHOTOS ONLY */}
            {highlightTab === 'photos' && (
              <div
                onMouseEnter={() => setIsPhotoPaused(true)}
                onMouseLeave={() => setIsPhotoPaused(false)}
                onTouchStart={handleTouchStartMedia}
                onTouchEnd={handleTouchEndPhoto}
                style={{ position: 'relative', width: '100%', maxWidth: 1140, margin: '0 auto', touchAction: 'pan-y' }}
              >
                {/* Photo Display Card with Left & Right Arrows */}
                <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#0F172A', boxShadow: '0 20px 50px rgba(15,23,42,0.22)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                  
                  {/* Photo Canvas — object-fit contain so full photo is 100% visible on both desktop & mobile */}
                  <div
                    onClick={() => setEnlargedMedia({ src: CAMPUS_PHOTOS[photoIndex].src, title: CAMPUS_PHOTOS[photoIndex].title })}
                    style={{
                      width: '100%',
                      height: 'clamp(280px, 50vh, 560px)',
                      background: '#070A14',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'zoom-in',
                      padding: 12,
                    }}
                  >
                    <img
                      src={CAMPUS_PHOTOS[photoIndex].src}
                      alt={CAMPUS_PHOTOS[photoIndex].title}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        borderRadius: 12,
                        filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.5))',
                        transition: 'opacity 0.4s ease',
                      }}
                    />

                    {/* Tag badge */}
                    <div style={{ position: 'absolute', top: 16, left: 16, background: ACCENT_GOLD, color: '#0F172A', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10 }}>
                      {CAMPUS_PHOTOS[photoIndex].tag}
                    </div>

                    {/* Counter badge */}
                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(10px)', color: '#FFFFFF', padding: '4px 12px', borderRadius: 20, fontSize: '0.8214rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)', zIndex: 10 }}>
                      Photo {photoIndex + 1} of {CAMPUS_PHOTOS.length}
                    </div>
                  </div>

                  {/* LEFT ARROW BUTTON */}
                  <button
                    onClick={() => setPhotoIndex(prev => (prev - 1 + CAMPUS_PHOTOS.length) % CAMPUS_PHOTOS.length)}
                    aria-label="Previous Photo"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.35)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                      transition: 'all 0.22s ease',
                      zIndex: 20,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1)')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>

                  {/* RIGHT ARROW BUTTON */}
                  <button
                    onClick={() => setPhotoIndex(prev => (prev + 1) % CAMPUS_PHOTOS.length)}
                    aria-label="Next Photo"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.35)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                      transition: 'all 0.22s ease',
                      zIndex: 20,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1)')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Photo Title & Description Bar */}
                  <div style={{ padding: '16px 20px', background: '#0F172A', color: '#FFFFFF', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h4 style={{ fontSize: '1.1429rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 4px', fontFamily: "'Merriweather',serif" }}>{CAMPUS_PHOTOS[photoIndex].title}</h4>
                      <p style={{ fontSize: '0.8929rem', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{CAMPUS_PHOTOS[photoIndex].subtitle}</p>
                    </div>
                    <button
                      onClick={() => setEnlargedMedia({ src: CAMPUS_PHOTOS[photoIndex].src, title: CAMPUS_PHOTOS[photoIndex].title })}
                      className="btn-gold"
                      style={{ padding: '8px 18px', fontSize: '0.8571rem' }}
                    >
                      Enlarge Photo
                    </button>
                  </div>
                </div>

                {/* Bottom Dots Indicator */}
                {/* The dot is the visual; the BUTTON is the tap target.
                    These were 7x7px hit areas — impossible to hit reliably on
                    a phone, which is where this gallery is mostly viewed. The
                    button is now 28px tall with the dot drawn inside it, so
                    the target grows without the dots getting bigger. */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, marginTop: 8, flexWrap: 'wrap' }}>
                  {CAMPUS_PHOTOS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoIndex(idx)}
                      aria-label={`Go to photo ${idx + 1} of ${CAMPUS_PHOTOS.length}`}
                      aria-current={idx === photoIndex ? 'true' : undefined}
                      style={{
                        width: 28,
                        height: 28,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: idx === photoIndex ? 22 : 7,
                          height: 7,
                          borderRadius: 4,
                          background: idx === photoIndex ? '#2563EB' : '#CBD5E1',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: VIDEOS ONLY (SHOW 2 VIDEOS ON DESKTOP, SWIPEABLE ON MOBILE) */}
            {highlightTab === 'videos' && (
              <div
                onTouchStart={handleTouchStartMedia}
                onTouchEnd={handleTouchEndVideo}
                style={{ position: 'relative', width: '100%', maxWidth: 1140, margin: '0 auto', touchAction: 'pan-y' }}
              >
                
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: '0.9286rem', fontWeight: 800, color: '#475569' }}>
                    Showing Videos {videoIndex + 1} &amp; {Math.min(videoIndex + 2, CAMPUS_VIDEOS.length)} of {CAMPUS_VIDEOS.length} <span style={{ color: '#94A3B8', fontWeight: 600 }}>(Swipe on phone)</span>
                  </div>
                  
                  {/* LEFT & RIGHT NAV ARROWS */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setVideoIndex(prev => Math.max(0, prev - 1))}
                      disabled={videoIndex === 0}
                      aria-label="Previous Video"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: videoIndex === 0 ? '#E2E8F0' : '#2563EB',
                        color: videoIndex === 0 ? '#94A3B8' : '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: videoIndex === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: videoIndex === 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
                        transition: 'all 0.22s ease',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>

                    <button
                      onClick={() => setVideoIndex(prev => Math.min(CAMPUS_VIDEOS.length - 1, prev + 1))}
                      disabled={videoIndex >= CAMPUS_VIDEOS.length - 1}
                      aria-label="Next Video"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: videoIndex >= CAMPUS_VIDEOS.length - 1 ? '#E2E8F0' : '#2563EB',
                        color: videoIndex >= CAMPUS_VIDEOS.length - 1 ? '#94A3B8' : '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: videoIndex >= CAMPUS_VIDEOS.length - 1 ? 'not-allowed' : 'pointer',
                        boxShadow: videoIndex >= CAMPUS_VIDEOS.length - 1 ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
                        transition: 'all 0.22s ease',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>

                {/* 2-Column Video Grid (Uncropped Vertical & Landscape Video player container) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
                  {CAMPUS_VIDEOS.slice(videoIndex, videoIndex + 2).map((vid) => (
                    <div
                      key={vid.id}
                      className="ch"
                      style={{
                        background: '#0F172A',
                        borderRadius: 22,
                        overflow: 'hidden',
                        border: '1.5px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 12px 36px rgba(15,23,42,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Video Player Box — object-fit contain on black canvas to ensure full vertical & horizontal video fits uncropped! */}
                      <div style={{ position: 'relative', width: '100%', height: 380, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video
                          controls
                          preload="metadata"
                          playsInline
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
                        >
                          <source src={vid.src} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>

                        <div style={{ position: 'absolute', top: 12, left: 14, background: 'rgba(245, 158, 11, 0.95)', color: '#0F172A', padding: '4px 12px', borderRadius: 16, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', zIndex: 5, pointerEvents: 'none' }}>
                          {vid.tag}
                        </div>

                        {/* Fullscreen Expand Video Button */}
                        <button
                          onClick={() => setEnlargedMedia({ src: vid.src, isVideo: true, title: vid.title })}
                          aria-label="Expand Video Fullscreen"
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 14,
                            background: 'rgba(15,23,42,0.8)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: 16,
                            fontSize: '0.7857rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            zIndex: 10,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                          Fullscreen
                        </button>
                      </div>

                      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, background: '#0F172A' }}>
                        <h4 style={{ fontSize: '1.1429rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.4 }}>{vid.title}</h4>
                        <p style={{ fontSize: '0.9286rem', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>{vid.subtitle}</p>
                      </div>

                      <div style={{ height: 3.5, background: 'linear-gradient(90deg, #F59E0B, #2563EB)' }} />
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ABOUT & MENTORSHIP
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="about" className="bg-grid-animated" style={{ padding: '64px 16px', position: 'relative' }}>
          <div ref={aboutRef.ref} className="ic">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 300px), 1fr))', gap: 40, alignItems: 'center' }}>

              {/* Left text */}
              <div className={`reveal-left ${aboutRef.visible ? 'visible' : ''}`}>
                <div className="section-label" style={{ color: '#2563EB' }}>Why Choose Inspire Junior College</div>
                <h2 id="mentorship" style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather',serif", margin: '12px 0 20px', lineHeight: 1.3 }}>
                  Individual Mentorship &amp; Specialized Doubt Clarification
                </h2>
                <p style={{ fontSize: '1.0357rem', color: '#475569', lineHeight: 1.8, marginBottom: 24 }}>
                  At <strong style={{ color: DARK_TEXT }}>Inspire Junior College</strong>, every student receives a personal mentor who tracks daily progress, error patterns, and academic growth — ensuring no student is left behind.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {FEATURES.map((f, i) => (
                    <div key={i} className={`d${(i+1)*100} reveal ${aboutRef.visible ? 'visible' : ''}`}
                      style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < FEATURES.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #BFDBFE' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: DARK_TEXT, marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontSize: '0.9286rem', color: '#64748B', lineHeight: 1.6 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <a href="#enquiry" style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 10, background: NAVBAR_NAVY, color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 800, textDecoration: 'none', fontSize: '1rem', transition: 'transform 0.22s, box-shadow 0.22s', boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,0.24)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.18)'; }}>
                  Schedule a Campus Visit
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              </div>

              {/* Right: photo + dark panel with stats */}
              <div className={`reveal-right ${aboutRef.visible ? 'visible' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Mentorship Photo Showcase */}
                <div className="ch clip-wrap" style={{ borderRadius: 24, overflow: 'hidden', height: 220, position: 'relative', boxShadow: '0 12px 32px rgba(15,23,42,0.12)', border: '1.5px solid #E2E8F0' }}>
                  <img src={mentorshipImg} alt="Individual Mentorship & Tutors" className="clip-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20, color: '#fff' }}>
                    <span style={{ background: ACCENT_GOLD, color: '#0F172A', padding: '3px 10px', borderRadius: 12, fontSize: '0.7143rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1-on-1 Guidance Desk
                    </span>
                    <div style={{ fontSize: '1.1429rem', fontWeight: 800, marginTop: 4, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>Dedicated Subject Mentors</div>
                  </div>
                </div>

                <div className="ch" style={{ background: 'linear-gradient(160deg,#0F172A 0%,#1E3A8A 100%)', borderRadius: 24, padding: '28px 26px', color: '#fff', boxShadow: '0 20px 48px rgba(15,23,42,0.22)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* Decorative orbs */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.18),transparent)', animation: 'orbPulse 4s ease-in-out infinite' }} />
                  <div style={{ position: 'absolute', bottom: -40, left: -20, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.2),transparent)', animation: 'orbPulse 4s ease-in-out infinite 1.5s' }} />

                  <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Institutional Excellence</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 8, fontFamily: "'Merriweather',serif", lineHeight: 1.3, position: 'relative' }}>
                    Empowering Young Minds in Hanumakonda
                  </h3>
                  <p style={{ fontSize: '0.9286rem', color: '#94A3B8', lineHeight: 1.65, marginBottom: 20, position: 'relative' }}>
                    Proven track record of academic excellence in Board exams and national entrance tests.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10, position: 'relative' }}>
                    {[
                      { val: '100%', sub: 'Doubt Assistance', c: ACCENT_GOLD },
                      { val: 'Top AIR', sub: 'Competitive Ranks', c: '#38BDF8' },
                      { val: '4', sub: 'Premium Campuses', c: '#34D399' },
                      { val: '1500+', sub: 'Alumni & Counting', c: '#C084FC' },
                    ].map((s, i) => (
                      // Rendered as text, not HTML. These two used
                      // dangerouslySetInnerHTML purely to turn "&amp;" back
                      // into an ampersand — which the character itself does,
                      // in JSX, with no raw-HTML sink. The values here are
                      // hardcoded so nothing was exploitable, but the pattern
                      // becomes a stored-XSS hole the day someone makes this
                      // array come from the API, and on this app that means
                      // handing over the access token in localStorage.
                      <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '1.3571rem', fontWeight: 900, color: s.c, marginBottom: 2 }}>{s.val}</div>
                        <div style={{ fontSize: '0.7857rem', color: '#94A3B8', fontWeight: 700 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            OUR 4 CAMPUSES (BRANCHES) — HIGH CONTRAST WHITE TEXT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="campuses" className="section-pad bg-grid-animated" style={{ padding: '64px 16px' }}>
          <div ref={campusesRef.ref} className="ic">
            <div className={`reveal ${campusesRef.visible ? 'visible' : ''}`} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 20px' }}>
              <div className="section-label" style={{ color: '#2563EB', justifyContent: 'center' }}>Infrastructure &amp; Locations</div>
              <h2 style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, color: DARK_TEXT, fontFamily: "'Merriweather',serif", margin: '0 0 14px', lineHeight: 1.2 }}>
                Our 4 Premium Campuses
              </h2>
              <p style={{ fontSize: '1.0357rem', color: '#64748B', lineHeight: 1.75 }}>
                Located across Hanamkonda &amp; Warangal — each campus equipped with digital classrooms, AC hostels, dedicated transport, and round-the-clock security.
              </p>
            </div>
            <div className={`dec-divider reveal d200 ${campusesRef.visible ? 'visible' : ''}`} style={{ marginTop: 24 }}>
              <div className="dec-divider-line" /><div className="dec-divider-gem" /><div className="dec-divider-line" />
            </div>

            {/* Campus Feature Banner Photo */}
            <div className={`ch clip-wrap reveal d300 ${campusesRef.visible ? 'visible' : ''}`} style={{ borderRadius: 24, overflow: 'hidden', height: 260, position: 'relative', marginBottom: 36, border: '1.5px solid #E2E8F0', boxShadow: '0 12px 36px rgba(15,23,42,0.08)' }}>
              <img src={campusImg} alt="Inspire Junior College Infrastructure" className="clip-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, color: '#fff' }}>
                <div>
                  <span style={{ background: ACCENT_GOLD, color: '#0F172A', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    State-of-the-Art Facilities
                  </span>
                  <h3 style={{ fontSize: 'clamp(1.4286rem,2.5vw,2rem)', fontWeight: 900, margin: '6px 0 2px', fontFamily: "'Merriweather',serif" }}>
                    Modern Classrooms &amp; Science Labs
                  </h3>
                  <p style={{ fontSize: '0.9643rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Designed for maximum focus, comfort, and competitive exam preparation</p>
                </div>
                <a href="#enquiry" className="btn-gold" style={{ padding: '10px 20px', fontSize: '0.9286rem' }}>
                  Schedule Campus Tour
                </a>
              </div>
            </div>

            <div className="campuses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 270px), 1fr))', gap: 20 }}>
              {CAMPUSES_LIST.map((c, i) => (
                <div key={i} className={`ch reveal d${(i+1)*150} ${campusesRef.visible ? 'visible' : ''}`}
                  style={{ background: '#0F172A', borderRadius: 20, border: `1.5px solid ${c.col}50`, boxShadow: '0 8px 24px rgba(15,23,42,0.18)', overflow: 'hidden' }}>
                  {/* Top color bar with rainbow animation */}
                  <div style={{ height: 4, background: c.col }} />
                  <div style={{ padding: '22px 20px', background: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9286rem', color: '#FFFFFF', letterSpacing: '0.02em', border: `1.5px solid ${c.col}60`, flexShrink: 0, boxShadow: `0 4px 12px ${c.col}40` }}>
                        {c.code}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Campus Branch</div>
                        <h3 style={{ fontSize: '1.2143rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{c.name}</h3>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.9643rem', color: '#CBD5E1', lineHeight: 1.65, margin: '0 0 16px' }}>{c.desc}</p>
                    <div style={{ paddingTop: 14, borderTop: `1px dashed ${c.col}40`, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9286rem', fontWeight: 800, color: c.col, transition: 'gap 0.2s', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Explore Campus Facilities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CAMPUS GALLERY (SINGLE FRAME COLOR CAROUSEL)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="campus-gallery" className="section-pad bg-grid-animated" style={{ padding: '72px 16px', background: 'linear-gradient(180deg,#FAFCFF 0%,#F1F5F9 100%)', position: 'relative', borderTop: '1px solid #E2E8F0' }}>
          <div ref={galleryRef.ref} className={`ic reveal ${galleryRef.visible ? 'visible' : ''}`}>
            <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 28px' }}>
              <div className="section-label" style={{ color: '#2563EB', justifyContent: 'center' }}>Infrastructure Exhibit</div>
              <h2 className="text-shimmer-blue" style={{ fontSize: 'clamp(1.7143rem,3.2vw,2.8571rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 10px', lineHeight: 1.2 }}>
                Campus Gallery
              </h2>
              <div className="dec-divider" style={{ marginTop: 12, marginBottom: 0 }}>
                <div className="dec-divider-line" /><div className="dec-divider-gem" /><div className="dec-divider-line" />
              </div>
            </div>
            <SingleFrameColorGallery onEnlargePhoto={(src, title) => setEnlargedImage({ src, title })} />
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ADMISSION ENQUIRY FORM
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="enquiry" className="section-pad" style={{ padding: '88px 16px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
          {/* Background radial */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.04),transparent 70%)', pointerEvents: 'none' }} />
          <div ref={enquiryReveal.ref} className="ic" style={{ maxWidth: 900 }}>

            <div className={`reveal ${enquiryReveal.visible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 44 }}>
              <div className="section-label" style={{ color: '#2563EB', justifyContent: 'center' }}>Admission Enquiry Desk 2026-27</div>
              <h2 className="text-shimmer-blue" style={{ fontSize: 'clamp(1.8571rem,3.5vw,3.1429rem)', fontWeight: 900, fontFamily: "'Merriweather',serif", margin: '0 0 16px', lineHeight: 1.2 }}>
                Enquire for Admission
              </h2>
              <p style={{ fontSize: '1.1071rem', color: '#64748B', lineHeight: 1.8 }}>
                Fill in the form below and our dedicated admissions counselor will reach out within 24 hours with personalized guidance for stream &amp; campus selection.
              </p>
            </div>

            <div className={`form-box reveal d200 ${enquiryReveal.visible ? 'visible' : ''}`}
              style={{ background: '#fff', borderRadius: 26, padding: '40px', boxShadow: '0 16px 56px rgba(15,23,42,0.10)', border: '1.5px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative top gradient band */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,#1E3A8A,#F59E0B,#10B981)' }} />

              {enquirySuccess ? (
                <div style={{ textAlign: 'center', padding: '36px 0', animation: 'scaleIn 0.5s ease both' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#DEF7EC,#A7F3D0)', border: '2.5px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 0 8px rgba(16,185,129,0.1)' }}>
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 style={{ fontSize: '1.8571rem', fontWeight: 900, color: DARK_TEXT, marginBottom: 10 }}>Enquiry Submitted Successfully!</h3>
                  <p style={{ fontSize: '1.0357rem', color: '#64748B', marginBottom: 24, lineHeight: 1.7 }}>Our admissions counselor will reach out on your registered mobile number within 24 hours.</p>
                  <div style={{ display: 'inline-block', padding: '16px 36px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '2px solid #2563EB', borderRadius: 14, color: '#1E3A8A', fontWeight: 900, fontSize: '1.3571rem', marginBottom: 24, letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(37,99,235,0.15)' }}>
                    REFERENCE CODE: {enquiryRef}
                  </div>
                  <p style={{ fontSize: '0.9643rem', color: '#64748B' }}>For instant assistance, call admissions desk: <strong style={{ color: '#D97706' }}>{orgPhone}</strong></p>
                  <button onClick={() => { setEnquirySuccess(false); setStuName(''); setStuMobile(''); setEnquiryRef(''); }}
                    style={{ marginTop: 24, padding: '12px 28px', background: NAVBAR_NAVY, color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 260px), 1fr))', gap: 22 }}>
                  {enquiryError && (
                    <div style={{ gridColumn: '1/-1', padding: '14px 18px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: '0.9643rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      {enquiryError}
                    </div>
                  )}

                  {/* This form is on the public internet, so it is the one that
                      most needs a ceiling. The mobile field also strips
                      non-digits as you type: `type="tel"` accepts any text, it
                      only hints at a numeric keypad on phones. */}
                  {[
                    { label: 'Student Full Name *', placeholder: 'e.g. Aarav Sharma', val: stuName, set: setStuName, type: 'text', max: LIMITS.personName },
                    { label: 'Parent / Guardian Name', placeholder: 'e.g. Ramesh Sharma', val: parentName, set: setParentName, type: 'text', max: LIMITS.personName },
                    { label: 'Contact Mobile Number *', placeholder: '10-digit mobile number', val: stuMobile, set: setStuMobile, type: 'tel', max: LIMITS.mobile, digits: true },
                    { label: 'Email Address', placeholder: 'student@example.com', val: stuEmail, set: setStuEmail, type: 'email', max: LIMITS.email },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: '0.8929rem', fontWeight: 800, color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                      <input
                        type={f.type}
                        required={f.label.includes('*')}
                        placeholder={f.placeholder}
                        maxLength={f.max}
                        value={f.val}
                        onChange={e => f.set(f.digits ? digitsOnly(e.target.value, f.max) : e.target.value.slice(0, f.max))}
                        className="ig"
                        style={inputSt}
                      />
                    </div>
                  ))}

                  {[
                    { label: 'Academic Stream Preference', val: stuStream, set: setStuStream, opts: ['MPC (JEE Mains & Advanced)', 'BiPC (NEET Medical)', 'MEC & CEC (CA Foundation / Civils)', 'Long-Term Repeater Batch'] },
                    { label: 'Preferred Campus Location', val: stuCampus, set: setStuCampus, opts: ['Erragattugutta Campus 1', 'Erragattugutta Campus 2', 'Bheemaram Campus 1', 'Bheemaram Campus 2'] },
                    { label: 'Current Grade / Qualification', val: stuGrade, set: setStuGrade, opts: ['Grade 10 (Completed)', 'Grade 12 / Intermediate (Completed)', 'Appearing Grade 10', 'Appearing Grade 12'] },
                  ].map(f => {
                    // The label was visually adjacent but not associated with
                    // the control, so a screen reader announced these three as
                    // an unnamed combo box. On the public admissions form,
                    // which is the one page anyone can reach.
                    const id = `enq-${f.label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
                    return (
                      <div key={f.label}>
                        <label htmlFor={id} style={{ display: 'block', fontSize: '0.8929rem', fontWeight: 800, color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                        <select id={id} name={id} value={f.val} onChange={e => f.set(e.target.value)} className="ig" style={inputSt}>
                          {f.opts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  })}

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontSize: '0.8929rem', fontWeight: 800, color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message / Specific Requirements</label>
                    <textarea rows={3} placeholder="Scholarship queries, hostel facilities, mentorship requirements, batch preferences..." value={stuNotes} onChange={e => setStuNotes(e.target.value)} className="ig" style={{ ...inputSt, resize: 'vertical' }} />
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <button type="submit" disabled={isSubmitting} className="btn-gold" style={{ width: '100%', justifyContent: 'center', fontSize: '1.1429rem', padding: '16px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer', animation: 'none' }}>
                      {isSubmitting ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'floatY 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          Submitting Enquiry...
                        </>
                      ) : (
                        <>
                          Submit Admission Enquiry
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            PAPER CLIPS LIGHTBOX MODAL
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {selectedClip && (
          <div onClick={() => setSelectedClip(null)} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(10,14,28,0.94)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 940, width: '100%', maxHeight: '92vh', background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', cursor: 'default', animation: 'modalIn 0.35s cubic-bezier(.25,.8,.25,1) both' }}>
              {/* Modal header */}
              <div style={{ padding: '16px 24px', background: 'linear-gradient(90deg,#0F172A,#1E3A8A)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedClip.tag}</span>
                  <h3 style={{ fontSize: '1.1071rem', fontWeight: 900, color: '#fff', margin: '2px 0 0' }}>{selectedClip.title}</h3>
                </div>
                <button onClick={() => setSelectedClip(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {/* Image content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#F8FAFC', textAlign: 'center' }}>
                <img src={selectedClip.src} alt={selectedClip.title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, border: '1.5px solid #E2E8F0', boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }} />
                <p style={{ marginTop: 18, fontSize: '1.0357rem', color: '#475569', fontWeight: 600, lineHeight: 1.7 }}>{selectedClip.subtitle}</p>
              </div>
              {/* Bottom nav between clips */}
              <div style={{ padding: '12px 24px', background: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => { const idx = PAPER_CLIPS.findIndex(c => c.id === selectedClip.id); if (idx > 0) setSelectedClip(PAPER_CLIPS[idx - 1]); }}
                  disabled={selectedClip.id === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: 'none', cursor: selectedClip.id === 1 ? 'not-allowed' : 'pointer', fontSize: '0.9286rem', fontWeight: 700, color: selectedClip.id === 1 ? '#CBD5E1' : DARK_TEXT, transition: 'all 0.2s' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  Previous
                </button>
                <span style={{ fontSize: '0.8929rem', color: '#94A3B8', fontWeight: 700 }}>{selectedClip.id} / {PAPER_CLIPS.length}</span>
                <button onClick={() => { const idx = PAPER_CLIPS.findIndex(c => c.id === selectedClip.id); if (idx < PAPER_CLIPS.length - 1) setSelectedClip(PAPER_CLIPS[idx + 1]); }}
                  disabled={selectedClip.id === PAPER_CLIPS.length}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: 'none', cursor: selectedClip.id === PAPER_CLIPS.length ? 'not-allowed' : 'pointer', fontSize: '0.9286rem', fontWeight: 700, color: selectedClip.id === PAPER_CLIPS.length ? '#CBD5E1' : DARK_TEXT, transition: 'all 0.2s' }}>
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FOOTER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <footer id="contact" style={{ background: 'linear-gradient(160deg,#0F172A 0%,#0F172A 70%,#1E3A8A 100%)', color: '#fff', padding: '72px 16px 0', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative orbs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.1),transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 60, left: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.12),transparent)', pointerEvents: 'none' }} />

          <div className="ic" style={{ position: 'relative' }}>
            {/* Top gold separator line */}
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent)', marginBottom: 52 }} />

            <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 240px), 1fr))', gap: 44, marginBottom: 52 }}>

              {/* Brand column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <img src={collegeLogo} alt="Logo" style={{ height: 46, background: '#fff', padding: '3px 6px', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }} />
                  <div>
                    <div style={{ fontSize: '1.2143rem', fontWeight: 900, color: '#fff', fontFamily: "'Merriweather',serif" }}>Inspire Junior College</div>
                    <div style={{ fontSize: '0.75rem', color: ACCENT_GOLD, fontWeight: 800, letterSpacing: '0.05em' }}>Hanumakonda, Telangana</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.9643rem', color: '#94A3B8', lineHeight: 1.8, marginBottom: 20 }}>
                  Dedicated to preparing students for IIT-JEE, NEET, and Intermediate Board with top-tier faculty, individual mentorship, and modern campus infrastructure.
                </p>
                {/* Quick Links + ERP Portal */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a href="#enquiry"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.8929rem', fontWeight: 800, color: ACCENT_GOLD, textDecoration: 'none', transition: 'background 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.transform = ''; }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    Admissions
                  </a>
                  <a href={portalHash}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, fontSize: '0.8929rem', fontWeight: 800, color: '#93C5FD', textDecoration: 'none', transition: 'background 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.12)'; e.currentTarget.style.transform = ''; }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    Staff ERP Portal
                  </a>
                </div>
              </div>

              {/* Campuses */}
              <div>
                <div style={{ fontSize: '0.7857rem', fontWeight: 900, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 1.5, background: ACCENT_GOLD }} />
                  Our 4 Campuses
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CAMPUSES_LIST.map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.col, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9643rem', color: '#CBD5E1', fontWeight: 600 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streams */}
              <div>
                <div style={{ fontSize: '0.7857rem', fontWeight: 900, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 1.5, background: ACCENT_GOLD }} />
                  Academic Streams
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['MPC — IIT-JEE Mains & Advanced', 'BiPC — NEET Medical & AIIMS', 'MEC & CEC — CA / Civils', 'Long-Term Repeater Program'].map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9643rem', color: '#CBD5E1', fontWeight: 600 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <div style={{ fontSize: '0.7857rem', fontWeight: 900, color: ACCENT_GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 1.5, background: ACCENT_GOLD }} />
                  Contact Us
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Address</div>
                    <div style={{ fontSize: '0.9643rem', color: '#CBD5E1', lineHeight: 1.65 }}>Inspire Junior College Campus HQ<br />Hanamkonda, Warangal, Telangana</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Admissions Helpline</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <a href="tel:7416380320" style={{ fontSize: '1.0357rem', color: ACCENT_GOLD, textDecoration: 'none', fontWeight: 900, letterSpacing: '0.02em' }}>+91 74163 80320</a>
                      <span style={{ color: '#64748B', fontWeight: 700 }}>|</span>
                      <a href="tel:9177657274" style={{ fontSize: '1.0357rem', color: ACCENT_GOLD, textDecoration: 'none', fontWeight: 900, letterSpacing: '0.02em' }}>+91 91776 57274</a>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email</div>
                    <a href={`mailto:${orgEmail}`} style={{ fontSize: '0.9286rem', color: '#93C5FD', textDecoration: 'none', fontWeight: 600 }}>{orgEmail}</a>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom bar */}
            <div className="footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: '0.8929rem', color: '#64748B' }}>© 2026 Inspire Junior College. All Rights Reserved. Hanumakonda, Telangana.</span>
              <span style={{ fontSize: '0.8929rem', color: '#475569' }}>IIT-JEE · NEET · Intermediate Board</span>
            </div>
          </div>
        </footer>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FULLSCREEN IMAGE LIGHTBOX MODAL WITH CROSS (X) BUTTON
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {(enlargedImage || selectedClip || enlargedMedia) && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(7, 11, 25, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              animation: 'fadeIn 0.22s ease both',
            }}
            onClick={() => {
              setEnlargedImage(null);
              setSelectedClip(null);
              setEnlargedMedia(null);
            }}
          >
            {/* PROMINENT CROSS (X) CLOSE BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedImage(null);
                setSelectedClip(null);
                setEnlargedMedia(null);
              }}
              aria-label="Close Enlarged View"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
                transition: 'all 0.22s ease',
                zIndex: 1000000,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.transform = 'scale(1.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* LIGHTBOX CONTENT CONTAINER */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '92vw',
                maxHeight: '88vh',
                borderRadius: 22,
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#0F172A',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {enlargedMedia?.isVideo ? (
                <video
                  controls
                  autoPlay
                  playsInline
                  style={{
                    maxWidth: '85vw',
                    maxHeight: '78vh',
                    objectFit: 'contain',
                    display: 'block',
                    background: '#000',
                  }}
                >
                  <source src={enlargedMedia.src} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={enlargedMedia ? enlargedMedia.src : (enlargedImage ? enlargedImage.src : selectedClip?.src)}
                  alt={enlargedMedia ? (enlargedMedia.title || 'Enlarged View') : (enlargedImage ? (enlargedImage.title || 'Enlarged View') : selectedClip?.title)}
                  style={{
                    maxWidth: '88vw',
                    maxHeight: '78vh',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              )}

              <div
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: '#0F172A',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  textAlign: 'center',
                  fontSize: '1.0357rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                {enlargedMedia ? enlargedMedia.title : (enlargedImage ? (enlargedImage.title || 'Enlarged View') : selectedClip?.title)}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

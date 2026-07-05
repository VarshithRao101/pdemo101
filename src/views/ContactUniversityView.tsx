import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// --- ICONS & ILLUSTRATIONS ---
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-gray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const LocationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ShieldBadgeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const MedicalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const ReceptionIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

interface ContactUniversityProps {
  onClose: () => void;
}

interface ContactType {
  id: number;
  name: string;
  designation: string;
  department: string;
  status: 'Available' | 'Busy';
  phone: string;
  email: string;
  office: string;
  hours: string;
  desc: string;
}

export const ContactUniversityView: React.FC<ContactUniversityProps> = ({ onClose }) => {
  const { theme } = useNavigation();

  const customBackgroundStyle: React.CSSProperties = {
    ...styles.container,
    backgroundColor: theme === 'light' ? '#F0F9FF' : '#072C40',
    backgroundImage: `
      radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.1) 0%, transparent 45%),
      radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
      repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(14, 165, 233, 0.015) 15px, rgba(14, 165, 233, 0.015) 30px)
    `
  };

  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const categories = [
    'All', 'Management', 'Academic', 'Hostel', 'Administration', 'Accounts', 'Transport', 'Medical', 'Security', 'Sports', 'Counselling'
  ];

  const contactsData: ContactType[] = [
    {
      id: 1,
      name: 'Dr. Ramesh Kumar',
      designation: 'Principal',
      department: 'Management',
      status: 'Available',
      phone: '+91 90123 45601',
      email: 'principal@inspire.edu',
      office: 'Room 101, Administrative Block',
      hours: '10:00 AM - 01:00 PM',
      desc: 'Oversees overall administration, academic policies, governance, and institutional strategy.'
    },
    {
      id: 2,
      name: 'Mrs. Anitha Devi',
      designation: 'Vice Principal',
      department: 'Management',
      status: 'Available',
      phone: '+91 90123 45602',
      email: 'viceprincipal@inspire.edu',
      office: 'Room 102, Administrative Block',
      hours: '11:00 AM - 03:00 PM',
      desc: 'Handles day-to-day discipline operations, curriculum design, student affairs coordination, and schedules.'
    },
    {
      id: 3,
      name: 'Mr. Vinay Kumar',
      designation: 'Academic Coordinator',
      department: 'Academic',
      status: 'Busy',
      phone: '+91 90123 45603',
      email: 'coord.mpc@inspire.edu',
      office: 'Room 204, Academic Office',
      hours: '09:00 AM - 05:00 PM',
      desc: 'Coordinates MPC class timetables, syllabus progressions, tests, and faculty evaluations.'
    },
    {
      id: 4,
      name: 'Mr. Srinivas',
      designation: 'Hostel Warden (Boys)',
      department: 'Hostel',
      status: 'Available',
      phone: '+91 90123 45678',
      email: 'warden.b@inspire.edu',
      office: 'Warden Cabin, Boys Hostel Block B',
      hours: '24/7 Available (Emergency)',
      desc: 'Responsible for B-Block boys hostel boarding logs, gate passes approvals, rules inspections, and mess monitoring.'
    },
    {
      id: 5,
      name: 'Mrs. Swathi',
      designation: 'Girls Hostel Warden',
      department: 'Hostel',
      status: 'Available',
      phone: '+91 90123 45605',
      email: 'warden.g@inspire.edu',
      office: 'Warden Cabin, Girls Hostel Block A',
      hours: '24/7 Available (Emergency)',
      desc: 'Coordinates boarding, security guidelines, and gate passes logs for girls hostel residential quarters.'
    },
    {
      id: 6,
      name: 'Mr. Mahesh',
      designation: 'Accounts Officer',
      department: 'Accounts',
      status: 'Available',
      phone: '+91 90123 45606',
      email: 'accounts@inspire.edu',
      office: 'Room 105, Accounts Office Block-C',
      hours: '10:00 AM - 04:00 PM',
      desc: 'Manages installment collections, due schedules calculations, fee statements generation, and scholarship audits.'
    },
    {
      id: 7,
      name: 'Mr. Raju',
      designation: 'Transport Manager',
      department: 'Transport',
      status: 'Available',
      phone: '+91 90123 45681',
      email: 'transport@inspire.edu',
      office: 'Cabin 3, Campus Gate Garage',
      hours: '08:00 AM - 06:00 PM',
      desc: 'Organizes weekend outing buses schedules, local emergency shuttles, and day scholar route trackers.'
    },
    {
      id: 8,
      name: 'Dr. Priya',
      designation: 'Medical Officer',
      department: 'Medical',
      status: 'Available',
      phone: '+91 90123 45682',
      email: 'medical@inspire.edu',
      office: 'Room 12, Medical Centre Wing-A',
      hours: '24/7 Emergency Care',
      desc: 'Chief campus physician managing residential health checkups, medicine allocations, and ambulance coordinates.'
    },
    {
      id: 9,
      name: 'Mrs. Sneha',
      designation: 'Student Counsellor',
      department: 'Counselling',
      status: 'Available',
      phone: '+91 90123 45609',
      email: 'counselling@inspire.edu',
      office: 'Room 107, Counselling Cabin',
      hours: '02:00 PM - 05:00 PM',
      desc: 'Provides mental wellness sessions, stress management checks, hostel adjustment aid, and guidance consultations.'
    }
  ];

  const officeLocations = [
    { name: 'Administrative Block', building: 'Block-A', floor: '1st Floor' },
    { name: 'Academic Office', building: 'Block-C', floor: '2nd Floor' },
    { name: 'Hostel Office', building: 'Block-B', floor: 'Ground Floor' },
    { name: 'Accounts Office', building: 'Block-A', floor: 'Ground Floor' },
    { name: 'Medical Centre', building: 'Wing-A', floor: 'Ground Floor' },
    { name: 'Transport Office', building: 'Main Gate Cabin', floor: 'Ground Floor' }
  ];

  const recentSearches = ['Warden', 'Accounts', 'Doctor', 'Vinay Kumar'];
  const popularDepartments = ['Academic', 'Hostel', 'Medical', 'Accounts'];

  // Filtering Logic
  const filteredContacts = contactsData.filter(contact => {
    const matchesCategory = activeCategory === 'All' || contact.department === activeCategory;
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const favorites = contactsData.filter(c => [1, 4, 3, 8].includes(c.id));

  if (isLoading) {
    return (
      <div className="view-container" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <div style={{ width: 24, height: 24, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
          <div style={{ width: 24, height: 24, borderRadius: '50%' }} className="shimmer-item" />
        </header>

        <div style={styles.content}>
          <div style={{ height: 120, borderRadius: 'var(--radius-lg)' }} className="shimmer-item" />
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} style={{ width: 85, height: 32, borderRadius: 16 }} className="shimmer-item" />
            ))}
          </div>
          <div style={{ height: 160, borderRadius: 'var(--radius-md)' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  // --- MODAL SEARCH OVERLAY ---
  if (showSearchScreen) {
    return (
      <div className="view-container anim-fade-in" style={customBackgroundStyle}>
        <header style={styles.searchHeader}>
          <button
            onClick={() => {
              setShowSearchScreen(false);
              setSearchQuery('');
            }}
            style={styles.backBtn}
            className="press-interactive"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          <input
            type="text"
            placeholder="Search Contacts..."
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearBtn} className="press-interactive">
              
            </button>
          )}
        </header>

        <main style={styles.content}>
          {searchQuery === '' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={styles.searchSubtitle}>Recent Searches</h4>
                <div style={styles.recentSearchesList}>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(term);
                        triggerToast(`Searching for "${term}"`);
                      }}
                      style={styles.searchTag}
                      className="press-interactive"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={styles.searchSubtitle}>Popular Departments</h4>
                <div style={styles.recentSearchesList}>
                  {popularDepartments.map((dept, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(dept);
                        triggerToast(`Filtering by ${dept}`);
                      }}
                      style={styles.searchTag}
                      className="press-interactive"
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.feedList}>
              <h4 style={styles.searchSubtitle}>Results ({filteredContacts.length})</h4>
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-gray)' }}>
                  No contacts match your query.
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <GlassCard
                    key={contact.id}
                    hoverable={true}
                    onClick={() => {
                      setSelectedContact(contact);
                      setShowSearchScreen(false);
                    }}
                    style={styles.contactCard}
                  >
                    <div style={styles.cardInfoRow}>
                      <div style={styles.cardAvatar}>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div style={styles.cardMeta}>
                        <h4 style={styles.cardName}>{contact.name}</h4>
                        <span style={styles.cardRole}>{contact.designation} • {contact.department}</span>
                      </div>
                      <span
                        style={{
                          ...styles.availabilityBadge,
                          backgroundColor: contact.status === 'Available' ? 'rgba(46,125,50,0.1)' : 'rgba(110,110,115,0.1)',
                          color: contact.status === 'Available' ? '#2E7D32' : 'var(--muted-gray)'
                        }}
                      >
                        {contact.status}
                      </span>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- PROFILE DETAIL PAGE VIEW ---
  if (selectedContact !== null) {
    return (
      <div className="view-container anim-slide-up" style={customBackgroundStyle}>
        <header style={styles.appBar}>
          <button onClick={() => setSelectedContact(null)} style={styles.backBtn} className="press-interactive" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Staff Profile</h2>
          <div style={{ width: 28 }} />
        </header>

        <main style={styles.content}>
          {/* Hero details card */}
          <GlassCard hoverable={false} style={styles.profileHeroCard} className="glass-gold-ring anim-scale-in">
            <div style={styles.profileAvatarLarge}>
              {selectedContact.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h2 style={styles.profileNameText}>{selectedContact.name}</h2>
            <span style={styles.profileDesignationText}>{selectedContact.designation}</span>
            <span style={styles.profileDepartmentText}>{selectedContact.department} Department</span>

            <div style={styles.profileHeaderDivider} />

            <div style={styles.profileMetaList}>
              <div style={styles.profileMetaRow}>
                <span style={styles.profileLabelText}>Working Hours:</span>
                <span style={styles.profileValText}>{selectedContact.hours}</span>
              </div>
              <div style={styles.profileMetaRow}>
                <span style={styles.profileLabelText}>Office Location:</span>
                <span style={styles.profileValText}>{selectedContact.office}</span>
              </div>
              <div style={styles.profileMetaRow}>
                <span style={styles.profileLabelText}>Contact Phone:</span>
                <span style={styles.profileValText}>{selectedContact.phone}</span>
              </div>
              <div style={styles.profileMetaRow}>
                <span style={styles.profileLabelText}>Contact Email:</span>
                <span style={styles.profileValText}>{selectedContact.email}</span>
              </div>
            </div>

            <div style={styles.profileHeaderDivider} />

            <p style={styles.profileDescText}>{selectedContact.desc}</p>
          </GlassCard>

          {/* Action Row buttons */}
          <div style={styles.profileActionsRow}>
            <button
              onClick={() => triggerToast(`Dialing voice call to ${selectedContact.phone}...`)}
              style={{ ...styles.profileActionBtn, backgroundColor: 'var(--royal-gold)', color: '#fff' }}
              className="press-interactive"
            >
              <PhoneIcon />
              Call Staff
            </button>
            <button
              onClick={() => triggerToast(`Opening message composer for ${selectedContact.name}...`)}
              style={styles.profileActionBtn}
              className="press-interactive"
            >
              <MessageIcon />
              Message
            </button>
            <button
              onClick={() => triggerToast(`Composing email message to ${selectedContact.email}...`)}
              style={styles.profileActionBtn}
              className="press-interactive"
            >
              <EmailIcon />
              Email
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view-container anim-slide-up" style={customBackgroundStyle}>
      {/* Sticky App Header */}
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <button onClick={onClose} style={styles.backBtn} className="press-interactive" aria-label="Go back to dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, paddingLeft: '8px' }}>
            <h1 style={styles.title}>Contact University</h1>
            <p style={styles.subtitle}>Quickly reach the right department or staff</p>
          </div>
          <button
            onClick={() => setShowSearchScreen(true)}
            style={styles.searchIconBtn}
            className="press-interactive"
            aria-label="Search Contacts"
          >
            <SearchIcon />
          </button>
        </div>
      </header>

      {/* Main Scroller body */}
      <main style={styles.content}>

        {/* EMERGENCY CONTACTS HERO CARD */}
        <GlassCard hoverable={false} style={styles.emergencyHeroCard} className="anim-scale-in">
          <div style={styles.emergencyCardHeader}>
            <span style={styles.emergencyBadge}> EMERGENCY</span>
            <h3 style={styles.emergencyTitleText}>Emergency Contacts</h3>
            <span style={styles.emergencySubtitleText}>Available 24×7 on campus</span>
          </div>

          <div style={styles.emergencyButtonsRow}>
            <button
              onClick={() => triggerToast('Dialing Emergency Medical Room...')}
              style={styles.emergencyBtnItem}
              className="press-interactive"
            >
              <div style={styles.emergencyIconWrapper} className="glass-gold-ring">
                <MedicalIcon />
              </div>
              <span style={styles.emergencyBtnLabel}>Medical Room</span>
            </button>

            <button
              onClick={() => triggerToast('Dialing Hostel Security Guard...')}
              style={styles.emergencyBtnItem}
              className="press-interactive"
            >
              <div style={styles.emergencyIconWrapper} className="glass-gold-ring">
                <ShieldBadgeIcon />
              </div>
              <span style={styles.emergencyBtnLabel}>Hostel Security</span>
            </button>

            <button
              onClick={() => triggerToast('Dialing Main College Reception...')}
              style={styles.emergencyBtnItem}
              className="press-interactive"
            >
              <div style={styles.emergencyIconWrapper} className="glass-gold-ring">
                <ReceptionIcon />
              </div>
              <span style={styles.emergencyBtnLabel}>Reception Desk</span>
            </button>
          </div>
        </GlassCard>

        {/* FAVORITE CONTACTS SCROLLER */}
        <section style={styles.section} className="anim-slide-up stagger-1">
          <h3 style={styles.sectionTitle}>Favorite Contacts</h3>
          <div style={styles.chipScroller}>
            {favorites.map(fav => (
              <GlassCard
                key={fav.id}
                hoverable={true}
                onClick={() => setSelectedContact(fav)}
                style={styles.favCard}
              >
                <div style={styles.favAvatar}>
                  {fav.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h4 style={styles.favName}>{fav.name.split(' ')[1] || fav.name}</h4>
                <span style={styles.favRole}>{fav.designation}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerToast(`Initiating quick call to ${fav.name}...`);
                  }}
                  style={styles.favCallBtn}
                  className="press-interactive"
                >
                  <PhoneIcon />
                  Call
                </button>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* CATEGORY SELECTOR CHIPS */}
        <section style={styles.chipScrollerContainer} className="anim-slide-up stagger-2">
          <div style={styles.chipScroller}>
            {categories.map((cat, idx) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveCategory(cat);
                    triggerToast(`Showing ${cat} staff.`);
                  }}
                  style={{
                    ...styles.filterChip,
                    backgroundColor: isActive ? 'var(--royal-gold)' : 'rgba(255, 255, 255, 0.65)',
                    borderColor: isActive ? 'var(--royal-gold)' : 'rgba(0, 0, 0, 0.05)',
                    color: isActive ? '#fff' : 'var(--dark-charcoal)',
                    fontWeight: isActive ? 800 : 500
                  }}
                  className="press-interactive"
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* PRIMARY CONTACTS LIST */}
        <section style={styles.section} className="anim-slide-up stagger-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>{activeCategory} Directory</h3>
            <span style={styles.historyCounter}>{filteredContacts.length} staff</span>
          </div>

          <div style={styles.feedList}>
            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted-gray)' }}>
                No staff available in this category.
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <GlassCard
                  key={contact.id}
                  hoverable={true}
                  onClick={() => setSelectedContact(contact)}
                  style={styles.contactItemCard}
                >
                  <div style={styles.contactMainRow}>
                    {/* Circle Avatar placeholder */}
                    <div style={styles.contactAvatarIcon}>
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div style={styles.contactDetailsCol}>
                      <h4 style={styles.contactName}>{contact.name}</h4>
                      <span style={styles.contactDesignation}>{contact.designation}</span>
                      <span style={styles.contactDepartment}>{contact.department}</span>
                    </div>

                    <div style={styles.contactStatusWrapper}>
                      <span
                        style={{
                          ...styles.availabilityBadge,
                          backgroundColor: contact.status === 'Available' ? 'rgba(46,125,50,0.1)' : 'rgba(110,110,115,0.1)',
                          color: contact.status === 'Available' ? '#2E7D32' : 'var(--muted-gray)'
                        }}
                      >
                        {contact.status}
                      </span>
                      <ArrowRightIcon />
                    </div>
                  </div>

                  {/* Actions footer on each card */}
                  <div style={styles.contactCardActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerToast(`Dialing ${contact.phone}...`);
                      }}
                      style={styles.cardActionBtn}
                      className="press-interactive"
                    >
                      <PhoneIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerToast(`Opening message panel for ${contact.name}...`);
                      }}
                      style={styles.cardActionBtn}
                      className="press-interactive"
                    >
                      <MessageIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerToast(`Opening mail composer for ${contact.email}...`);
                      }}
                      style={styles.cardActionBtn}
                      className="press-interactive"
                    >
                      <EmailIcon />
                    </button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </section>

        {/* OFFICE LOCATIONS LIST */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <h3 style={styles.sectionTitle}>Office Locations</h3>
          <GlassCard hoverable={false} style={styles.locationsCard}>
            <div style={styles.locationsGrid}>
              {officeLocations.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => triggerToast(`Showing campus map route to ${loc.name}...`)}
                  style={{
                    ...styles.locationRow,
                    borderBottom: idx === officeLocations.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.03)',
                    paddingBottom: idx === officeLocations.length - 1 ? 0 : '12px'
                  }}
                  className="press-interactive"
                >
                  <div style={styles.locationLeft}>
                    <LocationIcon />
                    <div style={styles.locationMeta}>
                      <span style={styles.locationNameText}>{loc.name}</span>
                      <span style={styles.locationSubText}>{loc.building} • {loc.floor}</span>
                    </div>
                  </div>
                  <ArrowRightIcon />
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* WORKING HOURS */}
        <section style={styles.section} className="anim-slide-up stagger-4">
          <GlassCard hoverable={false} style={styles.hoursCard}>
            <div style={styles.hoursHeaderRow}>
              <span style={{ fontSize: '18px' }}>⏰</span>
              <h3 style={styles.hoursTitle}>Working Office Hours</h3>
            </div>
            <div style={styles.hoursMetaList}>
              <div style={styles.hoursMetaRow}>
                <span style={styles.hoursLabelText}>Monday - Friday:</span>
                <span style={styles.hoursValText}>9:00 AM - 5:00 PM</span>
              </div>
              <div style={styles.hoursMetaRow}>
                <span style={styles.hoursLabelText}>Saturday:</span>
                <span style={styles.hoursValText}>9:00 AM - 1:00 PM</span>
              </div>
              <div style={{ ...styles.hoursMetaRow, border: 'none', paddingBottom: 0 }}>
                <span style={styles.hoursLabelText}>Sunday:</span>
                <span style={{ ...styles.hoursValText, color: '#D32F2F', fontWeight: 700 }}>Emergency Contacts Only</span>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* HELP DESK CARD */}
        <section style={{ ...styles.section, paddingBottom: '32px' }} className="anim-slide-up stagger-5">
          <GlassCard hoverable={false} style={styles.helpDeskCard} className="glass-gold-ring">
            <h3 style={styles.helpTitle}>Need Assistance?</h3>
            <p style={styles.helpDesc}>
              Can't find what you are looking for? Contact the central help desk team to raise a ticket or request call backs.
            </p>
            <div style={styles.helpActionsRow}>
              <button
                onClick={() => triggerToast('Generating support ticket request...')}
                style={{ ...styles.helpBtn, backgroundColor: 'var(--royal-gold)', color: '#fff' }}
                className="press-interactive"
              >
                Raise Support Ticket
              </button>
              <button
                onClick={() => triggerToast('Calling Reception Desk...')}
                style={styles.helpBtn}
                className="press-interactive"
              >
                Call Reception
              </button>
              <button
                onClick={() => triggerToast('Composing help-desk support mail...')}
                style={styles.helpBtn}
                className="press-interactive"
              >
                Email Support
              </button>
            </div>
          </GlassCard>
        </section>

      </main>

      {/* Shared success toast feedback banner */}
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
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#FAFAFA',
  },
  appBar: {
    height: 'calc(120px + var(--safe-area-top))',
    paddingTop: 'calc(48px + var(--safe-area-top))',
    paddingLeft: '24px',
    paddingRight: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(250, 250, 250, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  searchHeader: {
    height: 'calc(120px + var(--safe-area-top))',
    paddingTop: 'calc(48px + var(--safe-area-top))',
    paddingLeft: '20px',
    paddingRight: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(250, 250, 250, 0.9)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1.5px solid var(--royal-gold)',
    position: 'sticky',
    top: 0,
    zIndex: 200,
  },
  searchInput: {
    flex: 1,
    height: '40px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '15px',
    fontWeight: 650,
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--muted-gray)',
    cursor: 'pointer',
    padding: '4px',
  },
  header: {
    padding: 'calc(24px + var(--safe-area-top)) 24px 16px 24px',
    background: 'rgba(250, 250, 250, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
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
  searchIconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
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

  /* EMERGENCY HERO CARD */
  emergencyHeroCard: {
    padding: '24px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
  },
  emergencyCardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '20px',
  },
  emergencyBadge: {
    fontSize: '8px',
    fontWeight: 800,
    color: '#D32F2F',
    backgroundColor: 'rgba(211,47,47,0.08)',
    padding: '2px 8px',
    borderRadius: '8px',
    letterSpacing: '0.04em',
  },
  emergencyTitleText: {
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    marginTop: '6px',
  },
  emergencySubtitleText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
  },
  emergencyButtonsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  emergencyBtnItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    gap: '8px',
  },
  emergencyIconWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#D32F2F',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s',
  },
  emergencyBtnLabel: {
    fontSize: '10px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    textAlign: 'center',
  },

  /* FAVORITE STAFF CARD SCROLLER */
  favCard: {
    scrollSnapAlign: 'start',
    flex: '0 0 120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 10px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1.2px solid rgba(255, 255, 255, 0.5)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: '20px',
  },
  favAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '1px solid rgba(212,175,55,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
  },
  favName: {
    fontSize: '12.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    marginTop: '8px',
    textAlign: 'center',
  },
  favRole: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
    textAlign: 'center',
    minHeight: '26px',
    lineHeight: '1.3',
  },
  favCallBtn: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.04)',
    backgroundColor: '#fff',
    fontSize: '10.5px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: 'var(--shadow-sm)',
  },

  /* CATEGORY SCROLLER */
  chipScrollerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  chipScroller: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '6px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },
  filterChip: {
    scrollSnapAlign: 'start',
    flex: '0 0 auto',
    padding: '8px 16px',
    borderRadius: '16px',
    border: '1px solid',
    fontSize: '12px',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
    boxShadow: 'var(--shadow-sm)',
    outline: 'none',
  },

  /* DIRECTORY FEED LIST */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  historyCounter: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactItemCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  contactMainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  contactAvatarIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(0,0,0,0.03)',
  },
  contactDetailsCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '1px',
  },
  contactName: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  contactDesignation: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 650,
  },
  contactDepartment: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  contactStatusWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  availabilityBadge: {
    fontSize: '8px',
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  contactCardActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0,0,0,0.03)',
    justifyContent: 'flex-end',
  },
  cardActionBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.04)',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    outline: 'none',
  },

  /* STAFF DETAILED PROFILE OVERLAY */
  profileHeroCard: {
    padding: '28px 24px',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    border: '2px solid rgba(212, 175, 55, 0.35)',
    boxShadow: 'var(--shadow-lg), 0 10px 45px rgba(212, 175, 55, 0.07)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: '24px',
  },
  profileAvatarLarge: {
    width: '74px',
    height: '74px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '1.5px solid rgba(212,175,55,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '14px',
  },
  profileNameText: {
    fontSize: '20px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  profileDesignationText: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    marginTop: '2px',
  },
  profileDepartmentText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginTop: '3px',
  },
  profileHeaderDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    margin: '20px 0',
  },
  profileMetaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  profileMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12.5px',
    textAlign: 'left',
  },
  profileLabelText: {
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  profileValText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
    maxWidth: '180px',
    textAlign: 'right',
  },
  profileDescText: {
    fontSize: '13px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
    textAlign: 'left',
  },
  profileActionsRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: '12px',
    width: '100%',
  },
  profileActionBtn: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    fontSize: '12px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: 'var(--shadow-sm)',
    outline: 'none',
  },

  /* OFFICE LOCATIONS LIST */
  locationsCard: {
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(0,0,0,0.03)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: '20px',
  },
  locationsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  locationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  locationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  locationMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  locationNameText: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
  locationSubText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },

  /* OFFICE WORKING HOURS CARD */
  hoursCard: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: '20px',
  },
  hoursHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
  },
  hoursTitle: {
    fontSize: '14px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
  },
  hoursMetaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  hoursMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    paddingBottom: '8px',
  },
  hoursLabelText: {
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  hoursValText: {
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
  },

  /* HELP DESK CARD */
  helpDeskCard: {
    padding: '24px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    border: '2px solid rgba(212, 175, 55, 0.3)',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: '24px',
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  helpDesc: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5',
    marginTop: '6px',
  },
  helpActionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  helpBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    fontSize: '12px',
    fontWeight: 750,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    outline: 'none',
  },

  /* SEARCH RECENT LISTS */
  searchSubtitle: {
    fontSize: '11px',
    fontWeight: 750,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '12px',
  },
  recentSearchesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  searchTag: {
    padding: '8px 14px',
    borderRadius: '16px',
    border: '1px solid rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
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

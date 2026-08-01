import React, { useState, useEffect } from 'react';
import PinEntry from '../components/common/PinEntry';
import { useNavigation } from '../context/NavigationContext';
import { InspireLogo } from '../components/common/InspireLogo';
import abstractBg from '../assets/minimalist_portal_bg.png';
import { apiClient } from '../services/apiClient';

interface PinViewProps {
  onComplete: () => void;
  mode?: 'universal' | 'authenticator';
}

export const PinView: React.FC<PinViewProps> = ({ onComplete, mode }) => {
  const [pin, setPin] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [isError, setIsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastKeypadIndex, setLastKeypadIndex] = useState<number | null>(null);
  const [sessionConflict, setSessionConflict] = useState(false);
  const { isMobile, portalRole, login, forceLogin } = useNavigation();

  const [portalMode, setPortalMode] = useState<'universal' | 'authenticator'>(() => {
    if (mode) return mode;
    const hash = window.location.hash;
    if (hash.includes('sec-auth-sys-9i0j7k8l') || hash.includes('authenticator')) return 'authenticator';
    return 'universal';
  });

  const currentMode = portalMode;

  const handlePortalSwitch = (newMode: 'universal' | 'authenticator') => {
    setPortalMode(newMode);
    if (newMode === 'authenticator') {
      window.location.hash = '#/sec-auth-sys-9i0j7k8l';
      setUserId('9059068384');
      setPasswordInput('');
    } else {
      window.location.hash = '#/v1-portal-gate-x89f2a7b';
      setUserId('');
      setPasswordInput('');
    }
    setIsError(false);
    setToastMessage(null);
  };



  const [userId, setUserId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSelectRoleCard = (roleId: string) => {
    if (roleId === 'admin2') {
      setUserId('admin2_erragattugutta_c1');
    } else if (roleId === 'accountant') {
      setUserId('accountant_erragattugutta_c1_1');
    } else {
      setUserId('admin1');
    }
    setPasswordInput('');
  };
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<'userId' | 'password' | null>(null);

  // Clear toast after 3.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleKeyPress = (num: number) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setLastKeypadIndex(pin.length);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      setLastKeypadIndex(null);
    }
  };

  const triggerError = (msg: string) => {
    setIsError(true);
    setToastMessage(msg);
    setTimeout(() => setIsError(false), 500);
    setPin('');
  };

  const handleConfirm = async (customPin?: string) => {
    const pinToSubmit = customPin || pin;
    if (pinToSubmit.length !== 6) {
      triggerError('Please enter your 6-digit Security PIN');
      return;
    }

    let identifier = userId.trim();
    if (currentMode === 'authenticator') {
      identifier = '9059068384';
    } else if (!identifier) {
      triggerError('Please select a Role or enter your User ID first');
      setStep('credentials');
      return;
    }

    if (!passwordInput.trim()) {
      triggerError('Please enter your Account Password first');
      setStep('credentials');
      return;
    }

    setIsChecking(true);

    try {
      await login(identifier, pinToSubmit, currentMode, passwordInput.trim());
      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
        window.location.hash = '#/dashboard';
      }, 1200);
    } catch (err: any) {
      if (err?.status === 409 || err?.data?.status === 'session_conflict') {
        setSessionConflict(true);
        return;
      }
      const msg =
        err?.data?.message || err?.message || (err?.status === 429
          ? 'Too many attempts. Please wait 15 minutes.'
          : 'Incorrect password or 6-digit PIN. Please try again.');
      triggerError(msg);
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceLogin = async () => {
    let identifier = userId.trim();
    if (currentMode === 'authenticator') identifier = '9059068384';
    setIsChecking(true);
    try {
      await forceLogin(identifier, pin, currentMode, passwordInput.trim());
      setSessionConflict(false);
      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
        window.location.hash = '#/dashboard';
      }, 1200);
    } catch (err: any) {
      triggerError(err?.data?.message || err?.message || 'Force login failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-submit when 6-digit PIN is entered
  useEffect(() => {
    if (step === 'pin' && pin.length === 6 && !isChecking && !isSuccess) {
      handleConfirm(pin);
    }
  }, [pin, step, isChecking, isSuccess]);

  // Physical keyboard support for 6-digit PIN
  useEffect(() => {
    if (step !== 'pin' || isChecking || isSuccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(parseInt(e.key, 10));
      } else if (/^Numpad[0-9]$/.test(e.code)) {
        e.preventDefault();
        const num = parseInt(e.code.replace('Numpad', ''), 10);
        handleKeyPress(num);
      } else if (/^Digit[0-9]$/.test(e.code)) {
        e.preventDefault();
        const num = parseInt(e.code.replace('Digit', ''), 10);
        handleKeyPress(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step, pin, isChecking, isSuccess]);

  const handleResetPin = () => {
    setPin('');
    setToastMessage('PIN reset request link sent to your registered mobile number');
  };

  const handleCredentialsFormSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    let identifier = userId.trim();
    if (currentMode === 'authenticator') {
      identifier = '9059068384';
    } else if (!identifier) {
      triggerError('Please select a Role or enter your User ID first');
      return;
    }

    if (!passwordInput.trim()) {
      triggerError('Please enter your Account Password first');
      return;
    }

    setIsChecking(true);
    try {
      const res = await apiClient.verifyCredentials(identifier, passwordInput.trim(), currentMode);
      if (res && res.status === 'success') {
        setStep('pin');
        setPin('');
        setIsError(false);
      } else {
        triggerError(res?.message || 'Incorrect User ID or Account Password.');
      }
    } catch (err: any) {
      triggerError(err.message || 'Incorrect User ID or Account Password.');
    } finally {
      setIsChecking(false);
    }
  };

  // Role Selection Data
  const roleCards = [
    {
      id: 'admin1',
      title: 'Admin 1',
      subtitle: 'Master Admin',
      badge: 'Super Admin',
      colorBg: '#0F172A',
      colorAccent: '#F59E0B',
      borderColor: '#F59E0B',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      id: 'admin2',
      title: 'Admin 2',
      subtitle: 'Campus Principal',
      badge: 'Principal',
      colorBg: '#065F46',
      colorAccent: '#10B981',
      borderColor: '#10B981',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      )
    },
    {
      id: 'accountant',
      title: 'Accountant',
      subtitle: 'Financial Ledger',
      badge: 'Finance',
      colorBg: '#3730A3',
      colorAccent: '#6366F1',
      borderColor: '#6366F1',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      )
    }
  ];

  // Render Step 1: Credentials & Role Selection
  const renderCredentialsContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Main Logo & Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <InspireLogo size="md" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-family)' }}>
            {currentMode === 'authenticator'
              ? 'Security Authenticator Gateway'
              : 'Inspire ERP Security Gateway'}
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, marginTop: '4px', margin: 0 }}>
            Enter password & 6-digit PIN to access administrative portals
          </p>
        </div>

        {/* Portal Gateway Switcher Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          backgroundColor: '#F8FAFC',
          padding: '4px',
          borderRadius: '14px',
          marginBottom: '20px',
          border: '1.5px solid #E2E8F0'
        }}>
          <button
            type="button"
            onClick={() => handlePortalSwitch('universal')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: currentMode === 'universal' ? '1.5px solid #0F172A' : '1.5px solid transparent',
              backgroundColor: currentMode === 'universal' ? '#0F172A' : 'transparent',
              color: currentMode === 'universal' ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: currentMode === 'universal' ? '0 2px 8px rgba(15,23,42,0.15)' : 'none'
            }}
            className="press-interactive"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: currentMode === 'universal' ? '#FFFFFF' : 'currentColor' }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span style={{ color: currentMode === 'universal' ? '#FFFFFF' : '#64748B', fontWeight: 800 }}>Universal Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('authenticator')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: currentMode === 'authenticator' ? '1.5px solid #F59E0B' : '1.5px solid transparent',
              backgroundColor: currentMode === 'authenticator' ? '#D97706' : 'transparent',
              color: currentMode === 'authenticator' ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: currentMode === 'authenticator' ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none'
            }}
            className="press-interactive"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: currentMode === 'authenticator' ? '#FFFFFF' : 'currentColor' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ color: currentMode === 'authenticator' ? '#FFFFFF' : '#64748B', fontWeight: 800 }}>Authenticator</span>
          </button>
        </div>

        {/* Role Quick Selector Grid (Admin 1, Admin 2, Accountant) */}
        {currentMode === 'universal' && (
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
              Select Administrative Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
              {roleCards.map(rc => {
                const isSelected = 
                  (rc.id === 'admin1' && (userId === 'admin1' || userId === 'admin')) ||
                  (rc.id === 'admin2' && userId.includes('admin2')) ||
                  (rc.id === 'accountant' && userId.includes('accountant'));
                return (
                  <button
                    key={rc.id}
                    type="button"
                    onClick={() => handleSelectRoleCard(rc.id)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '14px',
                      border: isSelected ? `2px solid ${rc.borderColor}` : '1.5px solid #E2E8F0',
                      backgroundColor: isSelected ? rc.colorBg : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#0F172A',
                      boxShadow: isSelected ? `0 4px 12px rgba(0,0,0,0.12)` : '0 2px 4px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.18s ease',
                      position: 'relative'
                    }}
                    className="press-interactive"
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: rc.colorAccent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <div style={{ color: isSelected ? (rc.id === 'admin1' ? '#F59E0B' : rc.colorAccent) : '#64748B' }}>
                      {rc.icon}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, lineHeight: 1, color: isSelected ? '#FFFFFF' : '#0F172A' }}>{rc.title}</div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: isSelected ? '#FFFFFF' : '#94A3B8' }}>
                      {rc.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Campus selector pills when Admin 2 or Accountant is active */}
            {userId.includes('admin2') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Select Admin 2 Campus:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'admin2_erragattugutta_c1', label: 'Erragattugutta C1' },
                    { id: 'admin2_erragattugutta_c2', label: 'Erragattugutta C2' },
                    { id: 'admin2_beemaram_c1', label: 'Beemaram C1' },
                    { id: 'admin2_beemaram_c2', label: 'Beemaram C2' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setUserId(c.id); setPasswordInput(''); }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: userId === c.id ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                        backgroundColor: userId === c.id ? '#065F46' : '#FFFFFF',
                        color: userId === c.id ? '#FFFFFF' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {userId.includes('accountant') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#3730A3', textTransform: 'uppercase' }}>Select Accountant Campus:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'accountant_erragattugutta_c1_1', label: 'Erragattugutta C1' },
                    { id: 'accountant_erragattugutta_c2_1', label: 'Erragattugutta C2' },
                    { id: 'accountant_beemaram_c1_1', label: 'Beemaram C1' },
                    { id: 'accountant_beemaram_c2_1', label: 'Beemaram C2' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setUserId(c.id); setPasswordInput(''); }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: userId === c.id ? '1.5px solid #6366F1' : '1px solid #CBD5E1',
                        backgroundColor: userId === c.id ? '#3730A3' : '#FFFFFF',
                        color: userId === c.id ? '#FFFFFF' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credentials Form Inputs */}
        <form onSubmit={handleCredentialsFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* User ID / Role Identifier Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {currentMode === 'authenticator' ? 'Fixed Authenticator Account ID' : 'User ID / Role Identifier'}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', color: focusedField === 'userId' ? '#D97706' : '#64748B', display: 'flex', alignItems: 'center', transition: 'color 0.15s ease' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={currentMode === 'authenticator' ? '9059068384' : 'admin1 / admin2 / accountant'}
                value={currentMode === 'authenticator' ? '9059068384' : userId}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserId(val);
                }}
                onFocus={() => setFocusedField('userId')}
                onBlur={() => setFocusedField(null)}
                readOnly={currentMode === 'authenticator'}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '14px',
                  border: focusedField === 'userId' ? '2px solid #F59E0B' : '1.5px solid #CBD5E1',
                  backgroundColor: currentMode === 'authenticator' ? '#FEF3C7' : '#FFFFFF',
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: focusedField === 'userId'
                    ? '0 0 14px rgba(245, 158, 11, 0.35)'
                    : '0 2px 4px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              />
            </div>
          </div>

          {/* Account Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Account Password
              </label>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', color: focusedField === 'password' ? '#D97706' : '#64748B', display: 'flex', alignItems: 'center', transition: 'color 0.15s ease' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Account Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 40px',
                  borderRadius: '14px',
                  border: focusedField === 'password' ? '2px solid #F59E0B' : '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: focusedField === 'password'
                    ? '0 0 14px rgba(245, 158, 11, 0.35)'
                    : '0 2px 4px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Continue Action Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: '1.5px solid #F59E0B',
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              marginTop: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'var(--font-family)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            className="press-interactive"
          >
            <span>Continue to 6-Digit PIN</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
          TRNT BEE Technologies System
        </div>
      </div>
    );
  };

  // Render Step 2: 6-Digit PIN Entry
  const renderPinContent = () => {
    // Current role badge metadata
    const activeRoleCard = roleCards.find(r => r.id === userId.trim().toLowerCase()) || {
      title: userId || 'Admin User',
      subtitle: 'Authenticated User',
      colorBg: '#0F172A',
      colorAccent: '#F59E0B'
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => setStep('credentials')}
            className="press-interactive"
            style={{
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Edit ID / Role</span>
          </button>

          <button
            onClick={handleResetPin}
            className="press-interactive"
            style={{
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Reset PIN</span>
          </button>
        </div>

        {/* Title & Active Role Badge */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <InspireLogo size="sm" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '7px 16px',
            borderRadius: '999px',
            border: `1.5px solid ${activeRoleCard.colorAccent || '#F59E0B'}`,
            fontSize: '12.5px',
            fontWeight: 800,
            boxShadow: `0 4px 14px rgba(15, 23, 42, 0.25)`,
            marginBottom: '10px'
          }}>
            <span style={{ color: activeRoleCard.colorAccent || '#F59E0B', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span style={{ color: '#FFFFFF', fontWeight: 800, letterSpacing: '0.02em' }}>
              {activeRoleCard.title} ({activeRoleCard.subtitle})
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 850, margin: '4px 0 0' }}>
            Enter 6-Digit Security PIN
          </p>
        </div>

        {/* 6-Digit PIN Component */}
        <PinEntry
          pin={pin}
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
          lastKeyIndex={lastKeypadIndex}
          isError={isError}
          isChecking={isChecking}
        />

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
          Physical keyboard numeric entry enabled
        </div>
      </div>
    );
  };

  // Render Success Animation
  const renderSuccessContent = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 10px',
        textAlign: 'center'
      }} className="anim-scale-in">
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          backgroundColor: '#059669',
          border: '3px solid #047857',
          boxShadow: '4px 4px 0px #047857',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          marginBottom: '16px'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ color: '#065F46', fontWeight: 900, fontSize: '22px', margin: 0, fontFamily: 'var(--font-family)' }}>
          Access Granted
        </h3>
        <p style={{ fontSize: '13px', color: '#047857', marginTop: '6px', fontWeight: 700, fontFamily: 'var(--font-family)' }}>
          Syncing secure ERP session...
        </p>
      </div>
    );
  };

  const renderConflictContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }} className="anim-scale-in">
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: '#FEF2F2',
          border: '2px solid #EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DC2626',
          marginBottom: '16px',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#991B1B', margin: 0, fontFamily: 'var(--font-family)' }}>
          Account Logged In Elsewhere
        </h3>

        <p style={{ fontSize: '13px', color: '#475569', fontWeight: 700, margin: '10px 0 20px', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}>
          This account (<strong>{userId || 'admin1'}</strong>) is currently active on another device or browser.
        </p>

        <button
          type="button"
          onClick={handleForceLogin}
          disabled={isChecking}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: '1.5px solid #DC2626',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
            fontFamily: 'var(--font-family)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          className="press-interactive"
        >
          {isChecking ? 'Evicting Session...' : 'Log out other session and continue'}
        </button>

        <button
          type="button"
          onClick={() => { setSessionConflict(false); setStep('credentials'); setPin(''); }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1.5px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#475569',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)'
          }}
          className="press-interactive"
        >
          Cancel
        </button>
      </div>
    );
  };

  const renderActiveContent = () => {
    if (isSuccess) return renderSuccessContent();
    if (sessionConflict) return renderConflictContent();
    return step === 'credentials' ? renderCredentialsContent() : renderPinContent();
  };

  return (
    <div style={styles.outerCanvas} className="anim-fade-in">
      {/* Background Image Asset */}
      <img
        src={abstractBg}
        alt="Portal Background"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.95,
          filter: 'brightness(1.02) contrast(1.05)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      {/* Backdrop overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Main Ultra-Minimalist Card Box */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 28px',
        backgroundColor: '#FFFFFF',
        border: isError
          ? '1px solid #B45309'
          : isSuccess
          ? '1px solid #2E7D5B'
          : '1px solid #E4E4E1',
        borderRadius: '6px',
        position: 'relative',
        zIndex: 10,
        boxSizing: 'border-box',
        transition: 'border-color 150ms ease'
      }} className={isError ? 'anim-shiver' : 'anim-scale-in'}>
        {renderActiveContent()}
      </div>

      {/* Checking / Verification Loader Overlay */}
      {isChecking && !isSuccess && (
        <div style={styles.loaderOverlay} className="anim-fade-in">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '20px 24px',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E1',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid #E4E4E1',
              borderTop: '2px solid #1C1C1E',
              borderRadius: '50%',
              animation: 'rotate 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1C1C1E' }}>Authenticating Credentials...</span>
          </div>
        </div>
      )}

      {/* Action Notification Toast Banner */}
      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <div style={{
            padding: '12px 18px',
            textAlign: 'center',
            backgroundColor: '#0F172A',
            border: isError ? '2px solid #EF4444' : '2px solid #3B82F6',
            borderRadius: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ color: isError ? '#F87171' : '#60A5FA', display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textAlign: 'left' }}>
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  outerCanvas: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: '20px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
    zIndex: 9999,
    boxSizing: 'border-box'
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 250, 249, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000,
    maxWidth: '380px',
    width: 'calc(100% - 40px)'
  }
};

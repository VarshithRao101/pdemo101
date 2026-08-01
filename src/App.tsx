import React, { useState, useEffect, useRef } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { PinView } from './views/PinView';
import { PortfolioView } from './views/PortfolioView';
const AdminDashboardView = React.lazy(() => import('./views/AdminPortalViews').then(m => ({ default: m.AdminDashboardView })));
const AccountantDashboardView = React.lazy(() => import('./views/AccountantPortalViews').then(m => ({ default: m.AccountantDashboardView })));
const AuthenticatorDashboardView = React.lazy(() => import('./views/AuthenticatorPortalViews').then(m => ({ default: m.AuthenticatorDashboardView })));

const UNIVERSAL_HASH = '#/secure-gateway-portal-v2-x9k84m2n7p1q3w5r8z-inspire';
const AUTHENTICATOR_HASH = '#/sec-auth-sys-9i0j7k8l';

import { HorizontalProgressBarLoader } from './components/common/HorizontalProgressBarLoader';

const AppContent: React.FC<{ forcedRole?: 'admin1' | 'admin2' | 'accountant' | 'authenticator' }> = ({ forcedRole }) => {
  const { portalRole, checkSession, logout, isAuthenticated, isAuthLoading, setPortalRole } = useNavigation();
  const [flowStage, setFlowStage] = useState<'portfolio' | 'pin' | 'authenticated'>('portfolio');
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const authStateRef = useRef(isAuthenticated);

  useEffect(() => {
    authStateRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentHash(hash);

      const isAuthGateHash = hash === AUTHENTICATOR_HASH || hash.includes('sec-auth-sys-9i0j7k8l');
      const isUnivGateHash = hash === UNIVERSAL_HASH || hash.includes('secure-gateway-portal-v2') || hash.includes('v1-portal-gate-x89f2a7b');
      const isGenericLoginHash = hash.includes('login') || hash.includes('portal-gate');

      if (isAuthGateHash || isUnivGateHash || isGenericLoginHash) {
        setFlowStage('pin');
        return;
      }

      // Internal authenticated hashes (set after login)
      const isInternalDashboardHash =
        hash.includes('dashboard') ||
        hash.includes('keys') ||
        hash.includes('accounts') ||
        hash.includes('reports') ||
        hash.includes('attendance') ||
        hash.includes('backup') ||
        hash.includes('settings') ||
        hash.includes('sync_integrity');

      if (isInternalDashboardHash) {
        setFlowStage(authStateRef.current ? 'authenticated' : 'pin');
        return;
      }

      const explicitPublicHashes = ['#/portfolio', '#programs', '#why-us', '#campuses', '#enquiry', '#contact', '', '#'];
      const isExplicitPublicNav = explicitPublicHashes.some(h => hash === h || (h !== '' && h !== '#' && hash.startsWith(h)));

      if (isExplicitPublicNav) {
        setFlowStage('portfolio');
        return;
      }

      setFlowStage(isAuthenticated ? 'authenticated' : 'portfolio');
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial evaluation
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, portalRole]);

  // Sync forcedRole to NavigationContext
  useEffect(() => {
    if (forcedRole) {
      setPortalRole(forcedRole);
    }
  }, [forcedRole, setPortalRole]);

  const sessionChecked = useRef(false);

  // Session check on mount
  useEffect(() => {
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    checkSession().then((isValid) => {
      const hash = window.location.hash;
      const isAuthGateHash = hash === AUTHENTICATOR_HASH || hash.includes('sec-auth-sys-9i0j7k8l');
      const isUnivGateHash = hash === UNIVERSAL_HASH || hash.includes('secure-gateway-portal-v2') || hash.includes('v1-portal-gate-x89f2a7b');

      if (isValid || authStateRef.current) {
        setFlowStage('authenticated');
      } else if (isAuthGateHash || isUnivGateHash || hash.includes('login') || hash.includes('portal-gate')) {
        setFlowStage('pin');
      } else {
        setFlowStage('portfolio');
      }
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 800);
    });
  }, [checkSession]);

  // Wire global logout
  useEffect(() => {
    (window as any).logoutUser = () => {
      logout();
      window.location.hash = '#/portfolio';
      setFlowStage('portfolio');
    };
    return () => {
      delete (window as any).logoutUser;
    };
  }, [logout]);

  // Clean transition on logout
  useEffect(() => {
    if (isAuthLoading || isAuthenticated || flowStage !== 'authenticated') {
      return;
    }

    const hash = window.location.hash;
    if (hash === AUTHENTICATOR_HASH || hash.includes('sec-auth-sys-9i0j7k8l') || hash === UNIVERSAL_HASH || hash.includes('v1-portal-gate-x89f2a7b')) {
      setFlowStage('pin');
    } else {
      setFlowStage('portfolio');
    }
  }, [isAuthenticated, isAuthLoading, flowStage]);

  useEffect(() => {
    if (flowStage === 'authenticated') {
      document.body.classList.add('neo-2d');
      document.documentElement.classList.add('neo-2d');
    } else {
      document.body.classList.remove('neo-2d');
      document.documentElement.classList.remove('neo-2d');
    }
  }, [flowStage]);

  if (isInitialLoading) {
    return (
      <HorizontalProgressBarLoader
        message="Initializing Inspire ERP Systems..."
        subMessage="TRNT BEE Technologies"
        durationMs={1200}
        onComplete={() => setIsInitialLoading(false)}
      />
    );
  }

  const renderActiveView = () => {
    if (portalRole === 'admin1') {
      return <AdminDashboardView role="admin1" />;
    }

    if (portalRole === 'admin2') {
      return <AdminDashboardView role="admin2" />;
    }

    if (portalRole === 'accountant') {
      return <AccountantDashboardView />;
    }

    if (portalRole === 'authenticator') {
      return <AuthenticatorDashboardView />;
    }

    return null;
  };

  if (flowStage === 'authenticated') {
    return (
      <ResponsiveLayout>
        <React.Suspense fallback={<HorizontalProgressBarLoader message="Loading Portal View..." durationMs={600} />}>
          {renderActiveView()}
        </React.Suspense>
      </ResponsiveLayout>
    );
  }

  if (flowStage === 'pin') {
    const isAuthMode = currentHash.includes('sec-auth-sys-9i0j7k8l') || currentHash.includes('authenticator');
    return <PinView mode={isAuthMode ? 'authenticator' : 'universal'} onComplete={() => setFlowStage('authenticated')} />;
  }

  return <PortfolioView />;
};

interface AppProps {
  forcedRole?: 'admin1' | 'admin2' | 'accountant' | 'authenticator';
}

function App({ forcedRole }: AppProps = {}) {
  return (
    <NavigationProvider defaultRole={forcedRole}>
      <AppContent forcedRole={forcedRole} />
    </NavigationProvider>
  );
}

export default App;

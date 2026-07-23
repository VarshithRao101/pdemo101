import React, { useState, useEffect, useRef } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { PinView } from './views/PinView';
import { PortfolioView } from './views/PortfolioView';
import { AdminDashboardView } from './views/AdminPortalViews';
import { AccountantDashboardView } from './views/AccountantPortalViews';
import { AuthenticatorDashboardView } from './views/AuthenticatorPortalViews';

const UNIVERSAL_HASH = '#/v1-portal-gate-x89f2a7b';
const AUTHENTICATOR_HASH = '#/sec-auth-sys-9i0j7k8l';

const AppContent: React.FC<{ forcedRole?: 'admin1' | 'admin2' | 'accountant' | 'authenticator' }> = ({ forcedRole }) => {
  const { portalRole, checkSession, logout, isAuthenticated, setPortalRole } = useNavigation();
  const [flowStage, setFlowStage] = useState<'portfolio' | 'pin' | 'authenticated'>('portfolio');
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentHash(hash);
      if (isAuthenticated) {
        setFlowStage('authenticated');
      } else {
        if (hash === AUTHENTICATOR_HASH || hash.includes('sec-auth-sys-9i0j7k8l') || hash === UNIVERSAL_HASH || hash.includes('v1-portal-gate-x89f2a7b')) {
          setFlowStage('pin');
        } else {
          setFlowStage('portfolio');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial evaluation
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

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
      if (isValid) {
        setFlowStage('authenticated');
      }
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
    if (!isAuthenticated && flowStage === 'authenticated') {
      const hash = window.location.hash;
      if (hash === AUTHENTICATOR_HASH || hash.includes('sec-auth-sys-9i0j7k8l') || hash === UNIVERSAL_HASH || hash.includes('v1-portal-gate-x89f2a7b')) {
        setFlowStage('pin');
      } else {
        setFlowStage('portfolio');
      }
    }
  }, [isAuthenticated, flowStage]);

  useEffect(() => {
    if (flowStage === 'authenticated') {
      document.body.classList.add('neo-2d');
      document.documentElement.classList.add('neo-2d');
    } else {
      document.body.classList.remove('neo-2d');
      document.documentElement.classList.remove('neo-2d');
    }
  }, [flowStage]);

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
        {renderActiveView()}
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

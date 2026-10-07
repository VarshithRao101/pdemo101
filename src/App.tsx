import React, { useState, useEffect, useRef } from 'react';
import { STAFF_GATE, AUTH_GATE, isAnyGate } from './constants/gates';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { PinView } from './views/PinView';
import { PortfolioView } from './views/PortfolioView';
const AdminDashboardView = React.lazy(() => import('./views/AdminPortalViews').then(m => ({ default: m.AdminDashboardView })));
const FeeCollectionView = React.lazy(() => import('./views/FeeCollectionViews').then(m => ({ default: m.FeeCollectionView })));
const AuthenticatorDashboardView = React.lazy(() => import('./views/AuthenticatorPortalViews').then(m => ({ default: m.AuthenticatorDashboardView })));

// The two ERP addresses live in src/constants/gates.ts, which also sets out what
// an unlisted address does and does not protect. Imported, not re-declared:
// local aliases are how eleven copies of two strings happened in the first place.

import { HorizontalProgressBarLoader } from './components/common/HorizontalProgressBarLoader';
import { PortalErrorBoundary } from './components/common/PortalErrorBoundary';

const AppContent: React.FC<{ forcedRole?: 'admin1' | 'clerk' | 'authenticator' }> = ({ forcedRole }) => {
  const { portalRole, checkSession, logout, isAuthenticated, isAuthLoading, setPortalRole, activeTab } = useNavigation();
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

      if (isAnyGate(hash)) {
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

    // Safety net: force loading to end after 3s even if checkSession hangs
    const safetyTimeout = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000);

    checkSession()
      .then((isValid) => {
        const hash = window.location.hash;
        if (isValid || authStateRef.current) {
          setFlowStage('authenticated');
        } else if (isAnyGate(hash)) {
          setFlowStage('pin');
        } else {
          setFlowStage('portfolio');
        }
      })
      .catch(() => {
        // Session check failed (network error, server down, etc.)
        // Fall back gracefully based on the current hash
        const hash = window.location.hash;
        if (isAnyGate(hash)) {
          setFlowStage('pin');
        } else {
          setFlowStage('portfolio');
        }
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 800);
      });
  }, [checkSession]);

  // Wire the global session terminator.
  //
  // This is the flowStage-aware version and it deliberately overrides the one
  // NavigationContext installs, because only this component can move the app
  // between stages.
  //
  // It lands on the LOGIN GATE, not the public portfolio. Sending a working
  // user to the marketing site because one request failed is what made the
  // app feel like it randomly threw people out; an ended session should put
  // them where they can get back in, with a reason on screen.
  useEffect(() => {
    const end = (reason?: string) => {
      logout();
      try {
        if (reason) sessionStorage.setItem('session_end_reason', reason);
      } catch { /* ignore */ }
      window.location.hash = STAFF_GATE;
      setFlowStage('pin');
    };
    (window as any).endSession = end;
    (window as any).logoutUser = () => end();
    return () => {
      delete (window as any).endSession;
      delete (window as any).logoutUser;
    };
  }, [logout]);

  // Clean transition on logout
  useEffect(() => {
    if (isAuthLoading || isAuthenticated || flowStage !== 'authenticated') {
      return;
    }

    const hash = window.location.hash;
    if (isAnyGate(hash)) {
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
      // The Rector collects fees through the shared fee collection screen, with no
      // campus to choose first: students are one registry, so the search
      // spans all four campuses and the receipt is recorded against the
      // STUDENT's campus rather than whoever happened to take the money.
      // Picking a campus beforehand only ever narrowed the search.
      if (activeTab === 'fee_collection') {
        return (
          <PortalErrorBoundary portalLabel="Rector — Fee Collection">
            <FeeCollectionView />
          </PortalErrorBoundary>
        );
      }
      return (
        <PortalErrorBoundary portalLabel="Admin Portal (Admin 1)">
          <AdminDashboardView role="admin1" />
        </PortalErrorBoundary>
      );
    }

    if (portalRole === 'clerk') {
      // One fee collection screen for the Rector and every clerk. It is scoped
      // entirely from the account, so a clerk is held to their own campus.
      if (activeTab === 'fee_collection') {
        return (
          <PortalErrorBoundary portalLabel="Clerk Portal — Fee Collection">
            <FeeCollectionView />
          </PortalErrorBoundary>
        );
      }
      return (
        <PortalErrorBoundary portalLabel="Clerk Portal">
          <AdminDashboardView role="clerk" />
        </PortalErrorBoundary>
      );
    }

    if (portalRole === 'authenticator') {
      return (
        <PortalErrorBoundary portalLabel="Authenticator Portal">
          <AuthenticatorDashboardView />
        </PortalErrorBoundary>
      );
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
    const isAuthMode = currentHash === AUTH_GATE || currentHash.includes('authenticator');
    return <PinView mode={isAuthMode ? 'authenticator' : 'universal'} onComplete={() => setFlowStage('authenticated')} />;
  }

  return <PortfolioView />;
};

interface AppProps {
  forcedRole?: 'admin1' | 'clerk' | 'authenticator';
}

function App({ forcedRole }: AppProps = {}) {
  return (
    <NavigationProvider defaultRole={forcedRole}>
      <AppContent forcedRole={forcedRole} />
    </NavigationProvider>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { DashboardView } from './views/DashboardView';
import { AcademicsView } from './views/AcademicsView';
import { UpdatesView } from './views/UpdatesView';
import { ProfileView } from './views/ProfileView';
import { SplashView } from './views/SplashView';
import { PinView } from './views/PinView';
import { AdminDashboardView } from './views/AdminPortalViews';
import { AccountantDashboardView } from './views/AccountantPortalViews';
import { AuthenticatorDashboardView } from './views/AuthenticatorPortalViews';

const AppContent: React.FC<{ forcedRole?: 'student' | 'admin1' | 'admin2' | 'admin3' | 'accountant' | 'authenticator' }> = ({ forcedRole }) => {
  const { activeTab, portalRole, checkSession, logout, isAuthenticated, setPortalRole } = useNavigation();
  const [flowStage, setFlowStage] = useState<'splash' | 'pin' | 'authenticated'>('splash');

  // Sync forcedRole to NavigationContext
  useEffect(() => {
    if (forcedRole) {
      setPortalRole(forcedRole);
    }
  }, [forcedRole, setPortalRole]);
  const sessionChecked = useRef(false);

  // On mount: attempt session recovery during the splash window.
  // If a valid JWT exists, skip PinView entirely and go straight to 'authenticated'.
  useEffect(() => {
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    checkSession().then((isValid) => {
      if (isValid) {
        setFlowStage('authenticated');
      }
      // If not valid, SplashView will complete its animation and call onComplete -> 'pin'
    });
  }, [checkSession]);

  // Wire global logout so other components (e.g. ProfileView) can call window.logoutUser()
  useEffect(() => {
    (window as any).logoutUser = () => {
      logout();
    };
    return () => {
      delete (window as any).logoutUser;
    };
  }, [logout]);

  // Clean transition to PIN screen on logout
  useEffect(() => {
    if (!isAuthenticated && flowStage === 'authenticated') {
      setFlowStage('pin');
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

    if (portalRole === 'admin3') {
      return <AdminDashboardView role="admin3" />;
    }

    if (portalRole === 'accountant') {
      return <AccountantDashboardView />;
    }

    if (portalRole === 'authenticator') {
      return <AuthenticatorDashboardView />;
    }



    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'academics':
        return <AcademicsView />;
      case 'updates':
        return <UpdatesView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  if (flowStage === 'splash') {
    return <SplashView onComplete={() => setFlowStage('pin')} />;
  }

  if (flowStage === 'pin') {
    return <PinView onComplete={() => setFlowStage('authenticated')} hideRoleSelector={!!forcedRole} />;
  }

  return (
    <ResponsiveLayout>
      {renderActiveView()}
    </ResponsiveLayout>
  );
};

interface AppProps {
  forcedRole?: 'student' | 'admin1' | 'admin2' | 'admin3' | 'accountant' | 'authenticator';
}

function App({ forcedRole }: AppProps = {}) {
  return (
    <NavigationProvider defaultRole={forcedRole}>
      <AppContent forcedRole={forcedRole} />
    </NavigationProvider>
  );
}

export default App;

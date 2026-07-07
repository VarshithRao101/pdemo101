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

const AppContent: React.FC = () => {
  const { activeTab, portalRole, checkSession, logout, isAuthenticated } = useNavigation();
  const [flowStage, setFlowStage] = useState<'splash' | 'pin' | 'authenticated'>('splash');
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

    if (portalRole === 'accountant') {
      return <AccountantDashboardView />;
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
    return <PinView onComplete={() => setFlowStage('authenticated')} />;
  }

  return (
    <ResponsiveLayout>
      {renderActiveView()}
    </ResponsiveLayout>
  );
};

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { DashboardView } from './views/DashboardView';
import { AcademicsView } from './views/AcademicsView';
import { UpdatesView } from './views/UpdatesView';
import { ProfileView } from './views/ProfileView';
import { SplashView } from './views/SplashView';
import { PinView } from './views/PinView';
import {
  FacultyDashboardView,
  FacultyClassesView,
  FacultyUpdatesView,
  FacultyProfileView
} from './views/FacultyPortalViews';
import {
  AdminDashboardView,
  AdminReportsView,
  AdminProfileView
} from './views/AdminPortalViews';
import { AdminAiInsightsView } from './views/AdminAiInsightsView';

const AppContent: React.FC = () => {
  const { activeTab, portalRole } = useNavigation();
  const [flowStage, setFlowStage] = useState<'splash' | 'pin' | 'authenticated'>('splash');

  useEffect(() => {
    (window as any).logoutUser = () => {
      setFlowStage('pin');
    };
    return () => {
      delete (window as any).logoutUser;
    };
  }, []);

  const renderActiveView = () => {
    if (portalRole === 'faculty') {
      switch (activeTab) {
        case 'dashboard':
          return <FacultyDashboardView />;
        case 'academics':
          return <FacultyClassesView />;
        case 'updates':
          return <FacultyUpdatesView />;
        case 'profile':
          return <FacultyProfileView />;
        default:
          return <FacultyDashboardView />;
      }
    }

    if (portalRole === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboardView />;
        case 'academics':
          return <AdminAiInsightsView />;
        case 'updates':
          return <AdminReportsView />;
        case 'profile':
          return <AdminProfileView />;
        default:
          return <AdminDashboardView />;
      }
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

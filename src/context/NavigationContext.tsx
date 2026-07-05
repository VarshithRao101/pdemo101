import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type TabType = 'dashboard' | 'academics' | 'updates' | 'profile';
export type AcademicsTabType = 'attendance' | 'marks' | 'fee' | 'results' | 'achievements';
export type PortalRoleType = 'student' | 'parent' | 'faculty' | 'admin';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  academicsTab: AcademicsTabType;
  setAcademicsTab: (tab: AcademicsTabType) => void;
  portalRole: PortalRoleType;
  setPortalRole: (role: PortalRoleType) => void;
  isMobile: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [academicsTab, setAcademicsTab] = useState<AcademicsTabType>('attendance');
  const [portalRole, setPortalRole] = useState<PortalRoleType>('student');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, academicsTab, setAcademicsTab, portalRole, setPortalRole, isMobile }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

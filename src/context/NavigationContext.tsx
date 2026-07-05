import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type TabType = 'dashboard' | 'academics' | 'updates' | 'profile';
export type AcademicsTabType = 'attendance' | 'marks' | 'fee' | 'results' | 'achievements';
export type PortalRoleType = 'student' | 'faculty' | 'admin';
export type ThemeModeType = 'Light' | 'Dark' | 'System';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  academicsTab: AcademicsTabType;
  setAcademicsTab: (tab: AcademicsTabType) => void;
  portalRole: PortalRoleType;
  setPortalRole: (role: PortalRoleType) => void;
  isMobile: boolean;
  themeMode: ThemeModeType;
  setThemeMode: (mode: ThemeModeType) => void;
  theme: 'light' | 'dark';
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<TabType>('dashboard');
  const [academicsTab, setAcademicsTab] = useState<AcademicsTabType>('attendance');
  const [portalRole, setPortalRole] = useState<PortalRoleType>('student');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [themeMode, setThemeModeState] = useState<ThemeModeType>(() => {
    return (localStorage.getItem('portal_theme_mode') as ThemeModeType) || 'Light';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    if (window.location.hash !== `#/${tab}`) {
      window.history.pushState(null, '', '#/' + tab);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash === 'dashboard' || hash === 'academics' || hash === 'updates' || hash === 'profile') {
        setActiveTabState(hash as TabType);
      } else {
        setActiveTabState('dashboard');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    if (window.location.hash) {
      handlePopState();
    } else {
      window.history.replaceState(null, '', '#/dashboard');
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update resolved theme whenever themeMode or system preference changes
  useEffect(() => {
    if (themeMode === 'System') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      setTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setTheme(themeMode === 'Dark' ? 'dark' : 'light');
    }
  }, [themeMode]);

  // Apply resolved theme class to root element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${theme}-theme`);
  }, [theme]);

  const setThemeMode = (mode: ThemeModeType) => {
    setThemeModeState(mode);
    localStorage.setItem('portal_theme_mode', mode);
  };

  return (
    <NavigationContext.Provider value={{
      activeTab,
      setActiveTab,
      academicsTab,
      setAcademicsTab,
      portalRole,
      setPortalRole,
      isMobile,
      themeMode,
      setThemeMode,
      theme,
      isDrawerOpen,
      setIsDrawerOpen
    }}>
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


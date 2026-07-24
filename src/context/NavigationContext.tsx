import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../services/apiClient';
import { connectSocket, disconnectSocket } from '../services/socketClient';

export type TabType = 'dashboard' | 'keys' | 'backup_codes' | 'accounts' | 'sync_integrity';
export type PortalRoleType = 'admin1' | 'admin2' | 'accountant' | 'authenticator';
export type ThemeModeType = 'Light' | 'Dark' | 'System';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  portalRole: PortalRoleType;
  setPortalRole: (role: PortalRoleType) => void;
  isMobile: boolean;
  themeMode: ThemeModeType;
  setThemeMode: (mode: ThemeModeType) => void;
  theme: 'light' | 'dark';
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
  
  // Auth state & methods
  user: any;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (identifier: string, pin: string, loginContext?: string, password?: string) => Promise<any>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode; defaultRole?: PortalRoleType }> = ({ children, defaultRole }) => {
  const [activeTab, setActiveTabState] = useState<TabType>('dashboard');
  const [portalRole, setPortalRole] = useState<PortalRoleType>(defaultRole || 'admin1');

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [themeMode, setThemeModeState] = useState<ThemeModeType>(() => {
    return (localStorage.getItem('portal_theme_mode') as ThemeModeType) || 'Light';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    if (window.location.hash !== `#/${tab}`) {
      window.history.pushState(null, '', '#/' + tab);
    }
  };

  const login = async (identifier: string, pin: string, loginContext?: string, password?: string) => {
    setIsAuthLoading(true);
    try {
      const resolvedContext = loginContext || (window.location.hash.includes('sec-auth-sys-9i0j7k8l') || window.location.hash.includes('authenticator') ? 'authenticator' : 'universal');
      const response = await apiClient.post('/auth/login', {
        identifier,
        password: password || pin,
        pin,
        loginContext: resolvedContext
      });

      const { token, user: userData } = response;
      localStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_token', token);
      connectSocket(token);
      setUser(userData);
      setIsAuthenticated(true);

      // Map backend role to frontend portalRole
      const normRole = (userData.role || '').toLowerCase();
      if (normRole.includes('accountant') || normRole.includes('acc')) {
        setPortalRole('accountant');
      } else if (normRole.includes('admin2') || normRole.includes('principal')) {
        setPortalRole('admin2');
      } else if (normRole.includes('authenticator') || normRole.includes('security')) {
        setPortalRole('authenticator');
      } else {
        setPortalRole('admin1');
      }

      return userData;
    } catch (error) {
      console.error('Login action failed:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    disconnectSocket();
    setUser(null);
    setIsAuthenticated(false);
    setPortalRole('admin1');
  };

  const checkSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) {
      setIsAuthLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    setIsAuthLoading(true);
    try {
      const response = await apiClient.get('/auth/me');
      const { user: userData } = response;
      
      const isExplicitAuthGate = window.location.hash.includes('sec-auth-sys-9i0j7k8l');
      const isExplicitUniversalGate = window.location.hash.includes('v1-portal-gate-x89f2a7b');

      // Only reject if user explicitly clicked cross-portal login URL
      if (isExplicitAuthGate && userData.role !== 'authenticator') {
        console.warn('Clearing saved non-authenticator session on Authenticator URL');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        disconnectSocket();
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      if (isExplicitUniversalGate && userData.role === 'authenticator') {
        console.warn('Clearing saved authenticator session on Universal URL');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        disconnectSocket();
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      setUser(userData);
      setIsAuthenticated(true);
      connectSocket(token);

      const normRoleCheck = (userData.role || '').toLowerCase();
      if (normRoleCheck.includes('accountant') || normRoleCheck.includes('acc')) {
        setPortalRole('accountant');
      } else if (normRoleCheck.includes('admin2') || normRoleCheck.includes('principal')) {
        setPortalRole('admin2');
      } else if (normRoleCheck.includes('authenticator') || normRoleCheck.includes('security')) {
        setPortalRole('authenticator');
      } else {
        setPortalRole('admin1');
      }

      return true;
    } catch (error) {
      console.error('Session restore failed, clearing token:', error);
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      disconnectSocket();
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 2-Hour Inactivity Auto Logout
  useEffect(() => {
    if (!isAuthenticated) return;
    let inactivityTimer: any = null;
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 Hours

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.warn('User inactive for 2 hours. Automatically logging out.');
        logout();
        window.location.hash = '#/portfolio';
      }, INACTIVITY_LIMIT);
    };

    const userEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    userEvents.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      userEvents.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [isAuthenticated]);

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
      portalRole,
      setPortalRole,
      isMobile,
      themeMode,
      setThemeMode,
      theme,
      isDrawerOpen,
      setIsDrawerOpen,
      user,
      isAuthenticated,
      isAuthLoading,
      login,
      logout,
      checkSession
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

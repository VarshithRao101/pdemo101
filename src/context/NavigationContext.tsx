import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

export type TabType =
  | 'dashboard'
  | 'keys'
  | 'backup_codes'
  | 'accounts'
  | 'sync_integrity'
  | 'settings'
  | 'students'
  | 'add_student'
  | 'teachers'
  | 'publishing'
  | 'calendar'
  | 'classes'
  | 'exams'
  | 'academic_fees'
  | 'enquiries'
  | 'attendance'
  | 'fee_editor'
  | 'late_scholarships'
  | 'expenditure'
  | 'salary_status'
  | 'worker_payments'
  | 'enrollment_stats'
  | 'profile'
  | 'registry'
  | 'student_search'
  | 'fee_collection'
  | 'fees'
  | 'home'
  | string;
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
  forceLogin: (identifier: string, pin: string, loginContext?: string, password?: string) => Promise<any>;
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
      setUser(userData);
      setIsAuthenticated(true);

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
    } catch (error: any) {
      if (error?.status !== 409 && error?.data?.status !== 'session_conflict') {
        console.error('Login action failed:', error);
      }
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const forceLogin = async (identifier: string, pin: string, loginContext?: string, password?: string) => {
    setIsAuthLoading(true);
    try {
      const resolvedContext = loginContext || (window.location.hash.includes('sec-auth-sys-9i0j7k8l') || window.location.hash.includes('authenticator') ? 'authenticator' : 'universal');
      const response = await apiClient.post('/auth/force-login', {
        identifier,
        password: password || pin,
        pin,
        loginContext: resolvedContext
      });

      const { token, user: userData } = response;
      localStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_token', token);
      setUser(userData);
      setIsAuthenticated(true);

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
      console.error('Force login action failed:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const refreshToken = sessionStorage.getItem('refresh_token');
    if (token || refreshToken) {
      apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
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

      if (isExplicitAuthGate && userData.role !== 'authenticator') {
        console.warn('Clearing saved non-authenticator session on Authenticator URL');
        logout();
        return false;
      }

      if (isExplicitUniversalGate && userData.role === 'authenticator') {
        console.warn('Clearing saved authenticator session on Universal URL');
        logout();
        return false;
      }

      setUser(userData);
      setIsAuthenticated(true);

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
    } catch (error: any) {
      console.error('Session restore failed, clearing token:', error);
      logout();
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 2-Hour Inactivity Auto Logout
  useEffect(() => {
    if (!isAuthenticated) return;
    let inactivityTimer: any = null;
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000;

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

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'System') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
      root.classList.toggle('dark-theme', systemTheme === 'dark');
      root.classList.toggle('light-theme', systemTheme === 'light');
    } else {
      const chosenTheme = themeMode.toLowerCase() as 'light' | 'dark';
      setTheme(chosenTheme);
      root.classList.toggle('dark-theme', chosenTheme === 'dark');
      root.classList.toggle('light-theme', chosenTheme === 'light');
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeModeType) => {
    setThemeModeState(mode);
    localStorage.setItem('portal_theme_mode', mode);
  };

  // Expose global logout function for 401 session eviction interception
  useEffect(() => {
    (window as any).logoutUser = () => {
      logout();
      window.location.hash = '#/portfolio';
    };
  }, []);

  return (
    <NavigationContext.Provider
      value={{
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
        forceLogin,
        logout,
        checkSession,
      }}
    >
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

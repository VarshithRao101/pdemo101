import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { clearTokens, setTokens, getAccessToken, getRefreshToken, SESSION_IDLE_TIMEOUT_MS, IDLE_MESSAGE } from '../services/session';
import { apiClient , clearGlobalSecurityKey } from '../services/apiClient';

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
  | 'profile'
  | 'registry'
  | 'student_search'
  | 'fee_collection'
  | 'fees'
  | 'home'
  | string;
export type PortalRoleType = 'admin1' | 'clerk' | 'accountant' | 'authenticator';

/**
 * Which portal a signed-in account gets.
 *
 * This existed as three identical inline chains — in login, forceLogin and
 * checkSession — so a change to the mapping had to be made in three places
 * and would have been wrong in whichever one was missed.
 *
 * 'admin2' is still recognised because an account may not have been migrated
 * to 'clerk' yet; both land on the clerk portal, which is what the server's
 * normalizeRole does with the same value.
 */
export const portalRoleFor = (rawRole: string): PortalRoleType => {
  const role = (rawRole || '').toLowerCase();
  if (role.includes('accountant') || role.includes('acc')) return 'accountant';
  if (role.includes('clerk') || role.includes('admin2') || role.includes('principal')) return 'clerk';
  if (role.includes('authenticator') || role.includes('security')) return 'authenticator';
  return 'admin1';
};
export type ThemeModeType = 'Light' | 'Dark' | 'System';

export type ClerkPermissionKey =
  | 'addStudent' | 'editStudent' | 'editFees' | 'collectFees' | 'logExpenditures' | 'manageStaff';

/**
 * Whether the signed-in account may do something.
 *
 * Presentation only. Every one of these is re-checked on the server by
 * requirePermission, because a hidden button stops nobody who can type a URL
 * — this exists so a clerk is not shown modules that would refuse them.
 *
 * admin1 and accountant are unrestricted here for the same reason the server
 * treats them so: admin1 is the account that grants these, and the
 * accountant's abilities are fixed by its own routes.
 */
export const accountCan = (user: any, permission: ClerkPermissionKey): boolean => {
  const role = portalRoleFor(user?.role || '');
  if (role === 'admin1' || role === 'accountant' || role === 'authenticator') return true;
  return user?.permissions?.[permission] === true;
};

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  portalRole: PortalRoleType;
  setPortalRole: (role: PortalRoleType) => void;
  isMobile: boolean;
  /**
   * The campus an org-wide account is currently acting on.
   *
   * Only the Rector needs this: every other role is pinned to one campus by
   * its own account, and modules read it from there. The Rector has campus
   * "All", so a module that acts on exactly one campus — fee collection —
   * has to be told which, and this carries that choice across the navigation
   * that mounts it.
   */
  selectedCampus: string;
  setSelectedCampus: (campus: string) => void;
  themeMode: ThemeModeType;
  setThemeMode: (mode: ThemeModeType) => void;
  theme: 'light' | 'dark';
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
  
  // Auth state & methods
  user: any;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (identifier: string, pin: string, loginContext?: string, password?: string, campus?: string) => Promise<any>;
  forceLogin: (identifier: string, pin: string, loginContext?: string, password?: string, campus?: string) => Promise<any>;
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
  const [selectedCampus, setSelectedCampus] = useState<string>('');

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

  /**
   * Keep activeTab in step with the address bar.
   *
   * Navigation was one-way: setActiveTab wrote the hash, but editing the hash
   * or pressing Back never wrote activeTab. The portal therefore kept showing
   * whatever module the tab still named, regardless of the URL — which
   * stranded a clerk inside fee collection, because that module is chosen by
   * activeTab and nothing they could do from the address bar changed it.
   *
   * pushState does not raise hashchange, so this cannot loop with the setter
   * above; it only fires for a real navigation the user performed.
   */
  useEffect(() => {
    const syncFromHash = () => {
      const tab = window.location.hash.replace(/^#\/?/, '').trim();
      if (tab && tab !== activeTab) setActiveTabState(tab);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [activeTab]);

  const login = async (identifier: string, pin: string, loginContext?: string, password?: string, campus?: string) => {
    setIsAuthLoading(true);
    try {
      const resolvedContext = loginContext || (window.location.hash.includes('sec-auth-sys-9i0j7k8l') || window.location.hash.includes('authenticator') ? 'authenticator' : 'universal');
      // A clerk signs in by campus: the server resolves which of that
      // campus's clerks the password belongs to. Sending an identifier
      // as well would contradict it, so it is one or the other.
      const response = await apiClient.post('/auth/login', campus
        ? { campus, password: password || pin, pin, loginContext: resolvedContext }
        : { identifier, password: password || pin, pin, loginContext: resolvedContext });

      const { token, user: userData } = response;
      // One store. Writing to two locations is what let a refreshed token be
      // shadowed by a stale one and logged people out mid-shift.
      setTokens(token, (response as any).refreshToken);
      setUser(userData);
      setIsAuthenticated(true);

      setPortalRole(portalRoleFor(userData.role));

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

  const forceLogin = async (identifier: string, pin: string, loginContext?: string, password?: string, campus?: string) => {
    setIsAuthLoading(true);
    try {
      const resolvedContext = loginContext || (window.location.hash.includes('sec-auth-sys-9i0j7k8l') || window.location.hash.includes('authenticator') ? 'authenticator' : 'universal');
      const response = await apiClient.post('/auth/force-login', campus
        ? { campus, password: password || pin, pin, loginContext: resolvedContext }
        : { identifier, password: password || pin, pin, loginContext: resolvedContext });

      const { token, user: userData } = response;
      // One store. Writing to two locations is what let a refreshed token be
      // shadowed by a stale one and logged people out mid-shift.
      setTokens(token, (response as any).refreshToken);
      setUser(userData);
      setIsAuthenticated(true);

      setPortalRole(portalRoleFor(userData.role));

      return userData;
    } catch (error) {
      console.error('Force login action failed:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (token || refreshToken) {
      // Server-side revocation is what actually ends the session; clearing
      // local storage alone would leave the token usable until it expired.
      apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    clearTokens();
    clearGlobalSecurityKey();
    setUser(null);
    setIsAuthenticated(false);
    setPortalRole('admin1');
  };

  const checkSession = async (): Promise<boolean> => {
    const token = getAccessToken();
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

      setPortalRole(portalRoleFor(userData.role));

      return true;
    } catch (error: any) {
      console.error('Session restore failed, clearing token:', error);
      logout();
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Idle expiry.
  //
  // The window comes from SESSION_IDLE_TIMEOUT_MS (3h default, overridable via
  // VITE_SESSION_IDLE_TIMEOUT_MS) rather than a literal buried here.
  //
  // Only genuine human interaction resets it. Background polling deliberately
  // does NOT: an unattended machine left on a dashboard that refreshes itself
  // would otherwise stay authenticated indefinitely.
  useEffect(() => {
    if (!isAuthenticated) return;
    let inactivityTimer: any = null;

    const expire = () => {
      console.warn('Session idle limit reached. Ending session.');
      logout();
      (window as any).endSession?.(IDLE_MESSAGE);
    };

    const reset = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(expire, SESSION_IDLE_TIMEOUT_MS);
    };

    const userEvents = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll', 'wheel'];
    userEvents.forEach(evt => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      userEvents.forEach(evt => window.removeEventListener(evt, reset));
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

  // Global session terminator.
  //
  // Called when the session is genuinely over (refresh failed, evicted
  // elsewhere, idle timeout). It lands on the LOGIN GATE with a reason —
  // never on the public marketing site, which is what made an ordinary error
  // look like the app had thrown the user out of the building.
  useEffect(() => {
    (window as any).endSession = (reason?: string) => {
      logout();
      try {
        if (reason) sessionStorage.setItem('session_end_reason', reason);
      } catch { /* ignore */ }
      window.location.hash = '#/v1-portal-gate-x89f2a7b';
    };
    // Kept for older call sites; same behaviour.
    (window as any).logoutUser = () => (window as any).endSession();
    return () => {
      delete (window as any).endSession;
      delete (window as any).logoutUser;
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
        selectedCampus,
        setSelectedCampus,
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

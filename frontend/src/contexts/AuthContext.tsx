import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api, UserProfile, RolePermissions } from '../lib/api';
import { hasPermission, isAdmin as checkIsAdmin } from '../utils/permissions';
import { useTenant } from './TenantContext';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (module: keyof RolePermissions, action: string) => boolean;
  permissions: RolePermissions | null;
  roleName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { retryTenant } = useTenant();

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      return;
    }

    const data = await api.getCurrentUser();
    setUser(data.profile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const query = new URLSearchParams(window.location.search);

      // ── OTT exchange (new secure flow from marketing site) ────────────────
      const ott = query.get('ott');
      if (ott) {
        let ottDone = false;
        try {
          const { session, slug, profile } = await api.exchangeOTT(ott);
          localStorage.setItem('access_token', session.access_token);
          localStorage.setItem('refresh_token', session.refresh_token);

          if (slug) {
            sessionStorage.setItem('tenant_slug', slug);
            retryTenant();
          }

          // Server returned the profile inline — set user immediately, no extra round-trip
          if (profile && isMounted) {
            setUser(profile);
            ottDone = true;
          }
        } catch (err) {
          console.error('OTT exchange failed:', err);
        } finally {
          query.delete('ott');
          const remaining = query.toString();
          window.history.replaceState(null, '', window.location.pathname + (remaining ? `?${remaining}` : ''));
        }

        // Profile already set — skip the separate /api/auth/me call
        if (ottDone) {
          if (isMounted) setLoading(false);
          return;
        }
      }

      const tokenAtStart = localStorage.getItem('access_token');

      try {
        if (!tokenAtStart) {
          if (isMounted) setLoading(false);
          return;
        }

        const data = await api.getCurrentUser();
        if (isMounted) {
          setUser(data.profile);
        }
      } catch (error) {
        console.error('Auth check failed:', error);

        if (localStorage.getItem('access_token') === tokenAtStart) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.profile);
    retryTenant();
  }, [retryTenant]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }, []);

  const isAdmin = checkIsAdmin(user);
  const isSuperAdmin = user?.is_superadmin === true;
  const permissions = user?.user_roles?.permissions || null;
  const roleName = user?.user_roles?.role_name || 'Unknown';

  const checkPermission = useCallback((module: keyof RolePermissions, action: string) => {
    // Superadmins have all permissions
    if (user?.is_superadmin) return true;
    return hasPermission(user, module, action);
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAdmin: isAdmin || isSuperAdmin,
    isSuperAdmin,
    hasPermission: checkPermission,
    permissions,
    roleName
  }), [user, loading, login, logout, refreshUser, isAdmin, isSuperAdmin, checkPermission, permissions, roleName]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

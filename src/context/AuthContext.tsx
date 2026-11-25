import { createContext, useCallback, useContext, useState } from 'react';
import type { Role } from '../types';

interface AuthCtxValue {
  role: Role | null;
  isAuthenticated: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

const STORAGE_KEY = 'csms.role';
const ROLES: Role[] = ['customer', 'employee', 'admin'];

function readStoredRole(): Role | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return ROLES.includes(v as Role) ? (v as Role) : null;
  } catch {
    return null;
  }
}

const AuthCtx = createContext<AuthCtxValue>({
  role: null, isAuthenticated: false, login: () => {}, logout: () => {},
});

/**
 * Mock auth. When the ASP.NET Core API is ready:
 *  - login():  store the JWT (and user) returned by POST /api/v1/auth/login
 *  - logout(): clear the JWT
 *  - on startup: validate the stored token with GET /api/v1/auth/me
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(readStoredRole);

  const login = useCallback((r: Role) => {
    try { localStorage.setItem(STORAGE_KEY, r); } catch { /* ignore */ }
    setRole(r);
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setRole(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ role, isAuthenticated: role !== null, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthCtx);
}

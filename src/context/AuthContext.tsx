import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Role } from '../types';

interface AuthCtxValue {
  role: Role | null;
  isAuthenticated: boolean;
  login: (role: Role, token?: string) => void;
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

function readTokenExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const expirySeconds = typeof payload.exp === 'number' ? payload.exp : Number(payload.exp);
    return Number.isFinite(expirySeconds) && expirySeconds > 0 ? expirySeconds * 1000 : null;
  } catch {
    return null;
  }
}

const AuthCtx = createContext<AuthCtxValue>({
  role: null, isAuthenticated: false, login: () => {}, logout: () => {},
});

/** Keeps the active role and JWT session in sync with the backend token. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(readStoredRole);
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem('csms.token'); } catch { return null; }
  });

  const login = useCallback((r: Role, token?: string) => {
    try { localStorage.setItem(STORAGE_KEY, r); } catch { /* ignore */ }
    if (token) {
      try { localStorage.setItem('csms.token', token); } catch { /* ignore */ }
    }
    setToken(token ?? null);
    setRole(r);
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('csms.token'); } catch { /* ignore */ }
    setToken(null);
    setRole(null);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => logout();
    window.addEventListener('csms:session-expired', onSessionExpired);
    return () => window.removeEventListener('csms:session-expired', onSessionExpired);
  }, [logout]);

  useEffect(() => {
    if (!role) return;
    if (!token) { logout(); return; }
    const expiresAt = readTokenExpiry(token);
    if (expiresAt === null) { logout(); return; }
    let timer: number | undefined;
    const checkExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { logout(); return; }
      timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_000_000));
    };
    checkExpiry();
    const recheckOnResume = () => {
      if (document.visibilityState === 'visible' && expiresAt <= Date.now()) logout();
    };
    window.addEventListener('focus', recheckOnResume);
    document.addEventListener('visibilitychange', recheckOnResume);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', recheckOnResume);
      document.removeEventListener('visibilitychange', recheckOnResume);
    };
  }, [role, token, logout]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'csms.token' && event.newValue === null) logout();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [logout]);

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

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import { ROUTES, homePathForRole } from './paths';

/** Only lets `role` through. Logged-out → /login. Wrong role → that user's own home page. */
export function RequireRole({ role }: { role: Role }) {
  const { role: current } = useAuth();
  const location = useLocation();

  if (!current) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  if (current !== role) return <Navigate to={homePathForRole(current)} replace />;
  return <Outlet />;
}

/** Login page is for logged-out users only. */
export function PublicOnlyRoute() {
  const { role } = useAuth();
  if (role) return <Navigate to={homePathForRole(role)} replace />;
  return <Outlet />;
}

/** "/" and unknown URLs → wherever this user belongs. */
export function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={role ? homePathForRole(role) : ROUTES.login} replace />;
}

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TopBar } from './TopBar';
import { EmployeeNav } from './EmployeeNav';
import { PageFallback } from '../ui/PageFallback';

export function EmployeeLayout() {
  const { logout } = useAuth();
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar role="employee" onLogout={logout} />
      <EmployeeNav />
      <main className="flex-1 overflow-y-auto" role="main">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

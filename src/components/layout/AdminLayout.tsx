import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TopBar } from './TopBar';
import { PageFallback } from '../ui/PageFallback';
import { SlidingSidebar } from './SlidingSidebar';

export function AdminLayout() {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <TopBar role="admin" onLogout={logout} onMenuClick={() => setMobileMenuOpen(value => !value)} menuOpen={mobileMenuOpen} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SlidingSidebar role="admin" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(value => !value)} />
        <main className="flex-1 min-w-0 overflow-y-auto" role="main">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

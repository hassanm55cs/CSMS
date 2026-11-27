import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TopBar } from './TopBar';
import { SlidingSidebar } from './SlidingSidebar';
import { PageFallback } from '../ui/PageFallback';
import { connectNotificationHub } from '../../utils/signalr';

export function DriverLayout() {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const triggerSync = (payload: unknown) => {
      window.dispatchEvent(new CustomEvent('csms:driver-emergency-sync', { detail: payload }));
    };

    return connectNotificationHub({
      handlers: {
        EmergencyRequestCreated: triggerSync,
        EmergencyRequestUpdated: triggerSync,
      },
      onStarted: () => triggerSync(null),
      onReconnected: () => triggerSync(null),
    });
  }, []);

  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <TopBar role="driver" onLogout={logout} onMenuClick={() => setMobileMenuOpen(v => !v)} menuOpen={mobileMenuOpen} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SlidingSidebar role="driver" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(v => !v)} />
        <main className="flex-1 min-w-0 overflow-y-auto" role="main">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

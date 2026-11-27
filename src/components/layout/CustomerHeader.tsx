import { useNavigate } from 'react-router-dom';
import { MOCK_USER } from '../../data/mock-data';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../routes/paths';
import { TopBarControls } from './TopBarControls';
import { Icon } from '../ui/Icon';
import { CustomerNotificationWidget } from './CustomerNotificationWidget';
import { SidebarToggle } from './SidebarToggle';

export function CustomerHeader({ notificationCount, onNotificationsBellClick, onMenuClick, menuOpen }: { notificationCount: number; onNotificationsBellClick: () => Promise<void>; onMenuClick: () => void; menuOpen: boolean }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b"
      style={{ background: 'color-mix(in srgb, var(--surface) 84%, transparent)', borderColor: 'var(--border)', backdropFilter: 'blur(18px) saturate(150%)' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(ROUTES.customer.dashboard)}>
        <SidebarToggle open={menuOpen} onToggle={onMenuClick} className="header-sidebar-toggle" />
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>CSMS</span>
      </div>
      <div className="flex items-center gap-2">
        <CustomerNotificationWidget unreadCount={notificationCount} onBellClick={onNotificationsBellClick} />
        <TopBarControls onLogout={logout} onProfile={() => navigate(ROUTES.customer.profile)} userName={MOCK_USER.name} />
      </div>
    </header>
  );
}

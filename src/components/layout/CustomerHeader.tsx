import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../routes/paths';
import { TopBarControls } from './TopBarControls';
import { CustomerNotificationWidget } from './CustomerNotificationWidget';
import { SidebarToggle } from './SidebarToggle';
import { getTokenDisplayName } from '../../utils/userDisplayName';

export function CustomerHeader({
  customerName,
  notificationCount,
  onNotificationsBellClick,
  onMenuClick,
  menuOpen,
}: {
  customerName?: string;
  notificationCount: number;
  onNotificationsBellClick: () => Promise<void>;
  onMenuClick: () => void;
  menuOpen: boolean;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const displayName = customerName?.trim() || getTokenDisplayName();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate(ROUTES.customer.dashboard)}>
        <SidebarToggle open={menuOpen} onToggle={onMenuClick} className="header-sidebar-toggle" />
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>CSMS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CustomerNotificationWidget unreadCount={notificationCount} onBellClick={onNotificationsBellClick} />
        <TopBarControls onLogout={logout} onProfile={() => navigate(ROUTES.customer.profile)} userName={displayName} />
      </div>
    </header>
  );
}

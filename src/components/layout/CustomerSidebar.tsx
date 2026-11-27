import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useT } from '../../i18n/useT';
import { Icon } from '../ui/Icon';

export function CustomerSidebar({ showRentals }: { showRentals: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const items: { path: string; icon: string; label: string; isSos?: boolean }[] = [
    { path: ROUTES.customer.dashboard,    icon: 'home', label: t.dashboard },
    { path: ROUTES.customer.bookService, icon: 'wrench', label: t.bookService },
    { path: ROUTES.customer.visits, icon: 'info', label: t.visits },
    { path: ROUTES.customer.notifications, icon: 'bell', label: 'Notifications' },
    ...(showRentals ? [{ path: ROUTES.customer.rentals, icon: 'car', label: t.rentACar }] : []),
    { path: ROUTES.customer.sos,          icon: 'alert', label: t.sos, isSos: true },
    { path: ROUTES.customer.profile,      icon: 'user', label: t.profile },
  ];
  return (
    <aside className="sidebar hidden md:flex">
      <div className="flex items-center gap-2 px-2 pb-5 pt-1 mb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
          <svg width="16" height="16" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t.appName}</span>
      </div>
      {items.map(item => (
        <button key={item.path} onClick={() => navigate(item.path)}
          className={`sidebar-item ${item.isSos ? 'sos' : ''} ${isActivePath(pathname, item.path) ? 'active' : ''}`}
          aria-current={isActivePath(pathname, item.path) ? 'page' : undefined}>
          <Icon name={item.icon as 'home' | 'wrench' | 'car' | 'alert' | 'user' | 'info' | 'bell'} size={18} /> {item.label}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs font-mono px-2" style={{ color: 'var(--text-4)' }}>
          {/* AI placeholder: wire to /api/v1/ai/diagnose */}
          <div className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
             <span className="font-semibold text-xs">AI Assistant</span>
            <span className="ml-auto text-xs opacity-60">soon</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

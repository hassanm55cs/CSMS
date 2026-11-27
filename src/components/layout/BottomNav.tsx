import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useT } from '../../i18n/useT';
import { Icon } from '../ui/Icon';

export function BottomNav({ showRentals }: { showRentals: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const tabs: { path: string; icon: string; label: string; isSos?: boolean }[] = [
    { path: ROUTES.customer.dashboard,    icon: 'home', label: t.dashboard },
    { path: ROUTES.customer.bookService, icon: 'wrench', label: t.bookService },
    { path: ROUTES.customer.visits,      icon: 'info', label: t.visits },
    { path: ROUTES.customer.sos,          icon: 'alert', label: t.sos, isSos: true },
    ...(showRentals ? [{ path: ROUTES.customer.rentals, icon: 'car', label: t.rentACar }] : []),
    { path: ROUTES.customer.profile,      icon: 'user', label: t.profile },
  ];
  return (
    <nav className="bottom-nav md:hidden" aria-label="Main navigation">
      {tabs.map(tab => (
        <button key={tab.path} onClick={() => navigate(tab.path)}
          className={`nav-tab ${tab.isSos ? 'sos' : ''} ${isActivePath(pathname, tab.path) && !tab.isSos ? 'active' : ''}`}
          aria-label={tab.label} aria-current={isActivePath(pathname, tab.path) ? 'page' : undefined}>
          {tab.isSos ? (
            <span className="nav-tab-icon flex items-center justify-center w-10 h-10 rounded-full sos-pulse"
              style={{ background: 'var(--sos)', color: 'white', fontSize: '18px' }}>
              <Icon name="alert" size={20} />
            </span>
          ) : (
            <span className="nav-tab-icon"><Icon name={tab.icon as 'home' | 'wrench' | 'car' | 'user' | 'info'} size={21} /></span>
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

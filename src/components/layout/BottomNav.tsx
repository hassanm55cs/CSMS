import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useT } from '../../i18n/useT';

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const tabs: { path: string; icon: string; label: string; isSos?: boolean }[] = [
    { path: ROUTES.customer.dashboard,    icon: '🏠', label: t.dashboard },
    { path: ROUTES.customer.bookService, icon: '🔧', label: t.bookService },
    { path: ROUTES.customer.sos,          icon: '🆘', label: t.sos, isSos: true },
    { path: ROUTES.customer.rentals,      icon: '🚗', label: t.rentACar },
    { path: ROUTES.customer.profile,      icon: '👤', label: t.profile },
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
              🆘
            </span>
          ) : (
            <span className="nav-tab-icon">{tab.icon}</span>
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';

export function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links: { path: string; icon: string; label: string }[] = [
    { path: ROUTES.admin.dashboard, icon: '📊', label: 'Dashboard' },
    { path: ROUTES.admin.branches,  icon: '📍', label: 'Branches'  },
    { path: ROUTES.admin.fleet,     icon: '🚛', label: 'Fleet'     },
    { path: ROUTES.admin.staff,     icon: '👥', label: 'Staff'     },
    { path: ROUTES.admin.reports,         icon: '📈', label: 'Reports'   },
  ];
  return (
    <aside className="sidebar hidden md:flex">
      <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
          <svg width="14" height="14" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>CSMS Admin</span>
      </div>
      {links.map(l => (
        <button key={l.path} onClick={() => navigate(l.path)}
          className={`sidebar-item ${isActivePath(pathname, l.path) ? 'active' : ''}`}
          aria-current={isActivePath(pathname, l.path) ? 'page' : undefined}>
          <span>{l.icon}</span> {l.label}
        </button>
      ))}
    </aside>
  );
}

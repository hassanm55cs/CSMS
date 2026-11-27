import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { Icon } from '../ui/Icon';

export function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links: { path: string; icon: 'home' | 'info' | 'car' | 'user' | 'driver' | 'sparkles' | 'calendar' | 'alert'; label: string }[] = [
    { path: ROUTES.admin.dashboard, icon: 'home', label: 'Dashboard' },
    { path: ROUTES.admin.branches,  icon: 'info', label: 'Branches'  },
    { path: ROUTES.admin.fleet,     icon: 'car', label: 'Fleet'     },
    { path: ROUTES.admin.staff,     icon: 'user', label: 'Employees' },
    { path: ROUTES.admin.drivers,   icon: 'driver', label: 'Driver Approvals' },
    { path: ROUTES.admin.products,  icon: 'sparkles', label: 'Products' },
    { path: ROUTES.admin.inventory, icon: 'info', label: 'Inventory' },
    { path: ROUTES.admin.schedules, icon: 'calendar', label: 'Service Schedules' },
    { path: ROUTES.admin.emergencies, icon: 'alert', label: 'Emergencies' },
    { path: ROUTES.admin.records, icon: 'car', label: 'Record Lookup' },
    { path: ROUTES.admin.reports,   icon: 'sparkles', label: 'Reports'   },
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
          <Icon name={l.icon} size={18} /> {l.label}
        </button>
      ))}
    </aside>
  );
}

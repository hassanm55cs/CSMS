import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useVisits } from '../../context/VisitsContext';
import { Icon } from '../ui/Icon';

export function EmployeeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { visits } = useVisits();
  const activeCount = visits.filter(v => ['requested', 'diagnosis-pending', 'pending-fix', 'in-progress'].includes(v.status)).length;
  const links = [
    { path: ROUTES.employee.dashboard, label: 'My Dashboard', icon: 'home' as const },
    { path: ROUTES.employee.visits, label: 'Visits', icon: 'wrench' as const },
  ];
  return <aside className="sidebar hidden md:flex">
    <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--primary)' }}><Icon name="car" size={17} /></div>
      <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>CSMS Employee</span>
    </div>
    {links.map(link => <button key={link.path} onClick={() => navigate(link.path)} className={'sidebar-item' + (isActivePath(pathname, link.path) ? ' active' : '')} aria-current={isActivePath(pathname, link.path) ? 'page' : undefined}>
      <Icon name={link.icon} size={18} />{link.label}
      {link.path === ROUTES.employee.visits && activeCount > 0 && <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>{activeCount}</span>}
    </button>)}
    {activeCount > 0 && <div className="mt-auto pt-4 border-t flex items-center gap-2 text-xs font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />{activeCount} active visits</div>}
  </aside>;
}

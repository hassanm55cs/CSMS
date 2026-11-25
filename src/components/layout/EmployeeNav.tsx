import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useVisits } from '../../context/VisitsContext';

export function EmployeeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { visits } = useVisits();
  const activeCount = visits.filter(v => ['requested', 'diagnosis-pending', 'pending-fix', 'in-progress'].includes(v.status)).length;
  return (
    <div className="flex border-b px-4 gap-1" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {([[ROUTES.employee.dashboard, '👤', 'My Dashboard'], [ROUTES.employee.visits, '📋', 'Visits']] as [string, string, string][]).map(([v, icon, label]) => (
        <button key={v} onClick={() => navigate(v)}
          className="px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-all relative"
          style={{ borderColor: isActivePath(pathname, v) ? 'var(--primary)' : 'transparent', color: isActivePath(pathname, v) ? 'var(--primary)' : 'var(--text-3)' }}>
          <span>{icon}</span> {label}
          {v === ROUTES.employee.visits && activeCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ background: 'var(--primary)' }}>{activeCount}</span>
          )}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2 py-2 text-xs font-mono" style={{ color: 'var(--text-4)' }}>
        {activeCount > 0 && <><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#16A34A' }} />{activeCount} active</>}
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { MECHANIC } from '../../data/employee-data';
import { ROUTES } from '../../routes/paths';
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge';
import { useVisits } from '../../context/VisitsContext';

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { visits } = useVisits();
  const m = MECHANIC;
  const activeVisit = visits.find(v => v.status === 'pending-fix' || v.status === 'in-progress');
  const pendingCount = visits.filter(v => ['requested', 'diagnosis-pending'].includes(v.status)).length;
  const awaitingCount = visits.filter(v => v.status === 'pending-customer-confirmation').length;
  return (
    <div className="page-in p-4 sm:p-6">
      {/* Profile */}
      <div className="card flex gap-4 mb-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>DC</div>
        <div className="flex-1">
          <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>{m.name}</div>
          <div className="text-sm" style={{ color: 'var(--text-3)' }}>{m.role} · {m.branch}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {m.specializations.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full text-xs font-mono" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--blue-200)' }}>{s}</span>
            ))}
          </div>
        </div>
        <div className="text-right text-xs font-mono" style={{ color: 'var(--text-4)' }}>{m.employeeId}</div>
      </div>

      {/* Active job alert */}
      {activeVisit && (
        <button onClick={() => navigate(ROUTES.employee.visits)}
          className="card w-full text-left card-hover mb-5 flex items-center gap-3"
          style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="text-2xl">🔧</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Active Job: {activeVisit.id}</span>
              <VisitStatusBadge status={activeVisit.status} />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>{activeVisit.requestedService} · {activeVisit.car.brand} {activeVisit.car.model}</div>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Open →</span>
        </button>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pending Visits',  value: `${pendingCount}`,   icon: '📋', alert: pendingCount > 0 },
          { label: 'Awaiting Customer', value: `${awaitingCount}`, icon: '⏳', alert: false },
          { label: 'Avg Rating', value: `${m.avgRating}★`, icon: '⭐', alert: false },
          { label: 'Bonus', value: `EGP ${m.bonus}`, icon: '💰', alert: false },
        ].map(k => (
          <div key={k.label} className="card text-center relative" style={{ padding: '16px 12px' }}>
            {k.alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />}
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="font-bold text-lg" style={{ color: k.alert ? 'var(--primary)' : 'var(--text)' }}>{k.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Salary */}
        <div className="card">
          <div className="font-bold text-base mb-4" style={{ color: 'var(--text)' }}>Salary & Pay</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>BASE</div><div className="font-bold text-lg" style={{ color: 'var(--text)' }}>EGP {m.salary.toLocaleString()}</div></div>
            <div><div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>BONUS</div><div className="font-bold text-lg" style={{ color: 'var(--primary)' }}>+EGP {m.bonus}</div></div>
            <div><div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>NEXT PAY</div><div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{m.nextPay}</div></div>
          </div>
          <div className="space-y-2">
            {m.payHistory.map(p => (
              <div key={p.month} className="flex items-center gap-2 text-sm">
                <span className="font-mono w-8" style={{ color: 'var(--text-3)' }}>{p.month}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${(p.net / 5000) * 100}%`, background: 'var(--primary)' }} />
                </div>
                <span className="font-mono w-20 text-right" style={{ color: 'var(--text)' }}>EGP {p.net.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visit queue summary */}
        <div className="card">
          <div className="font-bold text-base mb-4" style={{ color: 'var(--text)' }}>Today's Queue</div>
          <div className="space-y-2">
            {visits.map(v => (
              <div key={v.id} className="flex items-center gap-2 text-sm py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono text-xs w-20 flex-shrink-0" style={{ color: 'var(--text-4)' }}>{v.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-xs" style={{ color: 'var(--text)' }}>{v.customerName}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--text-3)' }}>{v.car.brand} {v.car.model}</div>
                </div>
                <VisitStatusBadge status={v.status} />
              </div>
            ))}
          </div>
          <button onClick={() => navigate(ROUTES.employee.visits)} className="btn btn-primary btn-sm w-full mt-3">
            Open Visits →
          </button>
        </div>
      </div>
    </div>
  );
}

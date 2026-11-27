import { VisitStatusBadge } from './VisitStatusBadge';
import { type Visit } from '../../data/mock-data';

export function VisitCard({ visit, onClick, dimmed }: { visit: Visit; onClick: () => void; dimmed?: boolean }) {
  const isPendingFix = visit.status === 'pending-fix';
  return (
    <button onClick={onClick}
      className={`w-full card card-hover text-left transition-all ${dimmed ? 'opacity-60' : ''}`}
      style={{ borderLeft: `4px solid ${isPendingFix ? 'var(--primary)' : visit.status === 'requested' ? '#16A34A' : 'var(--border)'}` }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{visit.id}</span>
            <VisitStatusBadge status={visit.status} />
            {visit.status === 'pending-fix' && (
              <span className="text-xs font-semibold animate-pulse" style={{ color: 'var(--primary)' }}>→ Start Fix</span>
            )}
            {visit.status === 'requested' && (
              <span className="text-xs font-semibold" style={{ color: '#16A34A' }}>→ Start Diagnosis</span>
            )}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{visit.requestedService}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{visit.customerName} · {visit.customerPhone}</div>
        </div>
        <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
          <img src={`https://images.unsplash.com/${visit.car.img}?w=96&h=80&fit=crop`} alt={visit.car.brand} className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-4)' }}>
        <span> {visit.car.brand} {visit.car.model} · {visit.car.plate}</span>
        <span> {new Date(visit.scheduledAt).toLocaleDateString('en-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {visit.diagnosis.length > 0 && (
          <span style={{ color: visit.diagnosis.some(d => d.severity === 'critical') ? '#DC2626' : 'var(--text-4)' }}>
             {visit.diagnosis.length} issue{visit.diagnosis.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {visit.customerNotes && (
        <div className="mt-2 text-xs p-2 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
           "{visit.customerNotes}"
        </div>
      )}
    </button>
  );
}

import { useNavigate, useOutletContext } from 'react-router-dom';
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge';
import { Icon } from '../../components/ui/Icon';
import { ROUTES } from '../../routes/paths';
import type { EmployeeOutletContext } from '../../components/layout/EmployeeLayout';

const keyOf = (status: string) => status.toLowerCase().replace(/[^a-z]/g, '');

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { visits, loading, error, refreshVisits } = useOutletContext<EmployeeOutletContext>();
  const pending = visits.filter(visit => ['requested', 'underdiagnosis'].includes(keyOf(visit.status)));
  const waiting = visits.filter(visit => keyOf(visit.status) === 'pendingcustomerconfirmation');
  const approved = visits.filter(visit => keyOf(visit.status) === 'approved');
  const inProgress = visits.filter(visit => keyOf(visit.status) === 'inprogress');
  const active = [...inProgress, ...approved][0];
  const openVisit = (visitId: number) => navigate(`${ROUTES.employee.visits}?visitId=${visitId}`);

  return <div className="page-in p-4 sm:p-6 max-w-6xl mx-auto">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div><h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Employee dashboard</h1><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{visits[0]?.branchName ? `Branch: ${visits[0].branchName}` : 'Your assigned branch visits and work queue.'}</p></div>
      <div className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={() => void refreshVisits()} disabled={loading}>Refresh</button><button className="btn btn-primary btn-sm" onClick={() => navigate(ROUTES.employee.visits)}>Open visits</button></div>
    </div>
    {error && <div className="card mb-4 flex items-center justify-between gap-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}><span>{error}</span><button className="btn btn-secondary btn-sm" onClick={() => void refreshVisits()}>Retry</button></div>}
    {active && <button onClick={() => openVisit(active.visitId)} className="card w-full text-left card-hover mb-5 flex items-center gap-3" style={{ borderLeft: '4px solid var(--primary)' }}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name="wrench" size={20} /></span>
      <span className="flex-1 min-w-0"><span className="block font-bold text-sm" style={{ color: 'var(--text)' }}>Active work · {active.bookingReference}</span><span className="block text-xs mt-1" style={{ color: 'var(--text-3)' }}>{active.carCompany} {active.carModel} · {active.carLicencePlate}</span></span><VisitStatusBadge status={active.status} />
    </button>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Needs diagnosis', value: pending.length, icon: 'info' as const },
        { label: 'Awaiting customer', value: waiting.length, icon: 'bell' as const },
        { label: 'Approved jobs', value: approved.length, icon: 'check' as const },
        { label: 'In progress', value: inProgress.length, icon: 'wrench' as const },
      ].map(item => <div key={item.label} className="card flex items-center gap-3"><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name={item.icon} size={19} /></span><span><span className="block font-bold text-xl" style={{ color: 'var(--text)' }}>{loading ? '—' : item.value}</span><span className="block text-xs" style={{ color: 'var(--text-3)' }}>{item.label}</span></span></div>)}
    </div>

    <section className="card">
      <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-bold" style={{ color: 'var(--text)' }}>Visit queue</h2><p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Assigned work and unassigned visits for your branch.</p></div><span className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{visits.length} visits</span></div>
      {loading ? <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>Loading visits…</p>
        : visits.length === 0 ? <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>No visits are available for your branch.</p>
        : <div className="space-y-2">{visits.slice(0, 6).map(visit => <button key={visit.visitId} onClick={() => openVisit(visit.visitId)} aria-label={`Open visit ${visit.bookingReference}`} className="group w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md hover:bg-[var(--primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" style={{ background: 'var(--surface-2)' }}>
          <span className="font-mono text-xs w-20 flex-shrink-0" style={{ color: 'var(--text-4)' }}>{visit.bookingReference}</span><span className="flex-1 min-w-0"><span className="block truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{visit.carCompany} {visit.carModel} · {visit.carLicencePlate}</span><span className="block text-xs mt-1" style={{ color: 'var(--text-3)' }}>{visit.branchName} · {visit.serviceDate} · {visit.serviceCount} {visit.serviceCount === 1 ? 'service' : 'services'}</span></span><VisitStatusBadge status={visit.status} /><span className="text-xs font-semibold whitespace-nowrap opacity-60 transition-opacity group-hover:opacity-100" style={{ color: 'var(--primary)' }}>Open →</span>
        </button>)}</div>}
      {visits.length > 6 && <button onClick={() => navigate(ROUTES.employee.visits)} className="btn btn-secondary btn-sm w-full mt-3">See all {visits.length} visits</button>}
    </section>
  </div>;
}

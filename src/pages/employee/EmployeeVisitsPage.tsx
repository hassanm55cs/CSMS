import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { SeverityPill } from '../../components/visits/SeverityPill';
import { Toast } from '../../components/ui/Toast';
import { VisitCard } from '../../components/visits/VisitCard';
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge';
import { type Visit, type VisitStatus, type Severity, type DiagnosisItem } from '../../data/mock-data';
import { useVisits } from '../../context/VisitsContext';

export default function EmployeeVisitsPage() {
  const { visits, updateVisit: onUpdate } = useVisits();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subView, setSubView] = useState<'list' | 'diagnose' | 'job'>('list');

  // Diagnosis form state
  const [diagItems, setDiagItems]   = useState<DiagnosisItem[]>([]);
  const [newDesc, setNewDesc]       = useState('');
  const [newSev, setNewSev]         = useState<Severity>('normal');
  const [newCost, setNewCost]       = useState('');
  const [mechNotes, setMechNotes]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);

  // Checklist state for "pending-fix" job
  const [checklist, setChecklist]   = useState<{ task: string; done: boolean }[]>([]);
  const [jobNotes, setJobNotes]     = useState('');
  const [jobDone, setJobDone]       = useState(false);

  const selected = visits.find(v => v.id === selectedId) ?? null;

  const openVisit = (visit: Visit) => {
    setSelectedId(visit.id);
    if (visit.status === 'requested') {
      // Mark as diagnosis-pending immediately
      onUpdate(visit.id, { status: 'diagnosis-pending' });
      setDiagItems([]);
      setMechNotes('');
      setSubView('diagnose');
    } else if (visit.status === 'diagnosis-pending') {
      setDiagItems(visit.diagnosis);
      setMechNotes(visit.mechanicNotes);
      setSubView('diagnose');
    } else if (visit.status === 'pending-fix' || visit.status === 'in-progress') {
      const cl = visit.checklist.length
        ? visit.checklist.map(c => ({ ...c }))
        : visit.diagnosis.filter(d => d.selectedByCustomer).map(d => ({ task: d.description, done: false }));
      setChecklist(cl);
      setJobNotes(visit.mechanicNotes);
      setJobDone(false);
      setSubView('job');
    } else {
      setSubView('list');
    }
  };

  const addDiagItem = () => {
    if (!newDesc.trim()) return;
    setDiagItems(prev => [...prev, {
      id: Date.now(), description: newDesc.trim(),
      severity: newSev, estimatedCost: Number(newCost) || 0, selectedByCustomer: false,
    }]);
    setNewDesc(''); setNewCost(''); setNewSev('normal');
  };

  const removeDiagItem = (id: number) => setDiagItems(prev => prev.filter(d => d.id !== id));

  const submitDiagnosis = async () => {
    if (diagItems.length === 0) return;
    setSubmitting(true);
    // API: PUT /api/v1/visits/{id}/diagnosis  { items: DiagnosisItem[], notes: string }
    await new Promise(r => setTimeout(r, 900));
    onUpdate(selectedId!, { status: 'pending-customer-confirmation', diagnosis: diagItems, mechanicNotes: mechNotes });
    setToast({ msg: 'Diagnosis submitted — customer notified', type: 'success' });
    setSubmitting(false);
    setTimeout(() => { setSubView('list'); setSelectedId(null); }, 1200);
  };

  const toggleChecklistItem = (i: number) => {
    setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));
  };

  const markJobComplete = async () => {
    setSubmitting(true);
    // API: PUT /api/v1/visits/{id}/complete
    await new Promise(r => setTimeout(r, 900));
    onUpdate(selectedId!, { status: 'completed', checklist });
    setToast({ msg: 'Job marked complete!', type: 'success' });
    setSubmitting(false);
    setJobDone(true);
    setTimeout(() => { setSubView('list'); setSelectedId(null); }, 1400);
  };

  const statusOrder: VisitStatus[] = ['requested', 'diagnosis-pending', 'pending-customer-confirmation', 'pending-fix', 'in-progress', 'completed'];
  const sortedVisits = [...visits].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  // ── Job screen ──────────────────────────────────────────────────────────────
  if (subView === 'job' && selected) {
    const approvedItems = selected.diagnosis.filter(d => d.selectedByCustomer);
    const done = checklist.filter(c => c.done).length;
    const pct = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
    const totalCost = approvedItems.reduce((s, d) => s + d.estimatedCost, 0);

    return (
      <div className="page-in p-4 sm:p-6 max-w-4xl mx-auto">
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSubView('list')} className="btn btn-ghost btn-sm">←</button>
          <div className="flex-1">
            <span className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{selected.id}</span>
            <h1 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{selected.requestedService}</h1>
          </div>
          <VisitStatusBadge status={selected.status} />
          <button onClick={markJobComplete} disabled={submitting || done < checklist.length || jobDone}
            className="btn btn-primary">
            {submitting ? '…' : jobDone ? '✓ Done' : 'Mark Complete'}
          </button>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Car + customer info */}
          <div className="space-y-3">
            <div className="card">
              <div className="h-28 rounded-lg overflow-hidden mb-3" style={{ background: 'var(--surface-2)' }}>
                <img src={`https://images.unsplash.com/${selected.car.img}?w=400&h=200&fit=crop`}
                  alt={selected.car.brand} className="w-full h-full object-cover" />
              </div>
              <div className="font-bold" style={{ color: 'var(--text)' }}>{selected.car.brand} {selected.car.model}</div>
              <div className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{selected.car.plate} · {selected.car.year}</div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {[['Engine', selected.car.engine], ['Mileage', `${selected.car.km.toLocaleString()} km`]].map(([k, v]) => (
                  <div key={k as string}><div style={{ color: 'var(--text-4)' }}>{k}</div><div className="font-medium" style={{ color: 'var(--text)' }}>{v}</div></div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-4)' }}>CUSTOMER</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{selected.customerName}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{selected.customerPhone}</div>
            </div>
            <div className="card">
              <div className="text-xs font-mono mb-3" style={{ color: 'var(--text-4)' }}>APPROVED ITEMS</div>
              <div className="space-y-2">
                {approvedItems.map(d => (
                  <div key={d.id} className="text-xs py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>{d.description}</div>
                    <div className="flex justify-between items-center">
                      <SeverityPill severity={d.severity} />
                      <span className="font-mono font-bold" style={{ color: 'var(--primary)' }}>EGP {d.estimatedCost}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm pt-3 mt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
                <span>Total</span><span className="font-mono">EGP {totalCost}</span>
              </div>
            </div>
          </div>
          {/* Checklist + notes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div className="font-bold" style={{ color: 'var(--text)' }}>Fix Checklist</div>
                <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{done}/{checklist.length} · {pct}%</span>
              </div>
              <div className="h-2 rounded-full mb-4" style={{ background: 'var(--border)' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--s-completed)' : 'var(--primary)' }} />
              </div>
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: item.done ? 'var(--s-completed-bg)' : 'var(--surface-2)', border: `1px solid ${item.done ? 'var(--s-completed)' : 'var(--border)'}` }}>
                    <button onClick={() => toggleChecklistItem(i)}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: item.done ? 'var(--s-completed)' : 'transparent', borderColor: item.done ? 'var(--s-completed)' : 'var(--border)' }}
                      aria-label={item.done ? 'Mark undone' : 'Mark done'}>
                      {item.done && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className="text-sm flex-1" style={{ color: item.done ? 'var(--text-3)' : 'var(--text)', textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.task}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="font-bold mb-3" style={{ color: 'var(--text)' }}>Mechanic Notes</div>
              <textarea className="inp" rows={4} value={jobNotes} onChange={e => setJobNotes(e.target.value)} placeholder="Add job notes…" />
              <button className="btn btn-secondary btn-sm mt-2" onClick={() => onUpdate(selected.id, { mechanicNotes: jobNotes })}>Save Notes</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Diagnosis screen ─────────────────────────────────────────────────────────
  if (subView === 'diagnose' && selected) {
    const total = diagItems.reduce((s, d) => s + d.estimatedCost, 0);
    return (
      <div className="page-in p-4 sm:p-6 max-w-3xl mx-auto">
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSubView('list')} className="btn btn-ghost btn-sm">←</button>
          <div className="flex-1">
            <span className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{selected.id}</span>
            <h1 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Diagnosis — {selected.car.brand} {selected.car.model}</h1>
          </div>
          <VisitStatusBadge status={selected.status} />
        </div>

        {/* Car + customer quick info */}
        <div className="card flex gap-3 mb-5" style={{ padding: '12px 16px' }}>
          <div className="w-14 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
            <img src={`https://images.unsplash.com/${selected.car.img}?w=120&h=90&fit=crop`} alt={selected.car.brand} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{selected.car.brand} {selected.car.model} ({selected.car.year}) · {selected.car.engine}</div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{selected.car.plate} · {selected.car.km.toLocaleString()} km</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Customer: {selected.customerName} · {selected.customerPhone}</div>
          </div>
        </div>

        {/* Customer's note */}
        {selected.customerNotes && (
          <div className="card mb-5" style={{ background: 'var(--primary-light)', border: '1px solid var(--blue-200)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--primary)' }}>CUSTOMER COMPLAINT</div>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{selected.customerNotes}</p>
          </div>
        )}

        {/* Add new diagnosis item */}
        <div className="card mb-4">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Add Diagnosis Item</div>
          <div className="space-y-3">
            <Field label="What's wrong?">
              <input type="text" className="inp" value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDiagItem()}
                placeholder="e.g. Front brake pads worn to 2mm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Severity</label>
                <div className="flex gap-2">
                  {(['critical', 'warning', 'normal'] as Severity[]).map(s => (
                    <button key={s} onClick={() => setNewSev(s)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all capitalize"
                      style={{
                        borderColor: newSev === s
                          ? s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#16A34A'
                          : 'var(--border)',
                        background: newSev === s
                          ? s === 'critical' ? 'rgba(220,38,38,0.1)' : s === 'warning' ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)'
                          : 'var(--surface-2)',
                        color: newSev === s
                          ? s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#16A34A'
                          : 'var(--text-3)',
                      }}>
                      {s === 'critical' ? '🔴' : s === 'warning' ? '🟡' : '🟢'} {s}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Est. cost (EGP)">
                <input type="number" className="inp" value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDiagItem()}
                  placeholder="0" min="0" />
              </Field>
            </div>
            <button onClick={addDiagItem} disabled={!newDesc.trim()} className="btn btn-secondary w-full">
              + Add Item
            </button>
          </div>
        </div>

        {/* Diagnosis items list */}
        {diagItems.length === 0 ? (
          <div className="card text-center py-8" style={{ color: 'var(--text-4)' }}>
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm">No diagnosis items yet. Add what you find above.</p>
          </div>
        ) : (
          <div className="card mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{diagItems.length} Issue{diagItems.length > 1 ? 's' : ''} Found</div>
              <div className="font-mono font-bold text-sm" style={{ color: 'var(--primary)' }}>EGP {total.toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              {diagItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <SeverityPill severity={item.severity} />
                      {item.estimatedCost > 0 && (
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--primary)' }}>EGP {item.estimatedCost}</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{item.description}</p>
                  </div>
                  <button onClick={() => removeDiagItem(item.id)}
                    className="text-sm flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--sos)' }} aria-label="Remove item">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="card mb-5">
          <div className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>Internal Mechanic Notes</div>
          <textarea className="inp" rows={3} value={mechNotes} onChange={e => setMechNotes(e.target.value)}
            placeholder="Notes visible to the branch only…" />
        </div>

        {/* Submit */}
        <button onClick={submitDiagnosis}
          disabled={diagItems.length === 0 || submitting}
          className="btn btn-primary btn-lg w-full">
          {submitting
            ? <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg> Submitting…</span>
            : `✅ Submit Diagnosis & Notify Customer (${diagItems.length} item${diagItems.length > 1 ? 's' : ''})`}
        </button>
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text-4)' }}>
          Customer will be notified and asked to confirm which items to fix.
        </p>
      </div>
    );
  }

  // ── Visit list (default) ─────────────────────────────────────────────────────
  const pending = sortedVisits.filter(v => ['requested', 'diagnosis-pending', 'pending-fix', 'in-progress'].includes(v.status));
  const waiting = sortedVisits.filter(v => v.status === 'pending-customer-confirmation');
  const done = sortedVisits.filter(v => v.status === 'completed');

  return (
    <div className="page-in p-4 sm:p-6 max-w-3xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Visit Requests</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {pending.length} active · {waiting.length} awaiting customer
          </p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && <div className="w-2.5 h-2.5 rounded-full mt-1 animate-pulse" style={{ background: 'var(--primary)' }} />}
        </div>
      </div>

      {/* Active visits */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-4)' }}>ACTIVE — ACTION REQUIRED</div>
          <div className="space-y-3">
            {pending.map(visit => (
              <VisitCard key={visit.id} visit={visit} onClick={() => openVisit(visit)} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting for customer */}
      {waiting.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-4)' }}>WAITING FOR CUSTOMER CONFIRMATION</div>
          <div className="space-y-3">
            {waiting.map(visit => (
              <VisitCard key={visit.id} visit={visit} onClick={() => openVisit(visit)} dimmed />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <div className="text-xs font-mono font-semibold mb-3" style={{ color: 'var(--text-4)' }}>COMPLETED TODAY</div>
          <div className="space-y-3">
            {done.map(visit => (
              <VisitCard key={visit.id} visit={visit} onClick={() => {}} dimmed />
            ))}
          </div>
        </div>
      )}

      {sortedVisits.length === 0 && (
        <EmptyState icon="📋" title="No visits assigned" desc="Visit requests assigned to you will appear here." />
      )}
    </div>
  );
}

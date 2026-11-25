import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { SeverityPill } from './SeverityPill';
import { type Visit } from '../../data/mock-data';
import { useVisits } from '../../context/VisitsContext';

export function DiagnosisConfirmModal({ visit, onClose }: { visit: Visit; onClose: () => void }) {
  const { updateVisit } = useVisits();
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<number[]>(
    visit.diagnosis.filter(d => d.severity === 'critical').map(d => d.id)
  );
  const toggle = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const total = visit.diagnosis.filter(d => selected.includes(d.id)).reduce((s, d) => s + d.estimatedCost, 0);

  // Close automatically a moment after confirming
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const confirm = () => {
    // API: PUT /api/v1/visits/{id}/customer-confirmation  { approvedItemIds: number[] }
    const updated = visit.diagnosis.map(d => ({ ...d, selectedByCustomer: selected.includes(d.id) }));
    const checklist = updated.filter(d => d.selectedByCustomer).map(d => ({ task: d.description, done: false }));
    updateVisit(visit.id, { status: 'pending-fix', diagnosis: updated, checklist });
    setDone(true);
  };

  if (done) return (
    <Modal title="" onClose={onClose}>
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <div className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>Confirmed!</div>
        <div className="text-sm" style={{ color: 'var(--text-3)' }}>
          The mechanic will now fix {selected.length} item{selected.length > 1 ? 's' : ''}.
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal title="Mechanic's Diagnosis Report" onClose={onClose}>
      <div className="card flex gap-3 mb-4" style={{ padding: '10px 14px' }}>
        <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
          <img src={`https://images.unsplash.com/${visit.car.img}?w=96&h=80&fit=crop`} alt={visit.car.brand} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{visit.car.brand} {visit.car.model} · {visit.car.plate}</div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>{visit.requestedService}</div>
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        Your mechanic found <strong style={{ color: 'var(--text)' }}>{visit.diagnosis.length} issues</strong>. Select what you'd like fixed:
      </p>

      <div className="space-y-2 mb-5">
        {visit.diagnosis.map(item => {
          const isSelected = selected.includes(item.id);
          return (
            <button key={item.id} onClick={() => item.severity !== 'critical' && toggle(item.id)}
              className="w-full text-left p-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: isSelected ? (item.severity === 'critical' ? '#DC2626' : 'var(--primary)') : 'var(--border)',
                background: isSelected ? (item.severity === 'critical' ? 'rgba(220,38,38,0.08)' : 'var(--primary-light)') : 'var(--surface-2)',
                cursor: item.severity === 'critical' ? 'not-allowed' : 'pointer',
              }}>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
                  style={{ background: isSelected ? (item.severity === 'critical' ? '#DC2626' : 'var(--primary)') : 'transparent', borderColor: isSelected ? (item.severity === 'critical' ? '#DC2626' : 'var(--primary)') : 'var(--border)' }}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityPill severity={item.severity} />
                    {item.severity === 'critical' && <span className="text-xs" style={{ color: '#DC2626' }}>Required</span>}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text)' }}>{item.description}</div>
                </div>
                <div className="font-mono font-bold text-sm flex-shrink-0" style={{ color: 'var(--primary)' }}>
                  EGP {item.estimatedCost}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center p-3 rounded-xl mb-4" style={{ background: 'var(--primary-light)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
          Total for {selected.length} selected item{selected.length > 1 ? 's' : ''}
        </span>
        <span className="font-bold font-mono text-lg" style={{ color: 'var(--primary)' }}>EGP {total}</span>
      </div>

      <button onClick={confirm} disabled={selected.length === 0} className="btn btn-primary btn-lg w-full">
        ✓ Confirm & Send to Mechanic
      </button>
      <p className="text-center text-xs mt-2" style={{ color: 'var(--text-4)' }}>
        Critical items are mandatory. Unselected items will be skipped.
      </p>
    </Modal>
  );
}

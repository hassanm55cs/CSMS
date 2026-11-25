import { type VisitStatus } from '../../data/mock-data';

const VISIT_STATUS_META: Record<VisitStatus, { label: string; color: string; bg: string }> = {
  'requested':                    { label: 'Requested',              color: '#2563EB', bg: 'rgba(37,99,235,0.1)'  },
  'diagnosis-pending':            { label: 'Diagnosis Pending',      color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'pending-customer-confirmation':{ label: 'Pending Confirmation',   color: '#7C3AED', bg: 'rgba(124,58,237,0.1)'},
  'pending-fix':                  { label: 'Pending Fix',            color: '#0891B2', bg: 'rgba(8,145,178,0.1)' },
  'in-progress':                  { label: 'In Progress',            color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'completed':                    { label: 'Completed',              color: '#16A34A', bg: 'rgba(22,163,74,0.1)'  },
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const m = VISIT_STATUS_META[status];
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>{m.label}</span>
  );
}

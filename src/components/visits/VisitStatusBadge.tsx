const VISIT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  requested: { label: 'Requested', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  underdiagnosis: { label: 'Under diagnosis', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  diagnosispending: { label: 'Under diagnosis', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  pendingcustomerconfirmation: { label: 'Awaiting customer', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  approved: { label: 'Approved', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  customerconfirmed: { label: 'Customer confirmed', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  inprogress: { label: 'In progress', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  completed: { label: 'Completed', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  'pending-fix': { label: 'Approved', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  'diagnosis-pending': { label: 'Under diagnosis', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'pending-customer-confirmation': { label: 'Awaiting customer', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  'in-progress': { label: 'In progress', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
};

export function VisitStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[^a-z-]/g, '');
  const m = VISIT_STATUS_META[key] ?? { label: status || 'Unknown', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>{m.label}</span>
  );
}

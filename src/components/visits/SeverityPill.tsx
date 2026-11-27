import { type Severity } from '../../data/mock-data';

export function SeverityPill({ severity }: { severity: Severity }) {
  const map: Record<Severity, { label: string; bg: string; color: string }> = {
    critical: { label: 'Critical', bg: 'rgba(220,38,38,0.12)', color: '#DC2626' },
    warning:  { label: 'Warning',  bg: 'rgba(217,119,6,0.12)',  color: '#D97706' },
    normal:   { label: 'Normal',   bg: 'rgba(22,163,74,0.12)',  color: '#16A34A' },
  };
  const s = map[severity];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {severity === 'critical' ? '' : severity === 'warning' ? '' : ''} {s.label}
    </span>
  );
}

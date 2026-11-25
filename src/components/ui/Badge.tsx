export function Badge({ status }: { status: string }) {
  const cls = status.replace(/\s+/g, '-').toLowerCase();
  return <span className={`badge badge-${cls}`}>{status.replace(/-/g, ' ')}</span>;
}

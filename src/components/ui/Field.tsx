export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--sos)' }}>{error}</p>}
    </div>
  );
}

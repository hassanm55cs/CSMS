export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto page-in"
        style={{ borderRadius: 'var(--r-xl)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

import { useEffect } from 'react';

export function Toast({ msg, type, onDone }: { msg: string; type: 'success'|'error'|'info'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="font-bold">{icons[type]}</span> {msg}
    </div>
  );
}

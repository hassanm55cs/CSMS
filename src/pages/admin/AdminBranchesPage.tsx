import { BRANCHES } from '../../data/mock-data';

export default function AdminBranchesPage() {
  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Branches</h1>
        <button className="btn btn-primary btn-sm">+ Add Branch</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Branch</th><th>Manager</th><th>Staff</th><th>Rating</th><th>Hours</th><th></th></tr></thead>
          <tbody>
            {BRANCHES.map(b => (
              <tr key={b.id}>
                <td><div className="font-semibold" style={{ color: 'var(--text)' }}>{b.name}</div><div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{b.phone}</div></td>
                <td style={{ color: 'var(--text-2)' }}>{b.manager}</td>
                <td className="font-mono" style={{ color: 'var(--text-2)' }}>{b.staff ?? '—'}</td>
                <td><span style={{ color: '#D97706' }}>★ {b.rating}</span></td>
                <td className="text-xs" style={{ color: 'var(--text-3)' }}>{b.hours}</td>
                <td><div className="flex gap-1"><button className="btn btn-ghost btn-sm">✏️</button><button className="btn btn-ghost btn-sm text-red-500">🗑️</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { ADMIN_STAFF } from '../../data/admin-data';
import { Badge } from '../../components/ui/Badge';

export default function AdminStaffPage() {
  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Staff Directory</h1>
        <button className="btn btn-primary btn-sm">+ Add Employee</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_STAFF.map(s => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: 'var(--primary)' }}>
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{s.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.role}</div>
                </div>
              </div>
              <Badge status={s.status} />
            </div>
            <div className="text-xs space-y-1" style={{ color: 'var(--text-3)' }}>
              <div>📍 {s.branch}</div>
              <div>📱 {s.phone}</div>
              <div>📅 Joined {s.joined}</div>
            </div>
            <button className="btn btn-secondary btn-sm mt-3">✏️ Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

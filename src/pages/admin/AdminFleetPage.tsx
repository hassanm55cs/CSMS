import { useState } from 'react';
import { ADMIN_FLEET } from '../../data/admin-data';
import { Badge } from '../../components/ui/Badge';
import { RENTAL_FLEET } from '../../data/mock-data';

export default function AdminFleetPage() {
  const [tab, setTab] = useState<'trucks' | 'rental'>('rental');
  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Fleet Management</h1>
        <button className="btn btn-primary btn-sm">+ Add Vehicle</button>
      </div>
      <div className="flex gap-1 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
        {(['rental', 'trucks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-all`}
            style={{ borderColor: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text-3)' }}>
            {t === 'rental' ? 'Rental Fleet' : 'Service Trucks'}
          </button>
        ))}
      </div>
      {tab === 'rental' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Vehicle</th><th>Category</th><th>Price/Day</th><th>Mileage</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {RENTAL_FLEET.map(c => (
                <tr key={c.id}>
                  <td className="font-medium" style={{ color: 'var(--text)' }}>{c.brand} {c.model}</td>
                  <td style={{ color: 'var(--text-3)' }}>{c.category}</td>
                  <td className="font-mono font-bold" style={{ color: 'var(--primary)' }}>EGP {c.priceDay}</td>
                  <td className="font-mono text-sm" style={{ color: 'var(--text-3)' }}>{c.km.toLocaleString()} km</td>
                  <td><Badge status={c.available ? 'available' : 'unavailable'} /></td>
                  <td><div className="flex gap-1"><button className="btn btn-ghost btn-sm">✏️</button><button className="btn btn-ghost btn-sm text-red-500">🗑️</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Plate</th><th>Vehicle</th><th>Type</th><th>Driver</th><th>Mileage</th><th>Status</th></tr></thead>
            <tbody>
              {ADMIN_FLEET.map(v => (
                <tr key={v.id}>
                  <td className="font-mono" style={{ color: 'var(--text)' }}>{v.plate}</td>
                  <td style={{ color: 'var(--text-2)' }}>{v.brand} {v.model}</td>
                  <td style={{ color: 'var(--text-3)' }}>{v.type}</td>
                  <td style={{ color: 'var(--text-2)' }}>{v.driver}</td>
                  <td className="font-mono text-sm" style={{ color: 'var(--text-3)' }}>{v.km.toLocaleString()} km</td>
                  <td><Badge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

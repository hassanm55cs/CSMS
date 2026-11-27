import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi, unwrapReport } from '../../utils/adminApi';

type AdminDashboard = {
  customers: number; branches: number; activeSos: number; visits: number;
  staff: { employees: number; drivers: number };
  fleet: { rentalCars: number; emergencyTrucks: number };
  revenue: { rentals: number; services: number; total: number };
};
type RevenueRow = { period: string; rentals: number; services: number; total: number };

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px' } };

  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi<AdminDashboard>('/Admin-Actions/dashboard'),
      adminApi<any>('/Admin-Actions/reports/revenue?groupBy=month'),
    ]).then(([data, report]) => {
      if (!active) return;
      setDashboard(data);
      setRevenue(unwrapReport<RevenueRow>(report));
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load the admin dashboard.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const metrics = dashboard ? [
    { label: 'Customers', value: dashboard.customers, sub: `${dashboard.branches} branches` },
    { label: 'Employees', value: dashboard.staff?.employees ?? 0, sub: `${dashboard.staff?.drivers ?? 0} drivers` },
    { label: 'Fleet vehicles', value: (dashboard.fleet?.rentalCars ?? 0) + (dashboard.fleet?.emergencyTrucks ?? 0), sub: `${dashboard.fleet?.rentalCars ?? 0} rentals · ${dashboard.fleet?.emergencyTrucks ?? 0} trucks` },
    { label: 'Active emergencies', value: dashboard.activeSos, sub: `${dashboard.visits} visits in range` },
  ] : [];

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Operations Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Live summary from the backend · {new Date().toLocaleDateString()}</p>
      </div>
      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading operations data…</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {metrics.map(metric => (
              <div key={metric.label} className="card">
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>{metric.label}</div>
                <div className="font-bold text-2xl mt-2" style={{ color: 'var(--text)' }}>{metric.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{metric.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Revenue by month</h2>
                <span className="font-bold" style={{ color: 'var(--primary)' }}>EGP {(dashboard?.revenue?.total ?? 0).toLocaleString()}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenue}>
                  <defs><linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <Tooltip {...tip} />
                  <Area dataKey="total" name="Revenue" type="monotone" stroke="var(--primary)" fill="url(#adminRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card flex flex-col justify-center">
              <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Revenue breakdown</h2>
              {[
                { name: 'Rentals', value: dashboard?.revenue?.rentals ?? 0 },
                { name: 'Services', value: dashboard?.revenue?.services ?? 0 },
              ].map(item => (
                <div key={item.name} className="flex justify-between border-b py-3 last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-3)' }}>{item.name}</span>
                  <strong style={{ color: 'var(--text)' }}>EGP {item.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

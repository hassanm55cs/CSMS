import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi, unwrapReport } from '../../utils/adminApi';

type RevenueRow = { period: string; rentals: number; services: number; total: number };
type BranchRow = { branchId: number; branchName: string; services: number; rentals: number; emergencies: number; revenue: number };
type Fleet = { total: number; available: number; rented: number; reserved: number; maintenance: number };

export default function AdminReportsPage() {
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px' } };

  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi<any>('/Admin-Actions/reports/revenue?groupBy=month'),
      adminApi<Fleet>('/Admin-Actions/reports/fleet-utilization'),
      adminApi<any>('/Admin-Actions/reports/branches'),
    ]).then(([revenueResult, fleetResult, branchResult]) => {
      if (!active) return;
      setRevenue(unwrapReport<RevenueRow>(revenueResult));
      setFleet(fleetResult);
      setBranches(unwrapReport<BranchRow>(branchResult));
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load reports.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalRevenue = revenue.reduce((sum, row) => sum + row.total, 0);
  const totalEmergencies = branches.reduce((sum, branch) => sum + branch.emergencies, 0);
  const utilization = fleet?.total ? Math.round(((fleet.rented + fleet.reserved) / fleet.total) * 100) : 0;
  const topBranch = [...branches].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="mb-5"><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Analytics & Reports</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Revenue and fleet reports from admin APIs.</p></div>
      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading reports…</div> : <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            [`EGP ${totalRevenue.toLocaleString()}`, 'Revenue in report range'],
            [`${utilization}%`, 'Fleet utilization'],
            [String(totalEmergencies), 'Branch emergencies'],
            [topBranch?.branchName ?? '—', 'Top branch by revenue'],
          ].map(([value, label]) => <div key={label} className="card"><div className="font-bold text-xl mb-1" style={{ color: 'var(--primary)' }}>{value}</div><div className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</div></div>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <div className="card"><h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Revenue by month</h2>
            <ResponsiveContainer width="100%" height={230}><AreaChart data={revenue}>
              <defs><linearGradient id="reportsRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.22}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="period" tick={{ fill: 'var(--text-3)', fontSize: 11 }}/><YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }}/><Tooltip {...tip}/>
              <Area dataKey="rentals" name="Rentals" type="monotone" stroke="#607A61" fill="url(#reportsRevenue)"/><Area dataKey="services" name="Services" type="monotone" stroke="#84966D" fill="none"/>
            </AreaChart></ResponsiveContainer>
          </div>
          <div className="card"><h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Branch performance</h2>
            <ResponsiveContainer width="100%" height={230}><BarChart data={branches} barGap={4}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="branchName" tick={{ fill: 'var(--text-3)', fontSize: 10 }}/><YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }}/><Tooltip {...tip}/><Legend/><Bar dataKey="services" fill="#607A61" name="Services"/><Bar dataKey="rentals" fill="#84966D" name="Rentals"/></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="card overflow-x-auto" style={{ padding: 0 }}><table><thead><tr><th>Branch</th><th>Services</th><th>Rentals</th><th>Emergencies</th><th>Revenue</th></tr></thead><tbody>{branches.map(branch => <tr key={branch.branchId}><td>{branch.branchName}</td><td>{branch.services}</td><td>{branch.rentals}</td><td>{branch.emergencies}</td><td>EGP {branch.revenue.toLocaleString()}</td></tr>)}</tbody></table></div>
      </>}
    </div>
  );
}

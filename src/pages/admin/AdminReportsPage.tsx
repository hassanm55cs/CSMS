import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { REVENUE_DATA, BRANCH_PERF } from '../../data/admin-data';

export default function AdminReportsPage() {
  const tTip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px' } };
  return (
    <div className="page-in p-4 sm:p-6">
      <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text)' }}>Analytics & Reports</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[['EGP 186k', 'Monthly Revenue', '+18% MoM'], ['79%', 'Fleet Utilization', '37 of 48 cars'], ['2.4h', 'Avg Service Time', '-12 min MoM'], ['4.7★', 'Customer Rating', '312 reviews']].map(([v, l, s]) => (
          <div key={l} className="card">
            <div className="font-bold text-2xl mb-1" style={{ color: 'var(--primary)' }}>{v}</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{l}</div>
            <div className="text-xs" style={{ color: 'var(--text-4)' }}>{s}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Revenue by Type</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0891B2" stopOpacity={0.2}/><stop offset="95%" stopColor="#0891B2" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip {...tTip} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-3)' }} />
              <Area type="monotone" dataKey="rentals" stroke="#2563EB" fill="url(#gR)" strokeWidth={2} name="Rentals" />
              <Area type="monotone" dataKey="services" stroke="#0891B2" fill="url(#gS)" strokeWidth={2} name="Services" />
              <Area type="monotone" dataKey="emergency" stroke="#DC2626" fill="none" strokeWidth={2} name="Emergency" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Branch Performance</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BRANCH_PERF} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tTip} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-3)' }} />
              <Bar dataKey="services" fill="#2563EB" radius={[4, 4, 0, 0]} name="Services" maxBarSize={36} />
              <Bar dataKey="rentals"  fill="#0891B2" radius={[4, 4, 0, 0]} name="Rentals"  maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Key Metrics</div>
        <div className="space-y-4">
          {[
            { label: 'Rental Revenue vs Target', value: 87, color: '#2563EB' },
            { label: 'Service Completion Rate',  value: 94, color: '#16A34A' },
            { label: 'Emergency Response <15min',value: 78, color: '#DC2626' },
            { label: 'Fleet Availability',       value: 65, color: '#D97706' },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span style={{ color: 'var(--text-2)' }}>{m.label}</span>
                <span className="font-mono font-bold" style={{ color: m.color }}>{m.value}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${m.value}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { REVENUE_DATA, FLEET_UTIL } from '../../data/admin-data';

export default function AdminDashboardPage() {
  const tTip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px' } };
  return (
    <div className="page-in p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Operations Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>All branches · {new Date().toLocaleDateString()}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active Services', value: '18', icon: '🔧', sub: '+3 today' },
          { label: 'Active Rentals',  value: '31', icon: '🚗', sub: 'of 48 cars' },
          { label: 'Emergencies',     value: '2',  icon: '🆘', sub: '1 en route' },
          { label: "Today's Revenue", value: 'EGP 8.2k', icon: '💰', sub: '+12% vs last week' },
        ].map(k => (
          <div key={k.label} className="card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>{k.label}</span>
              <span className="text-xl">{k.icon}</span>
            </div>
            <div className="font-bold text-2xl" style={{ color: 'var(--text)' }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Revenue (7 months)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip {...tTip} />
              <Area type="monotone" dataKey="rentals" stroke="#2563EB" fill="url(#gBlue)" strokeWidth={2} name="Rentals" />
              <Area type="monotone" dataKey="services" stroke="#0891B2" fill="none" strokeWidth={2} name="Services" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Fleet Utilization</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie data={FLEET_UTIL} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                  {FLEET_UTIL.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...tTip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {FLEET_UTIL.map(f => (
                <div key={f.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.color }} />
                  <span style={{ color: 'var(--text-3)' }}>{f.name}</span>
                  <span className="font-mono ml-auto pl-3" style={{ color: 'var(--text)' }}>{f.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

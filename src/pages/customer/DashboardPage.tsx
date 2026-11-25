import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_USER, MOCK_MY_CARS, MOCK_UPCOMING_BOOKINGS, MOCK_BOOKING_HISTORY } from '../../data/mock-data';
import { ROUTES } from '../../routes/paths';
import { Skel } from '../../components/ui/Skel';
import { useT } from '../../i18n/useT';

export default function DashboardPage() {
  const navigate = useNavigate();
  const t = useT();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.welcomeBack : t.welcomeBack;

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        {loading ? (
          <div className="space-y-2"><Skel h="28px" w="200px" /><Skel h="16px" w="140px" /></div>
        ) : (
          <>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>
              {greeting}, {MOCK_USER.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
              {new Date().toLocaleDateString('en-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-3)' }}>{t.quickActions.toUpperCase()}</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { to: ROUTES.customer.bookService, icon: '🔧', label: t.bookService, bg: 'var(--primary)', desc: 'Schedule maintenance' },
            { to: ROUTES.customer.rentals,      icon: '🚗', label: t.rentACar,    bg: '#0891B2',        desc: 'Browse fleet' },
            { to: ROUTES.customer.sos,          icon: '🆘', label: t.sos,         bg: 'var(--sos)',     desc: 'Get help now', isSos: true },
          ].map(item => (
            <button key={item.to} onClick={() => navigate(item.to)}
              className={`flex flex-col items-center p-4 rounded-2xl text-white transition-all hover:scale-105 ${item.isSos ? 'sos-pulse' : ''}`}
              style={{ background: item.bg, boxShadow: item.isSos ? 'var(--sh-red)' : 'var(--sh-blue)' }}>
              <span className="text-3xl mb-1.5">{item.icon}</span>
              <span className="font-bold text-sm leading-tight text-center">{item.label}</span>
              <span className="text-xs opacity-75 mt-0.5 hidden sm:block">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-3)' }}>{t.upcomingAppointments.toUpperCase()}</h2>
          <button onClick={() => navigate(ROUTES.customer.bookService)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{t.viewAll}</button>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="card"><Skel h="56px" /></div>)}</div>
        ) : MOCK_UPCOMING_BOOKINGS.length === 0 ? (
          <EmptyState icon="📅" title="No upcoming appointments"
            desc="You have no scheduled services."
            action={<button onClick={() => navigate(ROUTES.customer.bookService)} className="btn btn-primary btn-sm">Book Now</button>} />
        ) : MOCK_UPCOMING_BOOKINGS.map(b => (
          <div key={b.id} className="card card-hover cursor-pointer flex items-center gap-4" onClick={() => navigate(ROUTES.customer.bookService)}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'var(--primary-light)' }}>🔧</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{b.serviceType}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{b.car} · {b.branch}</div>
              <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-4)' }}>{b.date} at {b.time}</div>
            </div>
            <Badge status={b.status} />
          </div>
        ))}
      </div>

      {/* My Cars */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-3)' }}>{t.myCars.toUpperCase()}</h2>
          <button onClick={() => navigate(ROUTES.customer.profile)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            + {t.addCar}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {loading ? [1,2].map(i => <div key={i} className="card"><Skel h="80px" /></div>) :
            MOCK_MY_CARS.map(car => (
              <div key={car.id} className="card card-hover flex gap-3 cursor-pointer" onClick={() => navigate(ROUTES.customer.bookService)}>
                <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                  <img src={`https://images.unsplash.com/${car.img}?w=120&h=90&fit=crop&auto=format`}
                    alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{car.brand} {car.model}</div>
                  <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{car.plate}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{car.km.toLocaleString()} km · {car.fuel}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-3)' }}>{t.recentActivity.toUpperCase()}</h2>
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skel key={i} h="36px" />)}</div>
          ) : MOCK_BOOKING_HISTORY.slice(0, 4).map((b, i) => (
            <div key={b.id} className={`flex items-center gap-3 p-4 ${i < 3 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <div className="text-lg">{b.status === 'completed' ? '✅' : b.status === 'cancelled' ? '❌' : '🔵'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{b.serviceType}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{b.car} · {b.date}</div>
              </div>
              <div className="text-right">
                <Badge status={b.status} />
                {b.cost > 0 && <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>EGP {b.cost}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

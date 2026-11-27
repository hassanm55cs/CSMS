import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { ROUTES } from '../../routes/paths';
import { Skel } from '../../components/ui/Skel';
import { useT } from '../../i18n/useT';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { authorizedFetch } from '../../utils/adminApi';

type CustomerCar = {
  licencePlate: string; color: string; fuelType: string | number;
  manufactureDate: string; carCompany: string; model: string; currentKm: number;
};
type CustomerProfile = { fullName: string };
type KmServiceSchedule = {
  serviceByKmId: number; kilometerInterval: number; description: string;
  products: { productId: number; name: string; price: number }[];
};
type RecentBooking = {
  visitId: number; bookingReference: string; carLicencePlate: string; carCompany: string;
  carModel: string; branchName: string; serviceDate: string; status: string; serviceCount: number;
};
type VisitService = {
  serviceId: number; serviceDate: string; product?: { productId: number; name: string; price: number } | null;
  statusService: string; description: string; approved: boolean;
};
type VisitDetail = {
  visitId: number; bookingReference: string; status: string; serviceDate: string;
  car: { licencePlate: string; company: string; model: string };
  branch: { name: string }; services: VisitService[];
};
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');
const fuelNames = ['Gasoline', 'Diesel', 'Electric', 'Hybrid'];
const fuelLabel = (value: string | number) => typeof value === 'number' ? fuelNames[value] ?? String(value) : value;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showRentals } = useOutletContext<{ showRentals: boolean }>();
  const t = useT();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);
  const [cars, setCars] = useState<CustomerCar[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState('');
  const [serviceSchedules, setServiceSchedules] = useState<KmServiceSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [activity, setActivity] = useState<RecentBooking[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<RecentBooking | null>(null);
  const [visitDetail, setVisitDetail] = useState<VisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;
    const loadCars = async () => {
      const token = localStorage.getItem('csms.token');
      if (!token) {
        setCarsError('Sign in with a customer account to view your cars.');
        setCarsLoading(false);
        return;
      }
      try {
        const response = await authorizedFetch(`${API_URL}/cars?page=1&pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message ?? error?.Message ?? `Could not load cars (${response.status}).`);
        }
        const result = await response.json();
        if (active) setCars(result.data ?? result.Data ?? []);
      } catch (error) {
        if (active) setCarsError(error instanceof Error ? error.message : 'Could not load your cars.');
      } finally {
        if (active) setCarsLoading(false);
      }
    };
    void loadCars();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCustomerName = async () => {
      const token = localStorage.getItem('csms.token');
      if (!token) return;
      try {
        const response = await authorizedFetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const profile = await response.json() as CustomerProfile;
        if (active) setCustomerName(profile.fullName ?? '');
      } catch { /* Keep the dashboard greeting usable if the profile request fails. */ }
    };
    void loadCustomerName();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      const token = localStorage.getItem('csms.token');
      if (!token) {
        setActivityError('Sign in with a customer account to view recent activity.');
        setActivityLoading(false);
        return;
      }
      try {
        const response = await authorizedFetch(`${API_URL}/bookings?page=1&pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message ?? error?.Message ?? `Could not load recent activity (${response.status}).`);
        }
        const result = await response.json();
        const bookings = result.data ?? result.Data ?? [];
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const previous = bookings.filter((booking: RecentBooking) =>
          booking.serviceDate <= today || ['completed', 'cancelled'].includes(booking.status.toLowerCase()));
        if (active) setActivity(previous);
      } catch (error) {
        if (active) setActivityError(error instanceof Error ? error.message : 'Could not load recent activity.');
      } finally {
        if (active) setActivityLoading(false);
      }
    };
    void loadActivity();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadServiceSchedules = async () => {
      try {
        const response = await fetch(`${API_URL}/service-schedules`);
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message ?? error?.Message ?? `Could not load service intervals (${response.status}).`);
        }
        const result = await response.json();
        if (active) setServiceSchedules(Array.isArray(result) ? result : result.data ?? result.Data ?? []);
      } catch (error) {
        if (active) setScheduleError(error instanceof Error ? error.message : 'Could not load service intervals.');
      } finally {
        if (active) setScheduleLoading(false);
      }
    };
    void loadServiceSchedules();
    return () => { active = false; };
  }, []);

  const activityStatus = (status: string) => {
    const key = status.toLowerCase();
    if (key === 'requested') return 'pending';
    if (key === 'underdiagnosis' || key === 'inprogress') return 'in-progress';
    if (key === 'pendingcustomerconfirmation' || key === 'customerconfirmed' || key === 'approved') return 'confirmed';
    if (key === 'rejected' || key === 'cancelled') return 'cancelled';
    if (key === 'completed') return 'completed';
    return status;
  };

  const upcomingServices = cars.flatMap(car => {
    const nextSchedule = serviceSchedules
      .filter(schedule => schedule.kilometerInterval > car.currentKm)
      .sort((a, b) => a.kilometerInterval - b.kilometerInterval)[0];
    return nextSchedule ? [{
      car,
      schedule: nextSchedule,
      nextDueKm: nextSchedule.kilometerInterval,
      kilometresRemaining: nextSchedule.kilometerInterval - car.currentKm,
    }] : [];
  });

  const openVisit = async (booking: RecentBooking) => {
    setSelectedVisit(booking);
    setVisitDetail(null);
    setDetailError('');
    setDetailLoading(true);
    const token = localStorage.getItem('csms.token');
    if (!token) {
      setDetailError('Sign in with a customer account to view visit services.');
      setDetailLoading(false);
      return;
    }
    try {
      const response = await authorizedFetch(`${API_URL}/bookings/${booking.visitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? error?.Message ?? `Could not load visit details (${response.status}).`);
      }
      setVisitDetail(await response.json());
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Could not load visit details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.welcomeBack : t.welcomeBack;

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        {loading ? (
          <div className="space-y-2"><Skel h="28px" w="200px" /><Skel h="16px" w="140px" /></div>
        ) : (
          <>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>
              {greeting}{customerName ? `, ${customerName}` : ''}
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
        <div className={`grid ${showRentals ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
          {[
            { to: ROUTES.customer.bookService, icon: 'wrench', label: t.bookService, bg: 'var(--primary)', desc: 'Schedule maintenance' },
            ...(showRentals ? [{ to: ROUTES.customer.rentals, icon: 'car', label: t.rentACar, bg: 'var(--rent-action)', desc: 'Browse fleet' }] : []),
            { to: ROUTES.customer.sos,          icon: 'alert', label: t.sos,         bg: 'var(--sos)',     desc: 'Get help now', isSos: true },
          ].map(item => (
            <button key={item.to} onClick={() => navigate(item.to)}
              className={`dashboard-quick-action ${item.to === ROUTES.customer.sos ? 'dashboard-quick-action--sos' : item.to === ROUTES.customer.rentals ? 'dashboard-quick-action--rent' : ''}`}>
              <span className="dashboard-quick-action-icon"><Icon name={item.icon as 'wrench' | 'car' | 'alert'} size={21} /></span>
              <span className="font-bold text-sm leading-tight text-center">{item.label}</span>
              <span className="text-xs mt-1 text-center dashboard-quick-action-description">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-3)' }}>{t.upcomingServices.toUpperCase()}</h2>
          <button onClick={() => navigate(ROUTES.customer.bookService)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Book service</button>
        </div>
        {carsLoading || scheduleLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="card"><Skel h="56px" /></div>)}</div>
        ) : carsError || scheduleError ? (
          <div className="card text-sm" role="alert" style={{ color: 'var(--text-3)' }}>{carsError || scheduleError}</div>
        ) : cars.length === 0 ? (
          <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Add a car with its current mileage to see upcoming services.</div>
        ) : upcomingServices.length === 0 ? (
          <div className="card text-sm" style={{ color: 'var(--text-3)' }}>No service interval is scheduled beyond your cars’ current mileage.</div>
        ) : <div className="space-y-3">{upcomingServices.map(({ car, schedule, nextDueKm, kilometresRemaining }) => (
          <button key={`${car.licencePlate}-${schedule.serviceByKmId}`} onClick={() => navigate(ROUTES.customer.bookService)}
            className="card card-hover w-full text-left flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Icon name="wrench" size={19} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{schedule.products.map(product => product.name).join(', ') || schedule.description}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{car.carCompany} {car.model} · {car.licencePlate}</div>
              <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-4)' }}>Due at {nextDueKm.toLocaleString()} km</div>
            </div>
            <span className="text-xs font-semibold text-right flex-shrink-0" style={{ color: 'var(--primary)' }}>
              In {kilometresRemaining.toLocaleString()} km
            </span>
          </button>
        ))}</div>}
      </div>

      {/* My Cars */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-3)' }}>{t.myCars.toUpperCase()}</h2>
          <button onClick={() => navigate(ROUTES.customer.profile)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            + {t.addCar}
          </button>
        </div>
        {carsLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">{[1,2].map(i => <div key={i} className="card"><Skel h="80px" /></div>)}</div>
        ) : carsError ? (
          <div className="card text-sm" role="alert" style={{ color: 'var(--text-3)' }}>{carsError}</div>
        ) : cars.length === 0 ? (
          <div className="card text-sm" style={{ color: 'var(--text-3)' }}>No cars added yet. Add your car from your profile.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {cars.map(car => (
              <div key={car.licencePlate} className="card card-hover flex items-center gap-3 cursor-pointer" onClick={() => navigate(ROUTES.customer.bookService)}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Icon name="car" size={25} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model} · {car.manufactureDate?.slice(0, 4)}</div>
                  <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{car.licencePlate}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{car.color} · {fuelLabel(car.fuelType)} · {car.currentKm.toLocaleString()} km</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-3)' }}>{t.previousVisits.toUpperCase()}</h2>
        <div className="card" style={{ padding: 0 }}>
          {activityLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skel key={i} h="36px" />)}</div>
          ) : activityError ? (
            <div className="p-4 text-sm" role="alert" style={{ color: 'var(--text-3)' }}>{activityError}</div>
          ) : activity.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: 'var(--text-3)' }}>No previous visits yet.</div>
          ) : activity.map((item, i) => (
            <button type="button" key={item.visitId} onClick={() => void openVisit(item)}
              className={`w-full text-left flex items-center gap-3 p-4 hover:bg-[var(--surface-2)] transition-colors ${i < activity.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--border)' }} aria-label={`View services for ${item.bookingReference}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Icon name="wrench" size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {item.serviceCount} {item.serviceCount === 1 ? 'service' : 'services'} · {item.carCompany} {item.carModel}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{item.branchName} · {item.carLicencePlate}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{item.serviceDate} · {item.bookingReference}</div>
              </div>
              <div className="text-right"><Badge status={activityStatus(item.status)} /></div>
            </button>
          ))}
        </div>
      </div>
      {selectedVisit && (
        <Modal title={`Visit ${visitDetail?.bookingReference ?? selectedVisit.bookingReference}`} onClose={() => { setSelectedVisit(null); setVisitDetail(null); }}>
          {detailLoading ? <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading visit services…</div>
            : detailError ? <div className="py-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{detailError}</div>
            : visitDetail && <div className="space-y-4">
              <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                <div className="font-semibold" style={{ color: 'var(--text)' }}>{visitDetail.car.company} {visitDetail.car.model} · {visitDetail.car.licencePlate}</div>
                <div className="mt-1" style={{ color: 'var(--text-3)' }}>{visitDetail.branch.name} · {visitDetail.serviceDate}</div>
                <div className="mt-2"><Badge status={activityStatus(visitDetail.status)} /></div>
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Services for this visit</h3>
              {visitDetail.services.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>No service details have been added to this visit yet.</p>
                : <div className="space-y-2">{visitDetail.services.map(service => (
                  <div key={service.serviceId} className="card" style={{ padding: 14 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{service.product?.name ?? service.description}</div>
                      {service.product && <span className="text-sm font-mono" style={{ color: 'var(--primary)' }}>EGP {service.product.price}</span>}
                    </div>
                    {service.product && service.description !== service.product.name && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{service.description}</p>}
                    <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                      <span>{service.statusService}</span><span>{service.approved ? 'Approved' : 'Not approved'}</span>
                    </div>
                  </div>
                ))}</div>}
            </div>}
        </Modal>
      )}
    </div>
  );
}

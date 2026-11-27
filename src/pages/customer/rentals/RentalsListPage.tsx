import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { adminApi, unwrapList } from '../../../utils/adminApi';
import { ROUTES, rentalPaths } from '../../../routes/paths';

type RentalCar = { licencePlate: string; color: string; noOfCylinders: number; fuelType: string; engineType: string; manufactureDate: string; carCompany: string; model: string; pricePerDay: number; status: string; available: boolean; branchId?: number | null };
type Rental = { rentedCarCustomerId: number; licencePlate: string; carCompany: string; model: string; rentStartDate: string; rentEndDate: string; noOfDays: number; priceForRent: number; status: string; createdAt: string; cancellationFee?: number | null };
const localToday = () => { const n = new Date(); return String(n.getFullYear()) + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
const apiError = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

export default function RentalsListPage() {
  const navigate = useNavigate();
  const { showRentals } = useOutletContext<{ showRentals: boolean }>();
  const [cars, setCars] = useState<RentalCar[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [fromDate, setFromDate] = useState(localToday);
  const [toDate, setToDate] = useState(localToday);
  const [make, setMake] = useState('');
  const [fuel, setFuel] = useState('All');
  const [sort, setSort] = useState<'low' | 'high'>('low');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!fromDate || !toDate || toDate < fromDate) { setError('Return date must be on or after the pick-up date.'); return; }
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100', fromDate, toDate });
      if (make.trim()) params.set('make', make.trim());
      if (fuel !== 'All') params.set('fuelType', fuel);
      const [carsResult, rentalsResult] = await Promise.all([
        adminApi('/rental-cars?' + params.toString()),
        adminApi('/Rentals?page=1&pageSize=100'),
      ]);
      setCars(unwrapList<RentalCar>(carsResult));
      setRentals(unwrapList<Rental>(rentalsResult));
    } catch (cause) { setError(apiError(cause, 'Could not load the rental fleet.')); }
    finally { setLoading(false); }
  }, [fromDate, toDate, make, fuel]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 200); return () => window.clearTimeout(timer); }, [load]);

  const cancelRental = async () => {
    if (!window.confirm('Cancel your upcoming rental?')) return;
    setCanceling(true); setError(''); setNotice('');
    try {
      await adminApi('/cancel', { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by customer' }) });
      setNotice('Rental cancelled.');
      await load();
    } catch (cause) { setError(apiError(cause, 'Could not cancel this rental.')); }
    finally { setCanceling(false); }
  };

  if (!showRentals) return <Navigate to={ROUTES.customer.dashboard} replace />;
  const sortedCars = [...cars].sort((a, b) => sort === 'low' ? a.pricePerDay - b.pricePerDay : b.pricePerDay - a.pricePerDay);
  const activeRental = rentals.find(item => item.status === 'Upcoming' || item.status === 'Active');
  return <div className="page-in p-4 sm:p-6 pb-6">
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5"><div><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Rent a Car</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Browse available vehicles and daily rates.</p></div><label className="text-xs flex flex-col gap-1.5" style={{ color: 'var(--text-3)' }}>Sort by daily price<select className="inp" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value as 'low' | 'high')}><option value="low">Lowest first</option><option value="high">Highest first</option></select></label></div>
      {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}{notice && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{notice}</div>}
      <section className="card mb-5 grid sm:grid-cols-4 gap-3"><label className="text-xs" style={{ color: 'var(--text-3)' }}>Pick-up date<input className="inp mt-1" type="date" min={localToday()} value={fromDate} onChange={e => setFromDate(e.target.value)} /></label><label className="text-xs" style={{ color: 'var(--text-3)' }}>Return date<input className="inp mt-1" type="date" min={fromDate || localToday()} value={toDate} onChange={e => setToDate(e.target.value)} /></label><label className="text-xs" style={{ color: 'var(--text-3)' }}>Make<input className="inp mt-1" value={make} placeholder="Any make" onChange={e => setMake(e.target.value)} /></label><label className="text-xs" style={{ color: 'var(--text-3)' }}>Fuel type<select className="inp mt-1" value={fuel} onChange={e => setFuel(e.target.value)}><option>All</option><option>Gasoline</option><option>Diesel</option><option>Electric</option><option>Hybrid</option></select></label></section>
      {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading fleet availability…</div> : <>
        <div className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>{sortedCars.filter(item => item.available).length} available for {fromDate} to {toDate}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{sortedCars.map(car => <button key={car.licencePlate} type="button" onClick={() => navigate(rentalPaths.detail(car.licencePlate), { state: { from: fromDate, to: toDate } })} className="card card-hover text-left overflow-hidden" style={{ padding: 0 }}>
          <div className="h-36 flex items-center justify-center relative" style={{ background: 'color-mix(in srgb, var(--primary) 10%, var(--surface-2))', color: 'var(--primary)' }}><Icon name="car" size={64} /><span className="absolute top-3 right-3"><Badge status={car.available ? 'available' : 'unavailable'} /></span></div>
          <div className="p-4"><div className="flex justify-between items-start gap-2 mb-2"><div><div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model}</div><div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>{car.licencePlate}</div></div><div className="text-right"><div className="font-bold font-mono" style={{ color: 'var(--primary)' }}>EGP {car.pricePerDay}</div><div className="text-xs" style={{ color: 'var(--text-4)' }}>per day</div></div></div><div className="text-xs flex flex-wrap gap-x-2" style={{ color: 'var(--text-3)' }}><span>{car.fuelType}</span><span>·</span><span>{car.engineType.replace(/([a-z])([A-Z])/g, '$1 $2')}</span><span>·</span><span>{car.color}</span></div></div>
        </button>)}</div>
        {sortedCars.length === 0 && <EmptyState icon="" title="No rental cars found" desc="Try a different make, fuel type, or date range." />}
      </>}
      <section className="mt-8"><div className="divider mb-5" /><div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>My Rentals</h2>{activeRental?.status === 'Upcoming' ? <button className="btn btn-ghost btn-sm text-red-500" disabled={canceling} onClick={() => void cancelRental()}>{canceling ? 'Cancelling…' : 'Cancel Upcoming Rental'}</button> : activeRental?.status === 'Active' ? <span className="text-xs" style={{ color: 'var(--text-3)' }}>Started rentals cannot be cancelled online</span> : null}</div>
        {rentals.length === 0 ? <p className="card text-sm" style={{ color: 'var(--text-3)' }}>You have no rental reservations yet.</p> : <div className="space-y-3">{rentals.map(rental => <article key={rental.rentedCarCustomerId} className="card flex flex-wrap items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name="car" size={22} /></div><div className="flex-1 min-w-0"><div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{rental.carCompany} {rental.model} · {rental.licencePlate}</div><div className="text-xs font-mono mt-1" style={{ color: 'var(--text-3)' }}>{rental.rentStartDate} → {rental.rentEndDate} · {rental.noOfDays} {rental.noOfDays === 1 ? 'day' : 'days'}</div></div><div className="text-right"><div className="font-mono font-bold text-sm" style={{ color: 'var(--text)' }}>EGP {rental.priceForRent}</div><Badge status={rental.status} /></div></article>)}</div>}
      </section>
    </div>
  </div>;
}

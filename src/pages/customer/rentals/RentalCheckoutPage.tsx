import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon';
import { adminApi } from '../../../utils/adminApi';
import { ROUTES, rentalPaths } from '../../../routes/paths';

type RentalCar = { licencePlate: string; color: string; fuelType: string; engineType: string; manufactureDate: string; carCompany: string; model: string; pricePerDay: number; available: boolean };
type Rental = { rentedCarCustomerId: number; licencePlate: string; carCompany: string; model: string; rentStartDate: string; rentEndDate: string; noOfDays: number; priceForRent: number; status: string; createdAt: string };
type Dates = { from?: string; to?: string };
const localToday = () => { const n = new Date(); return String(n.getFullYear()) + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
const apiError = (e: unknown) => e instanceof Error ? e.message : 'Could not load this rental vehicle.';
const daysInclusive = (from: string, to: string) => Math.floor((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;

export default function RentalCheckoutPage() {
  const navigate = useNavigate(); const location = useLocation(); const { carId } = useParams();
  const initialDates = (location.state as Dates | null) ?? {};
  const [from, setFrom] = useState(initialDates.from ?? '');
  const [to, setTo] = useState(initialDates.to ?? '');
  const [car, setCar] = useState<RentalCar | null>(null);
  const [loadingCar, setLoadingCar] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const today = useMemo(localToday, []);
  const datesValid = Boolean(from && to && from >= today && to >= from);
  const days = datesValid ? daysInclusive(from, to) : 0;
  const estimate = (car?.pricePerDay ?? 0) * days;

  useEffect(() => {
    if (!carId) return;
    let active = true; setLoadingCar(true); setError('');
    const query = new URLSearchParams();
    if (from && to && to >= from) { query.set('fromDate', from); query.set('toDate', to); }
    const queryString = query.toString();
    adminApi<RentalCar>('/rental-cars/' + encodeURIComponent(carId) + (queryString ? '?' + queryString : ''))
      .then(result => { if (active) setCar(result); })
      .catch(cause => { if (active) setError(apiError(cause)); })
      .finally(() => { if (active) setLoadingCar(false); });
    return () => { active = false; };
  }, [carId, from, to]);

  const confirm = async () => {
    if (!car || !carId || !datesValid || !car.available || car.pricePerDay <= 0) return;
    setSubmitting(true); setError('');
    try {
      const rental = await adminApi<Rental>('/Rentals', {
        method: 'POST',
        body: JSON.stringify({ licencePlate: car.licencePlate, rentStartDate: from, rentEndDate: to }),
      });
      navigate(rentalPaths.confirmed(car.licencePlate), { state: { rental } });
    } catch (cause) { setError(apiError(cause)); }
    finally { setSubmitting(false); }
  };

  if (!carId) return <Navigate to={ROUTES.customer.rentals} replace />;
  return <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
    <button onClick={() => navigate(rentalPaths.detail(carId), { state: { from, to } })} className="btn btn-ghost btn-sm mb-4">← Back to vehicle</button>
    <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text)' }}>Rental Checkout</h1>
    {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
    {loadingCar && !car ? <div className="card text-sm">Loading vehicle and date availability…</div> : car && <>
      <div className="card flex gap-3 items-center mb-4"><div className="w-20 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name="car" size={34} /></div><div><div className="font-bold" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model}</div><div className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{car.licencePlate} · {car.color}</div><div className="text-sm font-mono font-bold mt-1" style={{ color: 'var(--primary)' }}>EGP {car.pricePerDay} per day</div></div></div>
      <div className="card mb-4 space-y-4"><div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Pick-up date<input type="date" className="inp mt-2" value={from} min={today} onChange={e => setFrom(e.target.value)} /></label><label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Return date<input type="date" className="inp mt-2" value={to} min={from || today} onChange={e => setTo(e.target.value)} /></label></div>
        {from && to && to < from && <p className="text-sm" style={{ color: 'var(--sos)' }}>Return date must be on or after pick-up.</p>}
        {datesValid && <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}><div className="flex justify-between text-sm"><span style={{ color: 'var(--text-3)' }}>EGP {car.pricePerDay} × {days} {days === 1 ? 'day' : 'days'}</span><span style={{ color: 'var(--text)' }}>EGP {estimate.toLocaleString()}</span></div><div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}><span>Estimated total</span><span className="font-mono">EGP {estimate.toLocaleString()}</span></div></div>}
      </div>
      {datesValid && !loadingCar && car.available && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>This vehicle is available for your selected dates.</div>}
      {datesValid && !loadingCar && !car.available && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>This vehicle is already reserved for part of your selected dates. Choose different dates or another car.</div>}
      {car.pricePerDay <= 0 && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>This vehicle has no daily price and cannot be reserved yet.</div>}
      <button onClick={() => void confirm()} disabled={!datesValid || !car.available || car.pricePerDay <= 0 || loadingCar || submitting} className="btn btn-primary btn-lg w-full">{submitting ? 'Creating reservation…' : 'Confirm Rental'}</button>
      <p className="text-center text-xs mt-3" style={{ color: 'var(--text-4)' }}>Final pricing is confirmed from the vehicle’s daily rate and rental dates.</p>
    </>}
  </div>;
}

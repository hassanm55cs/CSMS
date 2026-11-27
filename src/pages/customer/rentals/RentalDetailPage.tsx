import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import { ROUTES, rentalPaths } from '../../../routes/paths';
import { adminApi } from '../../../utils/adminApi';

type Reservation = { rentStartDate: string; rentEndDate: string };
type RentalCar = { licencePlate: string; color: string; noOfCylinders: number; fuelType: string; engineType: string; manufactureDate: string; carCompany: string; model: string; pricePerDay: number; status: string; available: boolean; reservations: Reservation[] };
type Dates = { from?: string; to?: string };
const apiError = (e: unknown) => e instanceof Error ? e.message : 'Could not load this rental car.';

export default function RentalDetailPage() {
  const navigate = useNavigate(); const location = useLocation(); const { carId } = useParams();
  const dates = (location.state as Dates | null) ?? {};
  const [car, setCar] = useState<RentalCar | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    if (!carId) return;
    let active = true; setLoading(true); setError('');
    const query = new URLSearchParams();
    if (dates.from) query.set('fromDate', dates.from);
    if (dates.to) query.set('toDate', dates.to);
    const queryString = query.toString();
    adminApi<RentalCar>('/rental-cars/' + encodeURIComponent(carId) + (queryString ? '?' + queryString : ''))
      .then(result => { if (active) setCar(result); })
      .catch(cause => { if (active) setError(apiError(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [carId, dates.from, dates.to]);

  if (!carId) return <Navigate to={ROUTES.customer.rentals} replace />;
  return <div className="page-in p-4 sm:p-6 pb-6 max-w-2xl mx-auto">
    <button onClick={() => navigate(ROUTES.customer.rentals)} className="btn btn-ghost btn-sm mb-4">← Back to Fleet</button>
    {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
    {loading ? <div className="card text-sm">Loading vehicle…</div> : !car ? <div className="card text-sm">Vehicle not found.</div> : <>
      <div className="rounded-2xl overflow-hidden mb-4 h-48 flex items-center justify-center relative" style={{ background: 'color-mix(in srgb, var(--primary) 12%, var(--surface-2))', color: 'var(--primary)' }}><Icon name="car" size={96} /><span className="absolute top-3 right-3"><Badge status={car.available ? 'available' : 'unavailable'} /></span></div>
      <div className="flex items-start justify-between gap-4 mb-4"><div><h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model}</h1><p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-3)' }}>{car.licencePlate} · {car.color}</p></div><div className="text-right flex-shrink-0"><div className="font-bold text-2xl font-mono" style={{ color: 'var(--primary)' }}>EGP {car.pricePerDay}</div><div className="text-xs" style={{ color: 'var(--text-3)' }}>per day</div></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">{[{ label: 'Fuel', value: car.fuelType }, { label: 'Engine', value: car.engineType.replace(/([a-z])([A-Z])/g, '$1 $2') }, { label: 'Cylinders', value: String(car.noOfCylinders) }, { label: 'Year', value: car.manufactureDate?.slice(0, 4) ?? '—' }].map(spec => <div key={spec.label} className="card text-center" style={{ padding: 12 }}><div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{spec.label}</div><div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{spec.value}</div></div>)}</div>
      {!car.available && <div className="card mb-4 text-sm" style={{ color: 'var(--sos)' }}>{car.reservations?.length > 0 ? 'This car is already reserved for the selected dates. Check existing reservations below or choose another car.' : 'This car is currently unavailable for maintenance or fleet hold. Choose another vehicle.'}</div>}
      {car.reservations?.length > 0 && <section className="card mb-4"><h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>Existing reservations</h2><ul className="space-y-1 text-xs" style={{ color: 'var(--text-3)' }}>{car.reservations.map((item, i) => <li key={i}>{item.rentStartDate} → {item.rentEndDate}</li>)}</ul></section>}
      <button onClick={() => car.available && navigate(rentalPaths.checkout(car.licencePlate), { state: dates })} disabled={!car.available} className="btn btn-primary btn-lg w-full">{car.available ? 'Continue to Rental Dates' : 'Currently Unavailable'}</button>
    </>}
  </div>;
}

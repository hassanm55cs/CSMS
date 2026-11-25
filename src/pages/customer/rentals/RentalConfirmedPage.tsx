import { useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import type { RentalConfirmation } from '../../../types';
import { RENTAL_FLEET } from '../../../data/mock-data';
import { ROUTES, rentalPaths } from '../../../routes/paths';

export default function RentalConfirmedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { carId } = useParams();
  const selectedCar = RENTAL_FLEET.find(c => String(c.id) === carId);
  if (!selectedCar) return <Navigate to={ROUTES.customer.rentals} replace />;

  // Opened directly (e.g. page refresh) with no booking data → back to the car
  const booking = location.state as RentalConfirmation | null;
  if (!booking) return <Navigate to={rentalPaths.detail(selectedCar.id)} replace />;
  const { from, to, days, total, bookingRef } = booking;

  return (
    <div className="page-in p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
        style={{ background: 'var(--primary-light)' }}>🚗</div>
      <h2 className="font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>Rental Confirmed!</h2>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{selectedCar.brand} {selectedCar.model}</p>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{from} → {to} · {days} days</p>
      <div className="card mb-5 text-center" style={{ background: 'var(--primary-light)', border: 'none' }}>
        <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>Ref: <strong>{bookingRef}</strong> · EGP <strong>{total}</strong></span>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(ROUTES.customer.rentals)} className="btn btn-secondary">Browse More</button>
        <button onClick={() => navigate(ROUTES.customer.dashboard)} className="btn btn-primary">Dashboard</button>
      </div>
    </div>
  );
}

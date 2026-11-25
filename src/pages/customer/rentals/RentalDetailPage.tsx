import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { RENTAL_FLEET } from '../../../data/mock-data';
import { ROUTES, rentalPaths } from '../../../routes/paths';

export default function RentalDetailPage() {
  const navigate = useNavigate();
  const { carId } = useParams();
  const selectedCar = RENTAL_FLEET.find(c => String(c.id) === carId);
  if (!selectedCar) return <Navigate to={ROUTES.customer.rentals} replace />;

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(ROUTES.customer.rentals)} className="btn btn-ghost btn-sm mb-4">← Back to Fleet</button>
      <div className="rounded-2xl overflow-hidden mb-4 h-52 relative" style={{ background: 'var(--surface-2)' }}>
        <img src={`https://images.unsplash.com/${selectedCar.img}?w=800&h=400&fit=crop&auto=format`}
          alt={`${selectedCar.brand} ${selectedCar.model}`} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3"><Badge status={selectedCar.available ? 'available' : 'unavailable'} /></div>
      </div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>{selectedCar.brand} {selectedCar.model}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{selectedCar.category} · {selectedCar.fuel} · {selectedCar.transmission}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-2xl font-mono" style={{ color: 'var(--primary)' }}>EGP {selectedCar.priceDay}</div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>per day</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: '💺', label: `${selectedCar.seats} Seats` },
          { icon: '⚡', label: selectedCar.fuel },
          { icon: '🛣️', label: `${selectedCar.km.toLocaleString()} km` },
        ].map(spec => (
          <div key={spec.label} className="card text-center" style={{ padding: '12px' }}>
            <div className="text-xl mb-1">{spec.icon}</div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{spec.label}</div>
          </div>
        ))}
      </div>
      <div className="card mb-4">
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Features</div>
        <div className="flex flex-wrap gap-2">
          {selectedCar.features.map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{f}</span>
          ))}
        </div>
      </div>
      <button onClick={() => selectedCar.available && navigate(rentalPaths.checkout(selectedCar.id))}
        disabled={!selectedCar.available}
        className="btn btn-primary btn-lg w-full">
        {selectedCar.available ? '🚗 Rent This Car' : 'Currently Unavailable'}
      </button>
    </div>
  );
}

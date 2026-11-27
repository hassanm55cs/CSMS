import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon';
import { ROUTES } from '../../../routes/paths';

type Rental = { rentedCarCustomerId: number; licencePlate: string; carCompany: string; model: string; rentStartDate: string; rentEndDate: string; noOfDays: number; priceForRent: number; status: string };
export default function RentalConfirmedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rental = (location.state as { rental?: Rental } | null)?.rental;
  if (!rental) return <Navigate to={ROUTES.customer.rentals} replace />;
  return <div className="page-in p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}><Icon name="check" size={36} /></div>
    <h2 className="font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>Rental Confirmed</h2>
    <p className="mb-1" style={{ color: 'var(--text-3)' }}>{rental.carCompany} {rental.model}</p>
    <p className="text-sm font-mono mb-1" style={{ color: 'var(--text-3)' }}>{rental.licencePlate}</p>
    <p className="mb-4" style={{ color: 'var(--text-3)' }}>{rental.rentStartDate} → {rental.rentEndDate} · {rental.noOfDays} days</p>
    <div className="card mb-5 text-center"><div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Reservation #{rental.rentedCarCustomerId} · {rental.status}</div><span className="font-mono text-lg font-bold" style={{ color: 'var(--primary)' }}>EGP {rental.priceForRent.toLocaleString()}</span><div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Total from the backend reservation</div></div>
    <div className="flex gap-3"><button onClick={() => navigate(ROUTES.customer.rentals)} className="btn btn-secondary">Browse Fleet</button><button onClick={() => navigate(ROUTES.customer.dashboard)} className="btn btn-primary">Dashboard</button></div>
  </div>;
}

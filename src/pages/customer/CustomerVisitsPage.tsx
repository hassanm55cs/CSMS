import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { authorizedFetch } from '../../utils/adminApi';
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');

type Visit = {
  visitId: number;
  bookingReference: string;
  carLicencePlate: string;
  carCompany: string;
  carModel: string;
  branchName: string;
  serviceDate: string;
  status: string;
  serviceCount: number;
};

type ServiceItem = {
  serviceId: number;
  serviceDate: string;
  product?: { productId: number; name: string; price: number } | null;
  statusService: string;
  description: string;
  approved: boolean;
};

type VisitDetail = {
  visitId: number;
  bookingReference: string;
  status: string;
  serviceDate: string;
  car: { licencePlate: string; company: string; model: string };
  branch: { name: string };
  services: ServiceItem[];
};

type PageResult<T> = { data?: T[]; Data?: T[]; totalPages?: number; TotalPages?: number };

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.message ?? body?.Message ?? body?.title ?? `Request failed (${response.status}).`;
}

function badgeStatus(status: string) {
  const key = status.toLowerCase();
  if (key === 'requested') return 'pending';
  if (key === 'underdiagnosis' || key === 'inprogress') return 'in-progress';
  if (['pendingcustomerconfirmation', 'customerconfirmed', 'approved'].includes(key)) return 'confirmed';
  if (key === 'rejected' || key === 'cancelled') return 'cancelled';
  if (key === 'completed') return 'completed';
  return status;
}

export default function CustomerVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Visit | null>(null);
  const [detail, setDetail] = useState<VisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;
    const loadVisits = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('csms.token');
      if (!token) {
        setError('Sign in with a customer account to see your visits.');
        setLoading(false);
        return;
      }
      try {
        const response = await authorizedFetch(`${API_URL}/bookings?page=${page}&pageSize=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(await errorMessage(response));
        const result = await response.json() as PageResult<Visit>;
        if (active) {
          setVisits(result.data ?? result.Data ?? []);
          setTotalPages(result.totalPages ?? result.TotalPages ?? 1);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your visits.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadVisits();
    return () => { active = false; };
  }, [page]);

  const openVisit = async (visit: Visit) => {
    setSelected(visit);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    const token = localStorage.getItem('csms.token');
    if (!token) {
      setDetailError('Your sign-in has expired. Sign in again to view this visit.');
      setDetailLoading(false);
      return;
    }
    try {
      const response = await authorizedFetch(`${API_URL}/bookings/${visit.visitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setDetail(await response.json() as VisitDetail);
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : 'Could not load visit details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Visits</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your service visit history. Select a visit to see its services.</p>
      </div>

      {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading visits…</div>
        : error ? <div className="card text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>
        : visits.length === 0 ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>You don’t have any visits yet.</div>
        : <div className="card" style={{ padding: 0 }}>
          {visits.map((visit, index) => (
            <button key={visit.visitId} type="button" onClick={() => void openVisit(visit)}
              className={`w-full text-left flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors ${index < visits.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Icon name="wrench" size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{visit.carCompany} {visit.carModel} · {visit.carLicencePlate}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{visit.branchName} · {visit.serviceDate}</div>
                <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-4)' }}>{visit.bookingReference} · {visit.serviceCount} {visit.serviceCount === 1 ? 'service' : 'services'}</div>
              </div>
              <Badge status={badgeStatus(visit.status)} />
            </button>
          ))}
        </div>}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button>
          <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      )}

      {selected && <Modal title={detail?.bookingReference ?? selected.bookingReference} onClose={() => { setSelected(null); setDetail(null); }}>
        {detailLoading ? <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading visit details…</div>
          : detailError ? <div className="py-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{detailError}</div>
          : detail && <div className="space-y-4">
            <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{detail.car.company} {detail.car.model} · {detail.car.licencePlate}</div>
              <div className="mt-1" style={{ color: 'var(--text-3)' }}>{detail.branch.name} · {detail.serviceDate}</div>
              <div className="mt-2"><Badge status={badgeStatus(detail.status)} /></div>
            </div>
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Services for this visit</h2>
            {detail.services.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>No services have been added to this visit yet.</p>
              : <div className="space-y-2">{detail.services.map(service => (
                <div className="card" key={service.serviceId} style={{ padding: 14 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{service.product?.name ?? service.description}</div>
                    {service.product && <span className="text-sm font-mono flex-shrink-0" style={{ color: 'var(--primary)' }}>EGP {service.product.price}</span>}
                  </div>
                  {service.product && service.description !== service.product.name && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{service.description}</p>}
                  <div className="flex justify-between gap-3 mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    <span>{service.statusService}</span><span>{service.approved ? 'Approved' : 'Not approved'}</span>
                  </div>
                </div>
              ))}</div>}
          </div>}
      </Modal>}
    </div>
  );
}

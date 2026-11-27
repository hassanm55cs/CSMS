import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { SeverityPill } from '../../components/visits/SeverityPill';
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge';
import { adminApi, authorizedFetch } from '../../utils/adminApi';

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
type Choice = 'accept' | 'reject';

const isWaitingForCustomer = (status = '') =>
  status.toLowerCase().replace(/[^a-z]/g, '') === 'pendingcustomerconfirmation';

const normalizeSeverity = (value = ''): 'critical' | 'warning' | 'normal' => {
  const s = value.toLowerCase();
  if (s.includes('critical') || s.includes('crtical')) return 'critical';
  if (s.includes('warning')) return 'warning';
  return 'normal';
};

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.message ?? body?.Message ?? body?.title ?? `Request failed (${response.status}).`;
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
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

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

  useEffect(() => {
    const onVisitStatusChanged = (event: Event) => {
      const payload = (event as CustomEvent<{ visitId?: number; status?: string }>).detail;
      const visitId = Number(payload?.visitId);
      const status = payload?.status;
      if (!visitId || !status) return;

      setVisits(current =>
        current.map(visit => (visit.visitId === visitId ? { ...visit, status } : visit)),
      );
      setSelected(current =>
        current && current.visitId === visitId ? { ...current, status } : current,
      );
      setDetail(current =>
        current && current.visitId === visitId ? { ...current, status } : current,
      );
    };

    window.addEventListener('csms:visit-status-changed', onVisitStatusChanged);
    return () => window.removeEventListener('csms:visit-status-changed', onVisitStatusChanged);
  }, []);

  const openVisit = async (visit: Visit) => {
    setSelected(visit);
    setDetail(null);
    setDetailError('');
    setConfirmMessage('');
    setChoices({});
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

  const submitConfirmation = async () => {
    if (!detail) return;
    const pendingItems = detail.services.filter(item => !item.approved);
    if (pendingItems.length === 0 || pendingItems.some(item => !choices[item.serviceId])) return;

    const approvedServiceIds = detail.services
      .filter(item => item.approved || choices[item.serviceId] === 'accept')
      .map(item => item.serviceId);
    const rejectedServiceIds = pendingItems
      .filter(item => choices[item.serviceId] === 'reject')
      .map(item => item.serviceId);

    setSubmittingConfirm(true);
    setDetailError('');
    setConfirmMessage('');
    try {
      const result = await adminApi<{ status?: string; Status?: string }>(`/visits/${detail.visitId}/customer-confirmation`, {
        method: 'PUT',
        body: JSON.stringify({ approvedServiceIds, rejectedServiceIds }),
      });
      const nextStatus = result.status ?? result.Status ?? (approvedServiceIds.length > 0 ? 'InProgress' : 'Rejected');
      setDetail(current => current ? {
        ...current,
        status: nextStatus,
        services: current.services.map(item => ({ ...item, approved: approvedServiceIds.includes(item.serviceId) })),
      } : null);
      setVisits(current => current.map(v => (v.visitId === detail.visitId ? { ...v, status: nextStatus } : v)));
      setSelected(current => (current && current.visitId === detail.visitId ? { ...current, status: nextStatus } : current));
      setConfirmMessage(`Choices sent: ${approvedServiceIds.length} approved, ${rejectedServiceIds.length} rejected.`);
      window.dispatchEvent(new Event('csms:notifications-changed'));
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : 'Could not send your choices.');
    } finally {
      setSubmittingConfirm(false);
    }
  };

  const pendingItems = detail && isWaitingForCustomer(detail.status) ? detail.services.filter(item => !item.approved) : [];
  const decidedCount = pendingItems.filter(item => choices[item.serviceId]).length;
  const approvedTotal = detail
    ? detail.services.filter(item => item.approved || choices[item.serviceId] === 'accept').reduce((sum, item) => sum + (item.product?.price ?? 0), 0)
    : 0;

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Visits</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your service visit history. Select a visit to see its services or confirm recommendations.</p>
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
              <VisitStatusBadge status={visit.status} />
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
          : detailError && !detail ? <div className="py-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{detailError}</div>
          : detail && <div className="space-y-4">
            {detailError && <div className="card text-sm" role="alert" style={{ color: 'var(--sos)' }}>{detailError}</div>}
            {confirmMessage && <div className="card text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{confirmMessage}</div>}
            <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{detail.car.company} {detail.car.model} · {detail.car.licencePlate}</div>
              <div className="mt-1" style={{ color: 'var(--text-3)' }}>{detail.branch.name} · {detail.serviceDate}</div>
              <div className="mt-2"><VisitStatusBadge status={detail.status} /></div>
            </div>
            {pendingItems.length > 0 && (
              <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.35)', color: 'var(--text-2)' }}>
                The service team added {pendingItems.length} {pendingItems.length === 1 ? 'recommendation' : 'recommendations'} awaiting your approval below.
              </div>
            )}
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Services for this visit</h2>
            {detail.services.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>No services have been added to this visit yet.</p>
              : <div className="space-y-2">{detail.services.map(service => (
                <div className="card" key={service.serviceId} style={{ padding: 14 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{service.product?.name ?? service.description}</span>
                      <SeverityPill severity={normalizeSeverity(service.statusService)} />
                    </div>
                    {service.product && <span className="text-sm font-mono flex-shrink-0" style={{ color: 'var(--primary)' }}>EGP {service.product.price}</span>}
                  </div>
                  {service.product && service.description !== service.product.name && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{service.description}</p>}
                  <div className="flex justify-between gap-3 mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    <span>{service.statusService}</span>
                    <span>{service.approved ? 'Approved' : isWaitingForCustomer(detail.status) ? 'Awaiting your decision' : 'Rejected'}</span>
                  </div>
                  {isWaitingForCustomer(detail.status) && !service.approved && (
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => setChoices(current => ({ ...current, [service.serviceId]: 'accept' }))}
                        className={`btn btn-sm flex-1 ${choices[service.serviceId] === 'accept' ? 'btn-primary' : 'btn-secondary'}`}>Accept</button>
                      <button type="button" onClick={() => setChoices(current => ({ ...current, [service.serviceId]: 'reject' }))}
                        className={`btn btn-sm flex-1 ${choices[service.serviceId] === 'reject' ? 'btn-primary' : 'btn-secondary'}`}>Reject</button>
                    </div>
                  )}
                </div>
              ))}</div>}
            {pendingItems.length > 0 && (
              <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-3)' }}>Approved services total</span>
                  <strong className="font-mono" style={{ color: 'var(--primary)' }}>EGP {approvedTotal.toLocaleString()}</strong>
                </div>
                <button type="button" onClick={() => void submitConfirmation()}
                  disabled={submittingConfirm || decidedCount !== pendingItems.length}
                  className="btn btn-primary btn-lg w-full">
                  {submittingConfirm
                    ? 'Sending choices…'
                    : decidedCount !== pendingItems.length
                      ? `Choose accept or reject for recommendations (${decidedCount}/${pendingItems.length})`
                      : 'Send choices to service team'}
                </button>
              </div>
            )}
          </div>}
      </Modal>}
    </div>
  );
}

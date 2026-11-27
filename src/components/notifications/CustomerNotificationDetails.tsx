import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { SeverityPill } from '../visits/SeverityPill';
import { adminApi, unwrapList } from '../../utils/adminApi';

export type Notification = { notificationId: number; message: string; visitId: number; isRead: boolean; createdAt: string; confirmationPending?: boolean; ConfirmationPending?: boolean };
type ServiceItem = { serviceId: number; serviceDate: string; product?: { productId: number; name: string; price: number } | null; statusService: string; description: string; approved: boolean };
type VisitDetail = { visitId: number; bookingReference: string; status: string; serviceDate: string; car: { licencePlate: string; company: string; model: string }; branch: { name: string }; employee?: { fullName: string } };
type Choice = 'accept' | 'reject';
const isWaiting = (status = '') => status.toLowerCase().replace(/[^a-z]/g, '') === 'pendingcustomerconfirmation';
const normalizeSeverity = (value = ''): 'critical' | 'warning' | 'normal' => {
  const severity = value.toLowerCase();
  if (severity.includes('critical') || severity.includes('crtical')) return 'critical';
  if (severity.includes('warning')) return 'warning';
  return 'normal';
};
const formatDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(y, m - 1, d));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const formatStatusLabel = (status = '') => status.replace(/([a-z])([A-Z])/g, '$1 $2');

export function CustomerNotificationDetails({ notification, onClose, onRead, onConfirmationSubmitted }: { notification: Notification; onClose: () => void; onRead: (notificationId: number) => void; onConfirmationSubmitted: (notificationId: number) => void }) {
  const [detail, setDetail] = useState<VisitDetail | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(''); setSuccess(''); setChoices({});
      try {
        const [visit, servicesResult] = await Promise.all([
          adminApi<VisitDetail>(`/bookings/${notification.visitId}`),
          adminApi<any>(`/visits/${notification.visitId}/services`),
        ]);
        if (!active) return;
        setDetail(visit);
        setServices(unwrapList<ServiceItem>(servicesResult));
        if (!notification.isRead) {
          await adminApi(`/notifications/${notification.notificationId}/read`, { method: 'PUT' });
          onRead(notification.notificationId);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load notification details.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [notification.notificationId]);

  const submit = async () => {
    const decisionServices = services.filter(item => !item.approved);
    if (!detail || decisionServices.length === 0 || decisionServices.some(item => !choices[item.serviceId])) return;
    setSubmitting(true); setError(''); setSuccess('');
    const approvedServiceIds = services.filter(item => item.approved || choices[item.serviceId] === 'accept').map(item => item.serviceId);
    const rejectedServiceIds = decisionServices.filter(item => choices[item.serviceId] === 'reject').map(item => item.serviceId);
    try {
      const result = await adminApi<{ status?: string; Status?: string }>(`/visits/${notification.visitId}/customer-confirmation`, {
        method: 'PUT', body: JSON.stringify({ approvedServiceIds, rejectedServiceIds }),
      });
      setDetail({ ...detail, status: result.status ?? result.Status ?? (approvedServiceIds.length ? 'Approved' : 'Rejected') });
      setServices(items => items.map(item => ({ ...item, approved: approvedServiceIds.includes(item.serviceId) })));
      onConfirmationSubmitted(notification.notificationId);
      setSuccess(`Your choices were sent: ${approvedServiceIds.length} accepted and ${rejectedServiceIds.length} rejected.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send your choices.'); }
    finally { setSubmitting(false); }
  };

  const decisionServices = services.filter(item => !item.approved);
  const decidedCount = decisionServices.filter(item => choices[item.serviceId]).length;
  const remainingChoices = decisionServices.length - decidedCount;
  const acceptedTotal = services.filter(item => item.approved || choices[item.serviceId] === 'accept').reduce((sum, item) => sum + (item.product?.price ?? 0), 0);

  return <Modal title={<span className="flex flex-wrap items-center gap-2"><span>Notification · Visit #{notification.visitId}</span>{detail && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={isWaiting(detail.status) ? { background: 'rgba(217,119,6,0.13)', color: '#B45309' } : { background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}>{isWaiting(detail.status) ? 'Waiting for your response' : 'Response submitted'}</span>}</span>} onClose={onClose}>
    {loading ? <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading diagnosis and services…</div> : <>
      {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {success && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{success}</div>}
      {detail && <>
        <div className="rounded-xl p-3 mb-4 text-sm" style={{ background: 'var(--surface-2)' }}>
          <div className="font-semibold" style={{ color: 'var(--text)' }}>{detail.car.company} {detail.car.model} · {detail.car.licencePlate}</div>
          <div className="mt-1" style={{ color: 'var(--text-3)' }}>{detail.branch.name} · {formatDate(detail.serviceDate)}{detail.employee?.fullName ? ` · ${detail.employee.fullName}` : ''}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>Status: {formatStatusLabel(detail.status)}</div>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{notification.message}</p>
        {isWaiting(detail.status) && decisionServices.length > 0 && <div className="rounded-xl px-3 py-3 mb-4 text-sm" role="status" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.35)', color: 'var(--text)' }}>
          <div className="font-semibold" style={{ color: '#B45309' }}>{remainingChoices > 0 ? 'Confirmation not submitted' : 'Your choices are ready to submit'}</div>
          <p className="mt-1" style={{ color: 'var(--text-2)' }}>{remainingChoices > 0 ? `Choose Accept or Reject for ${remainingChoices} more recommendation${remainingChoices === 1 ? '' : 's'}. Your response is not sent until you press the submit button below.` : 'You chose an action for every recommendation, but your response has not been sent yet. Press the button below to submit it.'}</p>
        </div>}
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Products and service recommendations</h3>
        {services.length === 0 ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>No recommended services were found for this visit.</div>
          : <div className="space-y-3 mb-4">{services.map(item => <section key={item.serviceId} className="card" style={{ padding: 14 }}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.product?.name ?? item.description}</div><SeverityPill severity={normalizeSeverity(item.statusService)} /></div><span className="font-mono font-semibold text-sm" style={{ color: 'var(--primary)' }}>EGP {item.product?.price ?? 0}</span></div>
            {item.product && item.description && item.description !== item.product.name && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{item.description}</p>}
            <div className="flex items-center justify-between gap-2 mt-2 text-xs" style={{ color: 'var(--text-3)' }}><span>{item.statusService} · Suggested {formatDate(item.serviceDate)}</span>{item.approved ? <span className="font-semibold" style={{ color: 'var(--s-completed)' }}>{isWaiting(detail.status) ? 'Approved · selected at booking' : 'Accepted'}</span> : !isWaiting(detail.status) ? <span>Rejected</span> : null}</div>
            {isWaiting(detail.status) && !item.approved && <div className="flex gap-2 mt-3"><button type="button" onClick={() => setChoices(current => ({ ...current, [item.serviceId]: 'accept' }))} className={`btn btn-sm flex-1 ${choices[item.serviceId] === 'accept' ? 'btn-primary' : 'btn-secondary'}`}>Accept</button><button type="button" onClick={() => setChoices(current => ({ ...current, [item.serviceId]: 'reject' }))} className={`btn btn-sm flex-1 ${choices[item.serviceId] === 'reject' ? 'btn-primary' : 'btn-secondary'}`}>Reject</button></div>}
          </section>)}</div>}
        {isWaiting(detail.status) && decisionServices.length > 0 && <>
          <div className="flex justify-between text-sm mb-3"><span style={{ color: 'var(--text-3)' }}>Approved services total, including booking selections</span><strong className="font-mono" style={{ color: 'var(--primary)' }}>EGP {acceptedTotal.toLocaleString()}</strong></div>
          <button type="button" onClick={() => void submit()} disabled={submitting || decidedCount !== decisionServices.length} className="btn btn-primary btn-lg w-full">{submitting ? 'Sending choices…' : decidedCount !== decisionServices.length ? `Choose accept or reject for recommendations (${decidedCount}/${decisionServices.length})` : 'Send choices to service team'}</button>
        </>}
      </>}
    </>}
  </Modal>;
}

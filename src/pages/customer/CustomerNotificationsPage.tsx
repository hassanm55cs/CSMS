import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { CustomerNotificationDetails, type Notification } from '../../components/notifications/CustomerNotificationDetails';
import { adminApi } from '../../utils/adminApi';
import { reconcileNotificationStatuses } from '../../utils/notificationStatus';

type NotificationPage = { data?: Notification[]; Data?: Notification[]; totalCount?: number; TotalCount?: number };
const PAGE_SIZE = 20;
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
const confirmationPending = (item: Notification) => item.confirmationPending ?? item.ConfirmationPending ?? true;

export default function CustomerNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const liveNotifications = useRef(new Map<number, Notification>());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminApi<NotificationPage>(`/notifications?page=${page}&pageSize=${PAGE_SIZE}`);
      const fetched = result.data ?? result.Data ?? [];
      const reconciled = await reconcileNotificationStatuses(fetched);
      const merged = new Map<number, Notification>(page === 1 ? liveNotifications.current : []);
      reconciled.forEach(item => merged.set(item.notificationId, item));
      setItems([...merged.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, PAGE_SIZE));
      const serverCount = result.totalCount ?? result.TotalCount ?? 0;
      setTotalCount(current => Math.max(serverCount, current));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load notification history.'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const incoming = (event as CustomEvent<Notification>).detail;
      if (!incoming?.notificationId) return;
      liveNotifications.current.set(incoming.notificationId, incoming);
      setPage(1);
      setItems(current => [incoming, ...current.filter(item => item.notificationId !== incoming.notificationId)].slice(0, PAGE_SIZE));
      setTotalCount(current => current + 1);
      setError('');
    };
    window.addEventListener('csms:notification-received', onNotification);
    return () => window.removeEventListener('csms:notification-received', onNotification);
  }, []);

  useEffect(() => {
    const onResync = () => { void load(); };
    window.addEventListener('csms:notifications-resync', onResync);
    return () => window.removeEventListener('csms:notifications-resync', onResync);
  }, [load]);

  const selectedId = Number(searchParams.get('notificationId'));
  const selected = items.find(item => item.notificationId === selectedId) ?? null;
  const openNotification = (id: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('notificationId', String(id));
    setSearchParams(params);
  };
  const closeNotification = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('notificationId');
    setSearchParams(params, { replace: true });
  };
  const markReadLocally = (id: number) => {
    setItems(current => current.map(item => {
      if (item.notificationId !== id) return item;
      const updated = { ...item, isRead: true };
      liveNotifications.current.set(id, updated);
      return updated;
    }));
    window.dispatchEvent(new Event('csms:notifications-changed'));
  };

  const markConfirmationSubmitted = (id: number) => {
    setItems(current => current.map(item => {
      if (item.notificationId !== id) return item;
      const updated = { ...item, confirmationPending: false };
      liveNotifications.current.set(id, updated);
      return updated;
    }));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return <div className="page-in p-4 sm:p-6 pb-6 max-w-4xl mx-auto">
    <div className="mb-6"><h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Notification history</h1><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your service updates and diagnosis recommendations. Select a notification to view its services and respond.</p></div>
    {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
    {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading notification history…</div>
      : items.length === 0 ? <div className="card flex items-center gap-3 text-sm" style={{ color: 'var(--text-3)' }}><Icon name="bell" size={20} />No notifications yet.</div>
      : <div className="card p-0 overflow-hidden">{items.map((item, index) => <button key={item.notificationId} type="button" onClick={() => openNotification(item.notificationId)} className={`w-full text-left flex items-start gap-3 p-4 hover:bg-[var(--surface-2)] transition-colors ${index < items.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.isRead ? 'var(--surface-2)' : 'var(--primary-light)', color: item.isRead ? 'var(--text-3)' : 'var(--primary)' }}><Icon name="bell" size={18} /></span>
        <span className="flex-1 min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.message}</span><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={confirmationPending(item) ? { background: 'rgba(217,119,6,0.13)', color: '#B45309' } : { background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}>{confirmationPending(item) ? 'Waiting for your response' : 'Response submitted'}</span>{!item.isRead && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} aria-label="Unread" />}</span><span className="block text-xs mt-1" style={{ color: 'var(--text-3)' }}>Visit #{item.visitId} · {formatDate(item.createdAt)}</span></span>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--primary)' }}>View details →</span>
      </button>)}</div>}
    {!loading && totalPages > 1 && <div className="flex items-center justify-between mt-4"><button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>Page {page} of {totalPages}</span><button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next</button></div>}
    {selected && <CustomerNotificationDetails key={selected.notificationId} notification={selected} onClose={closeNotification} onRead={markReadLocally} onConfirmationSubmitted={markConfirmationSubmitted} />}
  </div>;
}

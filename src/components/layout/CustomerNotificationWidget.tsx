import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { adminApi, unwrapList } from '../../utils/adminApi';
import { reconcileNotificationStatuses } from '../../utils/notificationStatus';
import { ROUTES } from '../../routes/paths';

type Notification = { notificationId: number; message: string; visitId: number; isRead: boolean; createdAt: string; confirmationPending?: boolean; ConfirmationPending?: boolean };
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
const confirmationPending = (item: Notification) => item.confirmationPending ?? item.ConfirmationPending ?? true;

export function CustomerNotificationWidget({ unreadCount, onBellClick }: { unreadCount: number; onBellClick: () => Promise<void> }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const liveNotifications = useRef(new Map<number, Notification>());
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const incoming = (event as CustomEvent<Notification>).detail;
      if (!incoming?.notificationId) return;
      liveNotifications.current.set(incoming.notificationId, incoming);
      setNotifications(current => [incoming, ...current.filter(item => item.notificationId !== incoming.notificationId)].slice(0, 3));
    };
    window.addEventListener('csms:notification-received', onNotification);
    return () => window.removeEventListener('csms:notification-received', onNotification);
  }, []);

  const loadRecent = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminApi<any>('/notifications?page=1&pageSize=3');
      const fetched = await reconcileNotificationStatuses(unwrapList<Notification>(result));
      const merged = new Map(liveNotifications.current);
      fetched.forEach(item => merged.set(item.notificationId, item));
      setNotifications([...merged.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load recent notifications.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadRecent();
  }, [open, refreshVersion, loadRecent]);

  useEffect(() => {
    const onResync = () => { if (open) setRefreshVersion(value => value + 1); };
    window.addEventListener('csms:notifications-resync', onResync);
    return () => window.removeEventListener('csms:notifications-resync', onResync);
  }, [open]);

  const goToNotification = (notificationId?: number) => {
    setOpen(false);
    navigate(notificationId
      ? `${ROUTES.customer.notifications}?notificationId=${encodeURIComponent(notificationId)}`
      : ROUTES.customer.notifications);
  };

  const toggleNotifications = async () => {
    await onBellClick();
    setOpen(value => !value);
  };

  return <div className="relative">
    <button onClick={() => void toggleNotifications()} className="relative btn btn-ghost btn-sm" aria-label={`${unreadCount} unread notifications`} title="Notifications" aria-expanded={open}>
      <Icon name="bell" size={19} />
      {unreadCount > 0 && <span className="notification-count absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-xs font-bold text-white flex items-center justify-center" style={{ fontSize: '10px' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="customer-notification-popover card page-in p-4 shadow-xl" role="dialog" aria-label="Recent notifications">
      <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Recent notifications</h2><button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close notifications"><Icon name="close" size={16} /></button></div>
      {loading ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading…</p>
        : error ? <p className="text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</p>
        : notifications.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>No notifications yet.</p>
        : <div className="space-y-2">{notifications.map(item => <button key={item.notificationId} onClick={() => goToNotification(item.notificationId)} className="w-full text-left rounded-xl p-3 hover:bg-[var(--surface-2)]" style={{ background: 'var(--surface-2)' }}>
          <span className="flex items-start gap-3"><span className="mt-0.5" style={{ color: item.isRead ? 'var(--text-3)' : 'var(--primary)' }}><Icon name="bell" size={17} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.message}</span><span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={confirmationPending(item) ? { background: 'rgba(217,119,6,0.13)', color: '#B45309' } : { background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}>{confirmationPending(item) ? 'Waiting for your response' : 'Response submitted'}</span><span className="block text-xs mt-1" style={{ color: 'var(--text-3)' }}>Visit #{item.visitId} · {formatDate(item.createdAt)}</span></span>{!item.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />}</span>
        </button>)}</div>}
      <button className="btn btn-secondary btn-sm w-full mt-3" onClick={() => goToNotification()}>View all notifications</button>
    </div>}
  </div>;
}

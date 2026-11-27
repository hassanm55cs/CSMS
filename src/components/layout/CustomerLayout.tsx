import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { CustomerHeader } from './CustomerHeader';
import { SlidingSidebar } from './SlidingSidebar';
import { AIFab } from './AIFab';
import { PageFallback } from '../ui/PageFallback';
import { adminApi, unwrapList } from '../../utils/adminApi';
import { ROUTES } from '../../routes/paths';
import { Icon } from '../ui/Icon';

type CustomerEmergency = { status?: string };
type NotificationMessage = { notificationId: number; visitId: number; message: string; createdAt: string; isRead: boolean; confirmationPending?: boolean; ConfirmationPending?: boolean };
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');

export function CustomerLayout() {
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [showRentals, setShowRentals] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshNotificationCount = useCallback(async () => {
    try {
      const result: any = await adminApi('/notifications?unreadOnly=true&page=1&pageSize=100');
      const total = result?.totalCount ?? result?.TotalCount;
      const data = result?.data ?? result?.Data;
      setNotificationCount(typeof total === 'number' ? total : Array.isArray(data) ? data.length : 0);
    } catch {
      setNotificationCount(0);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotificationCount(0);
    try {
      await adminApi('/notifications/read-all', { method: 'PUT' });
      window.dispatchEvent(new Event('csms:notifications-changed'));
    } catch {
      await refreshNotificationCount();
    }
  }, [refreshNotificationCount]);

  const openNotifications = useCallback(async () => {
    await markAllNotificationsRead();
    navigate(ROUTES.customer.notifications);
  }, [markAllNotificationsRead, navigate]);

  useEffect(() => {
    let active = true;
    void adminApi<{ fullName?: string; FullName?: string }>('/profile')
      .then(profile => { if (active) setCustomerName(profile.fullName ?? profile.FullName ?? ''); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    void refreshNotificationCount();
    const timer = window.setInterval(() => { void refreshNotificationCount(); }, 15000);
    const onFocus = () => { void refreshNotificationCount(); };
    const onChanged = () => { void refreshNotificationCount(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('csms:notifications-changed', onChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('csms:notifications-changed', onChanged);
    };
  }, [refreshNotificationCount]);

  useEffect(() => {
    let disposed = false;
    let retryTimer: number | undefined;
    const hub = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('csms.token') ?? '',
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const onDiagnosisReady = (payload: NotificationMessage) => {
      if (disposed || !payload) return;
      const notification: NotificationMessage = {
        notificationId: Number(payload.notificationId),
        visitId: Number(payload.visitId),
        message: payload.message,
        createdAt: payload.createdAt,
        isRead: false,
        confirmationPending: payload.confirmationPending ?? payload.ConfirmationPending ?? true,
      };
      if (!notification.notificationId || !notification.visitId) return;
      setNotificationCount(current => current + 1);
      window.dispatchEvent(new CustomEvent('csms:notification-received', { detail: notification }));
      window.setTimeout(() => { if (!disposed) void refreshNotificationCount(); }, 400);
    };
    hub.on('VisitDiagnosisReady', onDiagnosisReady);
    hub.onreconnected(() => {
      void refreshNotificationCount();
      window.dispatchEvent(new Event('csms:notifications-resync'));
    });

    const scheduleReconnect = () => {
      if (!disposed) retryTimer = window.setTimeout(() => { void connect(); }, 5000);
    };
    const connect = async () => {
      try {
        await hub.start();
        if (!disposed) void refreshNotificationCount();
      } catch {
        scheduleReconnect();
      }
    };
    hub.onclose(scheduleReconnect);
    void connect();
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      hub.off('VisitDiagnosisReady', onDiagnosisReady);
      void hub.stop();
    };
  }, [refreshNotificationCount]);

  const refreshEmergencyStatus = useCallback(async () => {
    try {
      const result = await adminApi('/emergency-requests?page=1&pageSize=100');
      const requests = unwrapList<CustomerEmergency>(result);
      setShowRentals(requests.some(request => typeof request.status === 'string' && request.status.trim().length > 0 && request.status.toLowerCase() !== 'completed'));
    } catch {
      setShowRentals(false);
    }
  }, []);

  useEffect(() => {
    void refreshEmergencyStatus();
    const onEmergencyChange = () => { void refreshEmergencyStatus(); };
    window.addEventListener('csms:emergency-requests-changed', onEmergencyChange);
    const timer = window.setInterval(() => { void refreshEmergencyStatus(); }, 30000);
    return () => {
      window.removeEventListener('csms:emergency-requests-changed', onEmergencyChange);
      window.clearInterval(timer);
    };
  }, [refreshEmergencyStatus]);

  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <CustomerHeader notificationCount={notificationCount} onNotificationsBellClick={markAllNotificationsRead} onMenuClick={() => setMobileMenuOpen(value => !value)} menuOpen={mobileMenuOpen} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SlidingSidebar role="customer" open={mobileMenuOpen} showRentals={showRentals} displayName={customerName} onClose={() => setMobileMenuOpen(value => !value)} />
        <main className="flex-1 min-w-0 overflow-y-auto pb-4 md:pb-0" role="main">
          {notificationCount > 0 && <div className="px-4 pt-4 sm:px-6">
            <button
              type="button"
              onClick={() => void openNotifications()}
              className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
              style={{ background: 'var(--primary-light)', borderColor: 'color-mix(in srgb, var(--primary) 28%, var(--border))', color: 'var(--primary)' }}
              aria-label={`${notificationCount} unread ${notificationCount === 1 ? 'notification' : 'notifications'}. Open notification page.`}
            >
              <Icon name="bell" size={20} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm">{notificationCount} unread {notificationCount === 1 ? 'notification' : 'notifications'}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Tap to review your updates</span>
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">View →</span>
            </button>
          </div>}
          <Suspense fallback={<PageFallback />}>
            <Outlet context={{ showRentals }} />
          </Suspense>
        </main>
      </div>

      <AIFab />
    </div>
  );
}

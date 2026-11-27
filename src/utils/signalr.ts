import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');

export interface HubSubscriptionOptions {
  handlers: Record<string, (payload: any) => void>;
  onStarted?: () => void;
  onReconnected?: () => void;
}

/**
 * Connects to the backend SignalR notification hub safely under React StrictMode:
 * defers start past synchronous mount-unmount cycles and waits for an in-flight
 * start() to settle before calling stop(), eliminating "before stop() was called" errors.
 */
export function connectNotificationHub({ handlers, onStarted, onReconnected }: HubSubscriptionOptions): () => void {
  let disposed = false;
  let retryTimer: number | undefined;
  let startPromise: Promise<void> | null = null;

  const hub = new HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/notifications`, {
      accessTokenFactory: () => localStorage.getItem('csms.token') ?? '',
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Error)
    .build();

  const boundHandlers: Array<[string, (payload: unknown) => void]> = Object.entries(handlers).map(
    ([eventName, handler]) => {
      const wrapped = (payload: unknown) => {
        if (!disposed) handler(payload);
      };
      hub.on(eventName, wrapped);
      return [eventName, wrapped];
    },
  );

  if (onReconnected) {
    hub.onreconnected(() => {
      if (!disposed) onReconnected();
    });
  }

  const scheduleReconnect = () => {
    if (!disposed) {
      retryTimer = window.setTimeout(() => {
        void connect();
      }, 5000);
    }
  };

  const connect = async () => {
    if (disposed) return;
    try {
      startPromise = hub.start();
      await startPromise;
      startPromise = null;
      if (!disposed) onStarted?.();
    } catch {
      startPromise = null;
      scheduleReconnect();
    }
  };

  hub.onclose(scheduleReconnect);

  const bootTimer = window.setTimeout(() => {
    void connect();
  }, 30);

  return () => {
    disposed = true;
    window.clearTimeout(bootTimer);
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    for (const [eventName, wrapped] of boundHandlers) {
      hub.off(eventName, wrapped);
    }
    const stopNow = () => {
      void hub.stop().catch(() => undefined);
    };
    if (startPromise) {
      void startPromise.then(stopNow, stopNow);
    } else {
      stopNow();
    }
  };
}

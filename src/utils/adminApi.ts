const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');

export function expireSession() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('csms:session-expired'));
}

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) expireSession();
  return response;
}

export async function adminApi<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('csms.token');
  if (!token) {
    expireSession();
    throw new Error('Your session has expired. Sign in again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await authorizedFetch(`${API_BASE}${path}`, { ...init, headers });
  const raw = await response.text();
  let body: any = null;
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  if (!response.ok) {
    const errors = body?.errors ?? body?.Errors;
    const message = Array.isArray(errors) ? errors.join(' ') : body?.message ?? body?.Message ?? body?.title ?? body;
    throw new Error(typeof message === 'string' ? message : `Request failed (${response.status}).`);
  }
  return body as T;
}

export function unwrapList<T>(value: any): T[] {
  const candidate = value?.data ?? value?.Data ?? value;
  return Array.isArray(candidate) ? candidate as T[] : [];
}

export function unwrapReport<T>(value: any): T[] {
  const candidate = value?.data ?? value?.Data ?? value;
  return Array.isArray(candidate) ? candidate as T[] : [];
}

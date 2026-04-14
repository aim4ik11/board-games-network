import { clearStoredAccessToken, getStoredAccessToken } from './auth-storage';

export const AUTH_LOGOUT_EVENT = 'boardgame:auth-logout';

function notifyAuthLogout(): void {
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    throw new Error('VITE_API_URL is not set');
  }
  return url.replace(/\/$/, '');
}

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!skipAuth) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  if (
    rest.body !== undefined &&
    typeof rest.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
  });

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (res.status === 401) {
    clearStoredAccessToken();
    notifyAuthLogout();
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status, data);
  }

  return data as T;
}

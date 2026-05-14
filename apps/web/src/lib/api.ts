import { getAccessToken, setAccessToken } from './auth-session';
import { toast } from './toast';

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
  init?: RequestInit & { skipAuth?: boolean; withCredentials?: boolean },
): Promise<T> {
  const response = await doFetch(path, init);
  if (response.status !== 401 || init?.skipAuth) {
    return parseResponse<T>(response);
  }

  const refreshed = await tryRefreshAccessToken();
  if (!refreshed) {
    notifyAuthLogout();
    toast.error('Your session has expired. Please sign in again.');
    throw new ApiError('Unauthorized', 401);
  }

  const retryResponse = await doFetch(path, init);
  if (retryResponse.status === 401) {
    notifyAuthLogout();
    toast.error('Your session has expired. Please sign in again.');
  }
  return parseResponse<T>(retryResponse);
}

async function doFetch(
  path: string,
  init?: RequestInit & { skipAuth?: boolean; withCredentials?: boolean },
): Promise<Response> {
  const { skipAuth, withCredentials, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!skipAuth) {
    const token = getAccessToken();
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
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
    credentials: withCredentials ? 'include' : rest.credentials,
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : res.statusText;
    const error = new ApiError(msg || 'Request failed', res.status, data);
    notifyApiError(error);
    throw error;
  }
  return data as T;
}

function notifyApiError(error: ApiError): void {
  // 401 is handled with a dedicated session toast; 404 is often expected (e.g. not in collection).
  if (error.status === 401 || error.status === 404) {
    return;
  }
  toast.error(error.message);
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      const response = await doFetch('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        withCredentials: true,
      });
      if (!response.ok) {
        setAccessToken(null);
        return false;
      }
      const data = await parseResponse<{ accessToken: string }>(response);
      setAccessToken(data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

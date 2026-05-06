import type {
  AuthSuccessResponse,
  AuthUser,
  ForgotPasswordPayload,
  OkResponse,
  ResetPasswordPayload,
} from '@boardgame/shared';
import { apiFetch } from '../lib/api';

export function loginRequest(body: {
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  return apiFetch<AuthSuccessResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function registerRequest(body: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthSuccessResponse> {
  return apiFetch<AuthSuccessResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export function refreshAccessToken(): Promise<{ accessToken: string }> {
  return apiFetch<{ accessToken: string }>('/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    withCredentials: true,
  });
}

export function logoutRequest(): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/logout', {
    method: 'POST',
    withCredentials: true,
  });
}

export function logoutAllRequest(): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/logout-all', {
    method: 'POST',
    withCredentials: true,
  });
}

export function forgotPasswordRequest(
  body: ForgotPasswordPayload,
): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function resetPasswordRequest(body: ResetPasswordPayload): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function patchProfile(body: {
  displayName?: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
}): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

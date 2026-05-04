import type { AuthSuccessResponse, AuthUser } from '@boardgame/shared';
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

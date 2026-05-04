export type AuthModalMode = 'login' | 'register';

const AUTH_MODAL_STORAGE_KEY = 'boardgame:auth-modal-intent';
export const OPEN_AUTH_MODAL_EVENT = 'boardgame:open-auth-modal';

export function setPendingAuthModal(mode: AuthModalMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(AUTH_MODAL_STORAGE_KEY, mode);
}

export function consumePendingAuthModal(): AuthModalMode | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.sessionStorage.getItem(AUTH_MODAL_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_MODAL_STORAGE_KEY);
  return raw === 'register' ? 'register' : raw === 'login' ? 'login' : null;
}

export function requestAuthModal(mode: AuthModalMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<AuthModalMode>(OPEN_AUTH_MODAL_EVENT, {
      detail: mode,
    }),
  );
}

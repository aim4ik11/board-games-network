const TOKEN_KEY = 'boardgame_access_token';

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

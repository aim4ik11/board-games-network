export type ThemeId = 'dark' | 'light';

const STORAGE_KEY = 'boardgame-theme';

export function syncThemeFromStorage(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const next: ThemeId = raw === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
}

export function getTheme(): ThemeId {
  if (typeof document === 'undefined') {
    return 'dark';
  }
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

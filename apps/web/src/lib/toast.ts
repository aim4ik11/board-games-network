export type ToastVariant = 'info' | 'success' | 'error';

type ToastPayload = {
  message: string;
  variant: ToastVariant;
};

const TOAST_EVENT = 'boardgame:toast';

export function showToast(message: string, variant: ToastVariant = 'info') {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: { message: trimmed, variant },
    }),
  );
}

export function subscribeToasts(
  listener: (payload: ToastPayload) => void,
): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ToastPayload>;
    if (!custom.detail?.message) {
      return;
    }
    listener(custom.detail);
  };
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}

export const toast = {
  info: (message: string) => showToast(message, 'info'),
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
};

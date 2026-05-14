import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { subscribeToasts, type ToastVariant } from '../../lib/toast';
import { Button } from './button';
import styles from './toast.module.scss';

type ToastRecord = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const AUTO_DISMISS_MS = 5200;

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const size = 22;
  const stroke = 2.25;
  if (variant === 'success') {
    return <CircleCheck size={size} strokeWidth={stroke} aria-hidden />;
  }
  if (variant === 'error') {
    return <CircleAlert size={size} strokeWidth={stroke} aria-hidden />;
  }
  return <Info size={size} strokeWidth={stroke} aria-hidden />;
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToasts((payload) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, ...payload }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    });
  }, [dismiss]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.viewport}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.variant]}`}
          role={toast.variant === 'error' ? 'alert' : 'status'}
        >
          <span className={styles.icon}>
            <ToastIcon variant={toast.variant} />
          </span>
          <p className={styles.message}>{toast.message}</p>
          <Button
            type="button"
            variant="icon"
            className={styles.close}
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
          >
            <X size={16} aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}

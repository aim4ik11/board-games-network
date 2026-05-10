import styles from './button.module.scss';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'md' | 'sm';

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClassName({
  variant = 'primary',
  size = 'md',
}: ButtonClassOptions = {}): string {
  const parts = [styles.root];
  if (variant === 'ghost') {
    parts.push(styles.ghost);
  }
  if (variant === 'danger') {
    parts.push(styles.danger);
  }
  if (variant === 'icon') {
    parts.push(styles.icon);
  }
  if (size === 'sm') {
    parts.push(styles.sm);
  }
  return parts.join(' ');
}

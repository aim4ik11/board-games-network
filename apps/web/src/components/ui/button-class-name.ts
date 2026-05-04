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
  const classes = ['ui-button', `ui-button--${variant}`];
  if (size !== 'md') {
    classes.push(`ui-button--${size}`);
  }
  return classes.join(' ');
}

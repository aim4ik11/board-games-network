import type { ButtonHTMLAttributes } from 'react';
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from './button-class-name';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [buttonClassName({ variant, size }), className]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...props} />;
}

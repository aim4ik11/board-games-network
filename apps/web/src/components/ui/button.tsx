import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "danger" | "icon";
type ButtonSize = "md" | "sm";

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
}: ButtonClassOptions = {}): string {
  const classes = ["ui-button", `ui-button--${variant}`];
  if (size !== "md") {
    classes.push(`ui-button--${size}`);
  }
  return classes.join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [buttonClassName({ variant, size }), className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}

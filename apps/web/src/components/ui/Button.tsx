import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

export const Button = ({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: Props) => (
  <button className={`button button-${variant} ${className}`} {...props}>
    {icon}
    {children ? <span>{children}</span> : null}
  </button>
);

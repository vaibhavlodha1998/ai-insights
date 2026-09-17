import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and swaps the label for `loadingText`. */
  loading?: boolean;
  loadingText?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:bg-disabled disabled:text-subtle",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-surface-muted disabled:opacity-60",
  ghost: "bg-transparent text-ink hover:bg-line-subtle disabled:opacity-60",
  danger: "bg-danger text-white hover:bg-danger-hover disabled:opacity-60",
  link: "bg-transparent px-2 underline underline-offset-3 hover:no-underline disabled:opacity-60",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isLoading = loading;
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed",
        isLoading && "cursor-progress disabled:bg-accent disabled:text-white disabled:opacity-85",
        variants[variant],
        variant !== "link" && sizes[size],
        variant === "link" && "min-h-11 text-sm",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading && <Spinner />}
      {isLoading && loadingText ? loadingText : children}
      {!isLoading && icon}
    </button>
  );
}

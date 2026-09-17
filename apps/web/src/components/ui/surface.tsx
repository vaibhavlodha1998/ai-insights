import type { FormHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

// Form attributes are a superset of the common ones, so any `as` element type-checks
type CardProps = FormHTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "form" | "aside";
  padding?: "md" | "lg";
  children: ReactNode;
};

/** White surface with the standard border and radius. */
export function Card({ as: Tag = "div", padding = "lg", className, children, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-surface",
        padding === "lg" ? "p-6" : "px-6 py-5.5",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Small uppercase label, e.g. an insight's category. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md bg-accent-soft px-2 py-1 font-mono text-xs font-medium tracking-[0.06em] text-accent uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Rounded chip, e.g. a prompt already sent. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-sm", className)}>{children}</span>
  );
}

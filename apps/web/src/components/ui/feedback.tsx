import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value: number;
  max: number;
  label: string;
  className?: string;
};

export function ProgressBar({ value, max, label, className }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1 overflow-hidden rounded-full bg-line", className)}
    >
      <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** A grey placeholder block for content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-line-subtle", className)} />;
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, children, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-line-strong px-6 py-8 text-center",
        className,
      )}
    >
      {icon && <span className="text-faint">{icon}</span>}
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {children && <div className="max-w-md text-sm leading-normal text-muted">{children}</div>}
      {actions && <div className="flex flex-wrap justify-center gap-2.5 pt-1">{actions}</div>}
    </div>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { QuestionCircleIcon, WarningIcon } from "./icons";

export type AlertTone = "warning" | "danger";

type AlertProps = {
  tone: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** `lg` uses the display face for the title, for page-level messages. */
  size?: "md" | "lg";
  className?: string;
};

const tones: Record<AlertTone, { box: string; icon: ReactNode; body: string }> = {
  warning: {
    box: "border-warning-line bg-warning-bg text-warning-ink",
    icon: <QuestionCircleIcon size={20} className="text-warning-icon" />,
    body: "text-warning-text",
  },
  danger: {
    box: "border-danger-line bg-danger-bg text-danger-ink",
    icon: <WarningIcon size={22} className="text-danger" />,
    body: "text-danger-ink/90",
  },
};

/**
 * A message box. Danger alerts are announced immediately (`role="alert"`),
 * warnings politely (`role="status"`).
 */
export function Alert({ tone, title, children, actions, size = "md", className }: AlertProps) {
  const style = tones[tone];
  return (
    <section
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border",
        size === "lg" ? "gap-4 p-6" : "px-5 py-4.5",
        style.box,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="flex min-w-0 grow flex-col gap-1.5">
        <h2
          className={cn(
            "m-0",
            size === "lg" ? "font-display text-[26px] leading-tight font-semibold" : "text-base font-semibold",
          )}
        >
          {title}
        </h2>
        {children && (
          <div className={cn(size === "lg" ? "text-base" : "text-sm", "leading-normal", style.body)}>
            {children}
          </div>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2.5 pt-2">{actions}</div>}
      </div>
    </section>
  );
}

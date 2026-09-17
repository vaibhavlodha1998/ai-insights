import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { InfoCircleIcon } from "./icons";

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  /** Shown on the right of the message row, e.g. a character counter. */
  aside?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

/** Label + control + message row. Wire the control with `fieldA11yProps(id, error)`. */
export function Field({ id, label, error, aside, className, labelClassName, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-sm font-semibold", labelClassName)}>
        {label}
      </label>
      {children}
      {(error || aside) && (
        <div className="flex items-start justify-between gap-3 text-[13px]">
          <FieldError id={messageId(id)} message={error} />
          {aside}
        </div>
      )}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} role={message ? "alert" : undefined} className="flex items-center gap-1.5 text-danger-text">
      {message && (
        <>
          <InfoCircleIcon size={14} />
          {message}
        </>
      )}
    </p>
  );
}

function messageId(id: string) {
  return `${id}-message`;
}

/** Accessibility attributes linking a control to its field message. */
export function fieldA11yProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": messageId(id),
  } as const;
}

/** Shared control styling: base, invalid and disabled states. */
export const controlClass = cn(
  "w-full rounded-[10px] border border-line-strong bg-surface text-[15px] text-ink shadow-none outline-none transition-[border-color,box-shadow]",
  "placeholder:text-faint focus:border-accent focus:ring-3 focus:ring-accent-soft",
  "aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger-soft",
  "disabled:border-line disabled:bg-surface-muted disabled:text-ink-muted",
);

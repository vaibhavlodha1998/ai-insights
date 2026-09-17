"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  /** Hide the legend visually while keeping it for screen readers. */
  hideLabel?: boolean;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

/** A radio group styled as joined buttons. Arrow keys move between options. */
export function SegmentedControl<T extends string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className={cn("m-0 flex flex-col gap-1.5 border-0 p-0", className)}>
      <legend className={cn("mb-1.5 p-0 text-[13px] font-semibold", hideLabel && "sr-only")}>
        {label}
      </legend>
      <div
        className={cn(
          "flex h-11 overflow-hidden rounded-[10px] border",
          disabled ? "border-line bg-line-subtle" : "border-line-strong bg-surface",
        )}
      >
        {options.map((option, index) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-w-14 flex-1 cursor-pointer items-center justify-center px-3 text-sm font-semibold",
                "has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent",
                index > 0 && "border-l border-line",
                disabled && "cursor-not-allowed text-faint",
                !disabled && (checked ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted"),
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClass } from "./field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly SelectOption[];
  /** Adds a first, unselectable option shown while nothing is chosen. */
  placeholder?: string;
};

export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <select className={cn(controlClass, "h-11 px-3", className)} {...props}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

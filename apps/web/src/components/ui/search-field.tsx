import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClass } from "./field";
import { CloseIcon, SearchIcon } from "./icons";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Search input with a leading icon and a clear button once there is text. */
export function SearchField({ value, onValueChange, className, ...props }: SearchFieldProps) {
  return (
    <div className="relative flex items-center">
      <SearchIcon className="pointer-events-none absolute left-3.5 text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          controlClass,
          "h-11 pr-11 pl-10.5 [&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onValueChange("")}
          className="absolute right-0.5 flex size-10 items-center justify-center rounded-[8px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

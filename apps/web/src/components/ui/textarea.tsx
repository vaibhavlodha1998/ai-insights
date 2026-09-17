import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClass } from "./field";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        controlClass,
        // :read-only also matches <select>, so this lives here rather than in controlClass
        "resize-y px-3.5 py-3 leading-normal read-only:border-line read-only:bg-surface-muted read-only:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

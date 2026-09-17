import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type DescriptionItem = { term: string; detail: ReactNode; mono?: boolean };

/** Label/value rows, e.g. the properties of a record. Empty details show a dash. */
export function DescriptionList({ items, className }: { items: DescriptionItem[]; className?: string }) {
  return (
    <dl className={cn("m-0 flex flex-col divide-y divide-line-subtle", className)}>
      {items.map((item) => (
        <div key={item.term} className="flex items-baseline justify-between gap-6 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-sm text-muted">{item.term}</dt>
          <dd
            className={cn(
              "m-0 min-w-0 text-right text-sm break-words text-ink",
              item.mono && "font-mono text-[13px]",
            )}
          >
            {item.detail === null || item.detail === undefined || item.detail === "" ? (
              <span className="text-faint">—</span>
            ) : (
              item.detail
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

import { memo } from "react";

import type { Insight } from "@/features/prompts/types";

/** Memoized: cached insights keep their identity, so loaded cards skip re-rendering. */
export const InsightCard = memo(function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {insight.category}
        </span>
        <span title="Confidence" className="tabular-nums">
          {Math.round(insight.confidence * 100)}% confidence
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug">{insight.title}</h3>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{insight.content}</p>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{insight.source}</span>
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {insight.tags.map((tag) => (
            <li key={tag} className="text-zinc-500">
              #{tag}
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
});

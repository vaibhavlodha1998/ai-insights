import { memo } from "react";

import { Badge, Card } from "@/components/ui";
import type { Insight } from "@/features/prompts/types";

import { Highlight } from "./highlight";

type InsightCardProps = { insight: Insight; highlightWords: string[] };

/** Memoized: cached insights keep their identity, so loaded cards skip re-rendering. */
export const InsightCard = memo(function InsightCard({ insight, highlightWords }: InsightCardProps) {
  const confidence = Math.round(insight.confidence * 100);

  return (
    <Card as="article" padding="md" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-4">
        <Badge>{insight.category}</Badge>
        <div className="flex items-center gap-2.5 text-[13px] text-muted">
          <div aria-hidden className="h-1 w-[72px] overflow-hidden rounded-full bg-line-subtle">
            <div className="h-full bg-accent" style={{ width: `${confidence}%` }} />
          </div>
          <span>{confidence}% confidence</span>
        </div>
      </div>
      <h3 className="m-0 font-display text-[21px] leading-snug font-semibold tracking-[-0.005em]">
        <Highlight text={insight.title} words={highlightWords} />
      </h3>
      <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
        <Highlight text={insight.content} words={highlightWords} />
      </p>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-subtle">
        <span>
          <Highlight text={insight.source} words={highlightWords} />
        </span>
        <span aria-hidden>·</span>
        <ul aria-label="Tags" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {insight.tags.map((tag) => (
            <li key={tag}>
              #<Highlight text={tag} words={highlightWords} />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
});

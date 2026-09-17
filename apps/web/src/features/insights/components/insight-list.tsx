import { memo } from "react";

import type { Insight } from "@/features/prompts/types";

import { InsightCard } from "./insight-card";

type InsightListProps = { insights: Insight[]; highlightWords: string[] };

export const InsightList = memo(function InsightList({ insights, highlightWords }: InsightListProps) {
  return (
    <ul aria-label="Insights" className="m-0 flex list-none flex-col gap-3.5 p-0">
      {insights.map((insight) => (
        <li key={insight.id}>
          <InsightCard insight={insight} highlightWords={highlightWords} />
        </li>
      ))}
    </ul>
  );
});

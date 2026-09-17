import { memo } from "react";

import type { Insight } from "@/features/prompts/types";

import { InsightCard } from "./insight-card";

export const InsightList = memo(function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Insights">
      {insights.map((insight) => (
        <li key={insight.id}>
          <InsightCard insight={insight} />
        </li>
      ))}
    </ul>
  );
});

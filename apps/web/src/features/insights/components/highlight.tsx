import { memo } from "react";

import { highlightSegments } from "../filter-sort";

/** Renders `text` with the parts matching the search words marked. */
export const Highlight = memo(function Highlight({
  text,
  words,
}: {
  text: string;
  words: string[];
}) {
  if (words.length === 0) return text;
  return highlightSegments(text, words).map((segment, index) =>
    segment.match ? (
      <mark key={index} className="rounded-[3px] bg-mark px-0.5 text-inherit">
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
});

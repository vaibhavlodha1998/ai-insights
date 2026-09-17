import type { Insight } from "@/features/prompts/types";

export type SortOrder =
  | "relevance"
  | "title-asc"
  | "title-desc"
  | "content-asc"
  | "content-desc";

export const SORT_OPTIONS: readonly { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "content-asc", label: "Content A–Z" },
  { value: "content-desc", label: "Content Z–A" },
];

/** Lowercase without accents, so "salud" finds "Salúd" and "CLOUD" finds "cloud". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Built once per insight object; RTK Query keeps object identity across renders
const searchTextCache = new WeakMap<Insight, string>();

function searchText(insight: Insight): string {
  let text = searchTextCache.get(insight);
  if (text === undefined) {
    text = normalizeText(
      [insight.title, insight.content, insight.category, insight.source, ...insight.tags].join(
        "\n",
      ),
    );
    searchTextCache.set(insight, text);
  }
  return text;
}

/** Insights whose text or metadata contain every word of `term`. */
export function filterInsights(insights: Insight[], term: string): Insight[] {
  const words = normalizeText(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return insights;
  return insights.filter((insight) => {
    const text = searchText(insight);
    return words.every((word) => text.includes(word));
  });
}

/** Returns the same array for "relevance" (the API's order), else a sorted copy. */
export function sortInsights(
  insights: Insight[],
  order: SortOrder,
  collator: Intl.Collator,
): Insight[] {
  if (order === "relevance") return insights;
  const [field, direction] = order.split("-") as ["title" | "content", "asc" | "desc"];
  const sign = direction === "asc" ? 1 : -1;
  return [...insights].sort((a, b) => sign * collator.compare(a[field], b[field]));
}

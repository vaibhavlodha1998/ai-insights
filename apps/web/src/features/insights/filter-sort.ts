import type { Insight } from "@/features/prompts/types";

export type SortField = "relevance" | "title" | "content";
export type SortDirection = "asc" | "desc";
export type SortOrder = { field: SortField; direction: SortDirection };

export const SORT_FIELD_OPTIONS: readonly { value: SortField; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "title", label: "Title" },
  { value: "content", label: "Content" },
];

export const SORT_DIRECTION_OPTIONS: readonly { value: SortDirection; label: string }[] = [
  { value: "asc", label: "A–Z" },
  { value: "desc", label: "Z–A" },
];

/** Lowercase without accents, so "salud" finds "Salúd" and "CLOUD" finds "cloud". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** The words of a search term, normalized. Every word must match. */
export function searchWords(term: string): string[] {
  return normalizeText(term).split(/\s+/).filter(Boolean);
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
  const words = searchWords(term);
  if (words.length === 0) return insights;
  return insights.filter((insight) => {
    const text = searchText(insight);
    return words.every((word) => text.includes(word));
  });
}

/** Returns the same array for relevance (the API's order), else a sorted copy. */
export function sortInsights(
  insights: Insight[],
  { field, direction }: SortOrder,
  collator: Intl.Collator,
): Insight[] {
  if (field === "relevance") return insights;
  const sign = direction === "asc" ? 1 : -1;
  return [...insights].sort((a, b) => sign * collator.compare(a[field], b[field]));
}

export type TextSegment = { text: string; match: boolean };

/**
 * Splits `text` into matching and non-matching runs for highlighting, using the
 * same case- and accent-insensitive comparison as the search itself.
 */
export function highlightSegments(text: string, words: string[]): TextSegment[] {
  if (words.length === 0 || text === "") return [{ text, match: false }];

  // Normalize character by character, remembering where each normalized
  // character came from, so matches map back onto the original text
  let normalized = "";
  const sourceIndex: number[] = [];
  let offset = 0;
  for (const char of text) {
    for (const normalizedChar of normalizeText(char)) {
      normalized += normalizedChar;
      sourceIndex.push(offset);
    }
    offset += char.length;
  }

  const ranges: [number, number][] = [];
  for (const word of words) {
    let at = normalized.indexOf(word);
    while (at !== -1) {
      const start = sourceIndex[at];
      const lastSource = sourceIndex[at + word.length - 1];
      const end = lastSource + (text.codePointAt(lastSource)! > 0xffff ? 2 : 1);
      ranges.push([start, end]);
      at = normalized.indexOf(word, at + word.length);
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

import { describe, expect, test } from "vitest";

import { makeInsight } from "@/test/utils";

import {
  filterInsights,
  highlightSegments,
  normalizeText,
  searchWords,
  sortInsights,
  type SortOrder,
} from "./filter-sort";

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

const insights = [
  makeInsight(1, { title: "Zero trust security", content: "Verify every request", tags: ["security"] }),
  makeInsight(2, { title: "Telemedicine", content: "Consultas por vídeo", category: "health" }),
  makeInsight(3, { title: "apps for travel", content: "Booking and navigation", source: "Travel guide" }),
];

describe("normalizeText", () => {
  test("lowercases and strips accents", () => {
    expect(normalizeText("Vídeo ÉTÉ Straße")).toBe("video ete straße");
  });
});

describe("filterInsights", () => {
  test("returns the same array for a blank term", () => {
    expect(filterInsights(insights, "  ")).toBe(insights);
  });

  test.each([
    ["title", "telemedicine", [2]],
    ["content, accent-insensitive", "VIDEO", [2]],
    ["category", "health", [2]],
    ["source", "travel guide", [3]],
    ["tags", "security", [1]],
    ["every word must match", "zero request", [1]],
    ["no match", "penguins", []],
  ])("matches by %s", (_, term, expectedIds) => {
    const ids = filterInsights(insights, term as string).map((insight) => insight.id);

    expect(ids).toEqual((expectedIds as number[]).map((i) => `insight-${i}`));
  });
});

describe("sortInsights", () => {
  const order = (field: SortOrder["field"], direction: SortOrder["direction"]) => ({
    field,
    direction,
  });

  test("keeps the API order for relevance, whatever the direction", () => {
    expect(sortInsights(insights, order("relevance", "desc"), collator)).toBe(insights);
  });

  test.each([
    ["asc", ["apps for travel", "Telemedicine", "Zero trust security"]],
    ["desc", ["Zero trust security", "Telemedicine", "apps for travel"]],
  ] as const)("sorts by title %s, ignoring case", (direction, titles) => {
    expect(sortInsights(insights, order("title", direction), collator).map((i) => i.title)).toEqual(
      titles,
    );
  });

  test.each([
    ["asc", ["Booking and navigation", "Consultas por vídeo", "Verify every request"]],
    ["desc", ["Verify every request", "Consultas por vídeo", "Booking and navigation"]],
  ] as const)("sorts by content %s", (direction, contents) => {
    expect(
      sortInsights(insights, order("content", direction), collator).map((i) => i.content),
    ).toEqual(contents);
  });

  test("does not mutate its input", () => {
    const before = [...insights];
    sortInsights(insights, order("title", "desc"), collator);

    expect(insights).toEqual(before);
  });
});

describe("highlightSegments", () => {
  const marked = (text: string, term: string) =>
    highlightSegments(text, searchWords(term))
      .map((segment) => (segment.match ? `[${segment.text}]` : segment.text))
      .join("");

  test("marks every occurrence, case-insensitively", () => {
    expect(marked("Security and cybersecurity", "security")).toBe("[Security] and cyber[security]");
  });

  test("matches accented text with an unaccented term, keeping the original characters", () => {
    expect(marked("Consultas por vídeo", "video")).toBe("Consultas por [vídeo]");
  });

  test("marks each word and merges overlapping matches", () => {
    expect(marked("zero trust security", "trust rust sec")).toBe("zero [trust] [sec]urity");
  });

  test("returns the text untouched without search words", () => {
    expect(highlightSegments("Telemedicine", [])).toEqual([{ text: "Telemedicine", match: false }]);
  });
});

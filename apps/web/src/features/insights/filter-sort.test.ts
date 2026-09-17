import { describe, expect, test } from "vitest";

import { makeInsight } from "@/test/utils";

import { filterInsights, normalizeText, sortInsights } from "./filter-sort";

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
  test("keeps the API order for relevance", () => {
    expect(sortInsights(insights, "relevance", collator)).toBe(insights);
  });

  test.each([
    ["title-asc", ["apps for travel", "Telemedicine", "Zero trust security"]],
    ["title-desc", ["Zero trust security", "Telemedicine", "apps for travel"]],
  ] as const)("sorts by %s, ignoring case", (order, titles) => {
    expect(sortInsights(insights, order, collator).map((i) => i.title)).toEqual(titles);
  });

  test.each([
    ["content-asc", ["Booking and navigation", "Consultas por vídeo", "Verify every request"]],
    ["content-desc", ["Verify every request", "Consultas por vídeo", "Booking and navigation"]],
  ] as const)("sorts by %s", (order, contents) => {
    expect(sortInsights(insights, order, collator).map((i) => i.content)).toEqual(contents);
  });

  test("does not mutate its input", () => {
    const before = [...insights];
    sortInsights(insights, "title-desc", collator);

    expect(insights).toEqual(before);
  });
});

import { useMemo } from "react";

import { useGetInsightsInfiniteQuery } from "@/features/prompts/api";
import { selectLastRequest } from "@/features/prompts/prompt-session-slice";
import type { Insight } from "@/features/prompts/types";
import { asApiError } from "@/lib/api/errors";
import { useAppSelector } from "@/store/hooks";

import { filterInsights, sortInsights } from "./filter-sort";
import { selectSearchTerm, selectSortOrder } from "./insights-view-slice";

const NO_INSIGHTS: Insight[] = [];

/**
 * Every loaded page of a response, filtered and sorted for display.
 *
 * Each step is memoized on its own inputs: typing a search term does not re-flatten
 * pages, and loading a page does not rebuild the collator.
 */
export function useVisibleInsights(responseId: string) {
  const query = useGetInsightsInfiniteQuery(responseId);
  const searchTerm = useAppSelector(selectSearchTerm);
  const sortOrder = useAppSelector(selectSortOrder);
  const language = useAppSelector(selectLastRequest)?.targetLanguage ?? "en";

  const pages = query.data?.pages;
  const loaded = useMemo(
    () => (pages ? pages.flatMap((page) => page.insights) : NO_INSIGHTS),
    [pages],
  );
  const collator = useMemo(
    () => new Intl.Collator(language, { sensitivity: "base", numeric: true }),
    [language],
  );
  const filtered = useMemo(() => filterInsights(loaded, searchTerm), [loaded, searchTerm]);
  const visible = useMemo(
    () => sortInsights(filtered, sortOrder, collator),
    [filtered, sortOrder, collator],
  );

  return {
    visible,
    loadedCount: loaded.length,
    totalCount: pages?.at(-1)?.pagination.totalItems ?? 0,
    isFiltered: searchTerm.trim() !== "",
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: asApiError(query.error),
  };
}

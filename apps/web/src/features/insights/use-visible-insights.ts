import { useMemo } from "react";

import { useGetInsightsInfiniteQuery } from "@/features/prompts/api";
import { selectLastRequest } from "@/features/prompts/prompt-session-slice";
import type { Insight } from "@/features/prompts/types";
import { asApiError } from "@/lib/api/errors";
import { useAppSelector } from "@/store/hooks";

import { filterInsights, searchWords, sortInsights } from "./filter-sort";
import { selectSearchTerm, selectSortDirection, selectSortField } from "./insights-view-slice";

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
  const sortField = useAppSelector(selectSortField);
  const sortDirection = useAppSelector(selectSortDirection);
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
  const highlightWords = useMemo(() => searchWords(searchTerm), [searchTerm]);
  const filtered = useMemo(() => filterInsights(loaded, searchTerm), [loaded, searchTerm]);
  const visible = useMemo(
    () => sortInsights(filtered, { field: sortField, direction: sortDirection }, collator),
    [filtered, sortField, sortDirection, collator],
  );

  return {
    visible,
    searchTerm,
    highlightWords,
    loadedCount: loaded.length,
    totalCount: pages?.at(-1)?.pagination.totalItems ?? 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadMoreError: asApiError(query.error),
  };
}

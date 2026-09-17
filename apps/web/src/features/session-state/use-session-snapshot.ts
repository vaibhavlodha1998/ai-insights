import { skipToken } from "@reduxjs/toolkit/query";
import { useMemo } from "react";

import { promptsApi } from "@/features/prompts/api";
import { useAppSelector } from "@/store/hooks";

/** Everything the app holds for this session, read from the store without fetching. */
export function useSessionSnapshot() {
  const session = useAppSelector((state) => state.promptSession);
  const view = useAppSelector((state) => state.insightsView);

  // One memoized selector per response, so the cache entry keeps its identity
  const selectPages = useMemo(
    () => promptsApi.endpoints.getInsights.select(session.responseId ?? skipToken),
    [session.responseId],
  );
  const pagesEntry = useAppSelector(selectPages);

  const pages = pagesEntry.data?.pages ?? [];
  const lastPage = pages.at(-1);

  return {
    session,
    view,
    results: lastPage
      ? {
          pagesLoaded: pages.length,
          totalPages: lastPage.pagination.totalPages,
          insightsLoaded: pages.reduce((sum, page) => sum + page.insights.length, 0),
          totalItems: lastPage.pagination.totalItems,
          pageSize: lastPage.pagination.pageSize,
          hasNextPage: lastPage.pagination.hasNextPage,
        }
      : null,
  };
}

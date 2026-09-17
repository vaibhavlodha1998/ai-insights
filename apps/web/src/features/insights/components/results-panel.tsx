"use client";

import { useCallback } from "react";

import { Button, EmptyState, SearchOffIcon } from "@/components/ui";
import { useAppDispatch } from "@/store/hooks";

import { setSearchTerm } from "../insights-view-slice";
import { useVisibleInsights } from "../use-visible-insights";
import { InsightList } from "./insight-list";
import { ResultsFooter } from "./results-footer";
import { ResultsHeading } from "./results-heading";
import { ResultsSkeleton } from "./results-skeleton";
import { SearchInput } from "./search-input";
import { SortControls } from "./sort-controls";

type ResultsPanelProps = { responseId: string; query: string };

export function ResultsPanel({ responseId, query }: ResultsPanelProps) {
  const dispatch = useAppDispatch();
  const {
    visible,
    searchTerm,
    highlightWords,
    loadedCount,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    loadMoreError,
  } = useVisibleInsights(responseId);

  const loadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);
  const clearSearch = useCallback(() => dispatch(setSearchTerm("")), [dispatch]);

  if (isLoading) return <ResultsSkeleton query={query} />;

  if (totalCount === 0) {
    return (
      <section className="flex flex-col gap-5.5">
        <ResultsHeading query={query} />
        <EmptyState title="No insights found">
          Try a different topic, such as technology, health, finance, climate or travel.
        </EmptyState>
      </section>
    );
  }

  const isSearching = highlightWords.length > 0;

  return (
    <section className="flex flex-col gap-5.5">
      <ResultsHeading query={query} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchInput />
        <SortControls />
      </div>

      <p aria-live="polite" data-testid="results-summary" className="m-0 text-sm text-muted">
        {isSearching ? (
          <>
            <strong className="font-semibold text-ink">{visible.length}</strong> of {loadedCount}{" "}
            {hasNextPage ? "loaded insights" : "insights"} match “{searchTerm}”
          </>
        ) : (
          <>
            Showing <strong className="font-semibold text-ink">{loadedCount}</strong> of{" "}
            {totalCount} insights
          </>
        )}
      </p>

      {visible.length > 0 ? (
        <InsightList insights={visible} highlightWords={highlightWords} />
      ) : (
        <EmptyState
          icon={<SearchOffIcon size={28} />}
          title={`No insights match “${searchTerm}”`}
          actions={
            <>
              {hasNextPage && (
                <Button variant="secondary" loading={isFetchingNextPage} loadingText="Loading…" onClick={loadMore}>
                  Load more
                </Button>
              )}
              <Button variant="ghost" className="text-accent" onClick={clearSearch}>
                Clear search
              </Button>
            </>
          }
        >
          {hasNextPage
            ? `You’ve seen ${loadedCount} of ${totalCount} insights. Load more to search the rest, or try a different word.`
            : "Try a different word."}
        </EmptyState>
      )}

      {(visible.length > 0 || loadMoreError) && (
        <ResultsFooter
          loadedCount={loadedCount}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
          error={loadMoreError}
        />
      )}
    </section>
  );
}

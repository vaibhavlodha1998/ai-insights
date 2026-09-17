"use client";

import { ApiErrorAlert } from "@/components/api-error-alert";

import { useVisibleInsights } from "../use-visible-insights";
import { InsightList } from "./insight-list";
import { SearchInput } from "./search-input";
import { SortSelect } from "./sort-select";

export function ResultsPanel({ responseId }: { responseId: string }) {
  const {
    visible,
    loadedCount,
    totalCount,
    isFiltered,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useVisibleInsights(responseId);

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading insights…</p>;
  }

  if (totalCount === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <h2 className="font-semibold">No insights found</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Try a different topic, such as technology, health, finance, climate or travel.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchInput />
        <SortSelect />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="results-title" className="text-lg font-semibold">
          Insights
        </h2>
        <p className="text-sm text-zinc-500" aria-live="polite" data-testid="results-summary">
          {isFiltered
            ? `${visible.length} of ${loadedCount} loaded match`
            : `Showing ${loadedCount} of ${totalCount}`}
        </p>
      </div>

      {visible.length > 0 ? (
        <InsightList insights={visible} />
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No loaded insights match your search
          {hasNextPage ? ". Load more to search further." : "."}
        </p>
      )}

      {error && <ApiErrorAlert error={error} title="Could not load more insights" />}

      {hasNextPage && (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="h-10 rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
          {isFiltered && (
            <p className="text-xs text-zinc-500">Search covers loaded insights only</p>
          )}
        </div>
      )}
    </section>
  );
}

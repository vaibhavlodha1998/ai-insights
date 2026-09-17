"use client";

import { Alert, Button, CheckIcon, ProgressBar } from "@/components/ui";
import { userMessage } from "@/features/prompts/errors";
import type { ApiError } from "@/lib/api/errors";

type ResultsFooterProps = {
  loadedCount: number;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  error?: ApiError;
};

/** Progress through the pages, "Load more", and what happens when loading fails. */
export function ResultsFooter({
  loadedCount,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  error,
}: ResultsFooterProps) {
  if (error) {
    return (
      <Alert
        tone="danger"
        title="Could not load more insights"
        actions={
          <Button variant="secondary" loading={isFetchingNextPage} loadingText="Loading…" onClick={onLoadMore}>
            Try again
          </Button>
        }
      >
        <p className="m-0">{userMessage(error)}</p>
      </Alert>
    );
  }

  if (!hasNextPage) {
    return (
      <p className="m-0 flex items-center justify-center gap-2 pt-2 text-sm text-muted">
        <CheckIcon size={16} className="text-accent" />
        All {totalCount} insights loaded
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <ProgressBar value={loadedCount} max={totalCount} label="Insights loaded" className="w-60" />
      <p className="m-0 text-sm text-muted">
        You’ve seen {loadedCount} of {totalCount} insights
      </p>
      <Button variant="secondary" size="lg" loading={isFetchingNextPage} loadingText="Loading…" onClick={onLoadMore}>
        Load more
      </Button>
    </div>
  );
}

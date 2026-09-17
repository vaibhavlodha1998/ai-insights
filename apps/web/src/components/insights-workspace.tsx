"use client";

import { ResultsPanel } from "@/features/insights/components/results-panel";
import { ClarificationNotice } from "@/features/prompts/components/clarification-notice";
import { PromptForm } from "@/features/prompts/components/prompt-form";
import {
  dismissError,
  selectResponseId,
  selectSessionError,
  selectSessionStatus,
} from "@/features/prompts/prompt-session-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { ApiErrorAlert } from "./api-error-alert";

/** Page composition: the form, then whatever the last response calls for. */
export function InsightsWorkspace() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSessionStatus);
  const error = useAppSelector(selectSessionError);
  const responseId = useAppSelector(selectResponseId);

  return (
    <div className="flex flex-col gap-6">
      {/* Above the form, which is where the requested details go */}
      <ClarificationNotice />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <PromptForm />
      </section>

      {error && <ApiErrorAlert error={error} onDismiss={() => dispatch(dismissError())} />}

      {/* Keyed so search and scroll state reset for each new response */}
      {responseId ? (
        <ResultsPanel key={responseId} responseId={responseId} />
      ) : (
        status === "idle" && (
          <p className="text-center text-sm text-zinc-500">
            Ask about technology, health, finance, climate or travel to see insights.
          </p>
        )
      )}
    </div>
  );
}

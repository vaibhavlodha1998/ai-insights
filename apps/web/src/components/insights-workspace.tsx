"use client";

import { ResultsPanel } from "@/features/insights/components/results-panel";
import { ResultsSkeleton } from "@/features/insights/components/results-skeleton";
import { ClarificationHelp } from "@/features/prompts/components/clarification-help";
import { ClarificationNotice } from "@/features/prompts/components/clarification-notice";
import { PromptForm } from "@/features/prompts/components/prompt-form";
import { SubmitError } from "@/features/prompts/components/submit-error";
import { Welcome } from "@/features/prompts/components/welcome";
import { errorField } from "@/features/prompts/errors";
import {
  selectContextId,
  selectLastRequest,
  selectPendingPrompts,
  selectResponseId,
  selectResultsFor,
  selectSessionError,
  selectSessionStatus,
} from "@/features/prompts/prompt-session-slice";
import { useAppSelector } from "@/store/hooks";

/** Page composition: the form on the left, whatever the session calls for on the right. */
export function InsightsWorkspace() {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[392px_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        {/* Above the form, which is where the requested details go */}
        <ClarificationNotice />
        <PromptForm />
      </div>
      <WorkspaceMain />
    </div>
  );
}

function WorkspaceMain() {
  const status = useAppSelector(selectSessionStatus);
  const error = useAppSelector(selectSessionError);
  const responseId = useAppSelector(selectResponseId);
  const resultsFor = useAppSelector(selectResultsFor);
  const contextId = useAppSelector(selectContextId);
  const pendingPrompts = useAppSelector(selectPendingPrompts);
  const lastRequest = useAppSelector(selectLastRequest);

  if (status === "submitting" && lastRequest) {
    return <ResultsSkeleton query={[...pendingPrompts, lastRequest.prompt].join(" ")} />;
  }

  // Field problems are shown on the form itself
  const pageError = error && !errorField(error) ? error : null;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {pageError && <SubmitError error={pageError} />}
      {contextId ? (
        <ClarificationHelp />
      ) : responseId && resultsFor ? (
        // Keyed so search input and scroll state reset for each new result
        <ResultsPanel key={responseId} responseId={responseId} query={resultsFor} />
      ) : (
        !pageError && <Welcome />
      )}
    </div>
  );
}

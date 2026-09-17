"use client";

import { Alert, Button } from "@/components/ui";
import type { ApiError } from "@/lib/api/errors";
import { useAppDispatch } from "@/store/hooks";

import { userMessage } from "../errors";
import { dismissError } from "../prompt-session-slice";
import { useSubmitPrompt } from "../use-submit-prompt";

/** A failed submit that isn't about a form field (network, server, expired thread). */
export function SubmitError({ error }: { error: ApiError }) {
  const dispatch = useAppDispatch();
  const { retry, canRetry } = useSubmitPrompt();
  // Resending into an expired conversation would fail the same way
  const retryable = canRetry && error.code !== "CONTEXT_NOT_FOUND";

  return (
    <div className="flex flex-col gap-4">
      <Alert
        tone="danger"
        size="lg"
        title="We couldn’t get your insights"
        actions={
          <>
            {retryable && (
              <Button variant="danger" onClick={retry}>
                Try again
              </Button>
            )}
            <Button
              variant="secondary"
              className="border-danger-line text-danger-ink"
              onClick={() => dispatch(dismissError())}
            >
              Dismiss
            </Button>
          </>
        }
      >
        <p className="m-0">{userMessage(error)}</p>
      </Alert>
      <p className="m-0 text-[15px] leading-relaxed text-muted">
        Your question is still in the form, so nothing needs to be retyped.
      </p>
    </div>
  );
}

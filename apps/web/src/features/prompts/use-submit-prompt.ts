import { useCallback } from "react";

import { useAppSelector } from "@/store/hooks";

import { useSubmitPromptMutation } from "./api";
import { selectContextId } from "./prompt-session-slice";
import type { PromptFormValues } from "./schema";
import type { PromptResponse } from "./types";

// Shared cache key: every component using the hook sees the same in-flight request
const SUBMIT_CACHE_KEY = "submit-prompt";

/** Submits the form, continuing the open clarification thread if there is one. */
export function useSubmitPrompt() {
  const contextId = useAppSelector(selectContextId);
  const [submitPrompt, { isLoading }] = useSubmitPromptMutation({
    fixedCacheKey: SUBMIT_CACHE_KEY,
  });

  const submit = useCallback(
    (values: PromptFormValues): Promise<PromptResponse> =>
      submitPrompt({ ...values, ...(contextId ? { contextId } : {}) }).unwrap(),
    [submitPrompt, contextId],
  );

  return { submit, isSubmitting: isLoading };
}

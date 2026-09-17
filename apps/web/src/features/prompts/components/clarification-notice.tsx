"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  selectClarificationMessage,
  selectPendingPrompts,
  startOver,
} from "../prompt-session-slice";

export function ClarificationNotice() {
  const dispatch = useAppDispatch();
  const message = useAppSelector(selectClarificationMessage);
  const pendingPrompts = useAppSelector(selectPendingPrompts);

  if (!message) return null;

  return (
    <section
      role="status"
      aria-labelledby="clarification-title"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="clarification-title" className="text-sm font-semibold">
            {message}
          </h2>
          <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
            Your prompt needs more context. Add details below and they will be combined
            with what you already sent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(startOver())}
          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium underline-offset-2 hover:underline"
        >
          Start over
        </button>
      </div>

      {pendingPrompts.length > 0 && (
        <ol className="mt-3 flex flex-wrap gap-2" aria-label="Prompts so far">
          {pendingPrompts.map((prompt, index) => (
            <li
              // Prompts can repeat; position is the identity within the thread
              key={index}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs dark:bg-amber-900/60"
            >
              “{prompt}”
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

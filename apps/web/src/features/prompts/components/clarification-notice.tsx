"use client";

import { Alert, Button, Chip } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  selectClarificationMessage,
  selectPendingPrompts,
  startOver,
} from "../prompt-session-slice";

/** Shown above the form while the API is waiting for more details. */
export function ClarificationNotice() {
  const dispatch = useAppDispatch();
  const message = useAppSelector(selectClarificationMessage);
  const pendingPrompts = useAppSelector(selectPendingPrompts);

  if (!message) return null;

  return (
    <Alert tone="warning" title={message}>
      <p className="m-0">Tell us a bit more and we’ll combine it with what you asked.</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ol aria-label="What you’ve asked so far" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {pendingPrompts.map((prompt, index) => (
            // Prompts can repeat; position is the identity within the thread
            <li key={index}>
              <Chip className="border-warning-line bg-surface text-warning-ink">“{prompt}”</Chip>
            </li>
          ))}
        </ol>
        <Button variant="link" className="text-warning-text" onClick={() => dispatch(startOver())}>
          Start over
        </Button>
      </div>
    </Alert>
  );
}

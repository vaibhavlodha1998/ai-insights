"use client";

import { useAppDispatch } from "@/store/hooks";

import { fillPrompt } from "../prompt-session-slice";
import { CLARIFICATION_IDEAS } from "../suggestions";

/** The results area while the API is waiting for more details. */
export function ClarificationHelp() {
  const dispatch = useAppDispatch();

  return (
    <section aria-labelledby="clarification-help-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <h1
          id="clarification-help-title"
          className="m-0 font-display text-4xl leading-tight font-medium tracking-[-0.015em]"
        >
          Tell us a little more
        </h1>
        <p className="m-0 max-w-[600px] text-base leading-relaxed text-ink-muted">
          Add an area, a place or a time frame so we can find the right insights.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[15px] font-semibold">You could add</h2>
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {CLARIFICATION_IDEAS.map((idea) => (
            <li key={idea}>
              <button
                type="button"
                onClick={() => dispatch(fillPrompt({ prompt: idea }))}
                className="min-h-11 cursor-pointer rounded-full border border-line-strong bg-surface px-4 text-[15px] hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                {idea}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

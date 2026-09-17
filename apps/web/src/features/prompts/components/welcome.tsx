"use client";

import { ArrowRightIcon } from "@/components/ui";
import { useAppDispatch } from "@/store/hooks";

import { fillPrompt } from "../prompt-session-slice";
import { LANGUAGES } from "../schema";
import { PROMPT_SUGGESTIONS } from "../suggestions";

const LANGUAGE_NAME = Object.fromEntries(LANGUAGES.map(({ code, label }) => [code, label]));

/** The results area before the first question. */
export function Welcome() {
  const dispatch = useAppDispatch();

  return (
    <section aria-labelledby="welcome-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1
          id="welcome-title"
          className="m-0 font-display text-[44px] leading-[1.1] font-medium tracking-[-0.02em]"
        >
          What would you like to know?
        </h1>
        <p className="m-0 max-w-[600px] text-[17px] leading-relaxed text-ink-muted">
          Ask about technology, health, finance, climate or travel, in English, Spanish, French or
          German.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Try one of these</h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion.prompt}>
              <button
                type="button"
                onClick={() => dispatch(fillPrompt(suggestion))}
                className="flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4.5 py-4 text-left hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-base leading-snug font-medium">{suggestion.prompt}</span>
                  <span className="text-[13px] text-muted">
                    {LANGUAGE_NAME[suggestion.targetLanguage]}
                  </span>
                </span>
                <ArrowRightIcon className="shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

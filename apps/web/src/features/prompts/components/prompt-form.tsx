"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";

import { isApiError } from "@/lib/api/errors";
import { useAppSelector } from "@/store/hooks";

import { selectContextId } from "../prompt-session-slice";
import {
  LANGUAGES,
  MAX_PROMPT_LENGTH,
  promptFormSchema,
  type PromptFormInput,
  type PromptFormValues,
} from "../schema";
import { useSubmitPrompt } from "../use-submit-prompt";

// API error codes that belong to one form field; others go to <ApiErrorAlert/>
const FIELD_FOR_CODE: Partial<Record<string, keyof PromptFormInput>> = {
  PROMPT_REQUIRED: "prompt",
  PROMPT_TOO_LONG: "prompt",
  LANGUAGE_REQUIRED: "targetLanguage",
  INVALID_LANGUAGE: "targetLanguage",
};

const EMPTY_FORM: PromptFormInput = {
  prompt: "",
  targetLanguage: "" as PromptFormInput["targetLanguage"],
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300";

export function PromptForm() {
  const isFollowUp = useAppSelector(selectContextId) !== null;
  const { submit, isSubmitting } = useSubmitPrompt();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isValid },
  } = useForm<PromptFormInput, unknown, PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    mode: "onChange",
    defaultValues: EMPTY_FORM,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await submit(values);
      // Ready for the next prompt (or the clarification details), same language
      reset({ prompt: "", targetLanguage: values.targetLanguage });
      setFocus("prompt");
    } catch (error) {
      const field = isApiError(error) ? FIELD_FOR_CODE[error.code] : undefined;
      if (field && isApiError(error)) {
        setError(field, { type: "server", message: error.message }, { shouldFocus: true });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prompt" className="text-sm font-medium">
          {isFollowUp ? "Add more details" : "Prompt"}
        </label>
        <textarea
          id="prompt"
          rows={3}
          placeholder={
            isFollowUp ? "e.g. in healthcare" : "e.g. How is AI changing healthcare?"
          }
          aria-invalid={errors.prompt ? true : undefined}
          aria-describedby="prompt-feedback"
          className={`${inputClass} resize-y py-2`}
          {...register("prompt")}
        />
        <div id="prompt-feedback" className="flex justify-between gap-4 text-xs">
          <p role="alert" className="text-red-700 dark:text-red-400">
            {errors.prompt?.message}
          </p>
          <PromptLength control={control} />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="targetLanguage" className="text-sm font-medium">
            Target language
          </label>
          <select
            id="targetLanguage"
            aria-invalid={errors.targetLanguage ? true : undefined}
            className={`${inputClass} h-10`}
            {...register("targetLanguage")}
          >
            <option value="" disabled>
              Select a language
            </option>
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label} ({language.code})
              </option>
            ))}
          </select>
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {errors.targetLanguage?.message}
          </p>
        </div>

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 sm:mt-[1.625rem] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          {isSubmitting ? "Submitting…" : isFollowUp ? "Send details" : "Get insights"}
        </button>
      </div>
    </form>
  );
}

/** Subscribes to the prompt on its own, so typing re-renders only this counter. */
function PromptLength({ control }: { control: Control<PromptFormInput> }) {
  const prompt = useWatch({ control, name: "prompt" });
  const length = prompt.length;
  return (
    <p
      className={`shrink-0 tabular-nums ${length > MAX_PROMPT_LENGTH ? "text-red-700 dark:text-red-400" : "text-zinc-500"}`}
    >
      {length}/{MAX_PROMPT_LENGTH}
    </p>
  );
}

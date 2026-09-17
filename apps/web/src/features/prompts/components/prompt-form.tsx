"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";

import { ArrowRightIcon, Button, Card, Field, Select, Textarea, fieldA11yProps } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { useAppSelector } from "@/store/hooks";

import { FIELD_FOR_ERROR_CODE } from "../errors";
import { selectContextId, selectDraft } from "../prompt-session-slice";
import {
  LANGUAGES,
  MAX_PROMPT_LENGTH,
  promptFormSchema,
  type PromptFormInput,
  type PromptFormValues,
} from "../schema";
import { useSubmitPrompt } from "../use-submit-prompt";

const EMPTY_FORM: PromptFormInput = {
  prompt: "",
  targetLanguage: "" as PromptFormInput["targetLanguage"],
};

const LANGUAGE_OPTIONS = LANGUAGES.map(({ code, label }) => ({
  value: code,
  label: `${label} (${code})`,
}));

export function PromptForm() {
  const isFollowUp = useAppSelector(selectContextId) !== null;
  const draft = useAppSelector(selectDraft);
  const { submit, isSubmitting } = useSubmitPrompt();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    formState: { errors, isValid },
  } = useForm<PromptFormInput, unknown, PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    // Errors appear as soon as a field is changed or left, never before
    mode: "all",
    defaultValues: EMPTY_FORM,
  });

  // A suggestion picked elsewhere on the page fills the form
  useEffect(() => {
    if (!draft) return;
    setValue("prompt", draft.prompt, { shouldValidate: true, shouldDirty: true });
    if (draft.targetLanguage) {
      setValue("targetLanguage", draft.targetLanguage, { shouldValidate: true, shouldDirty: true });
    }
    setFocus("prompt");
  }, [draft, setValue, setFocus]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await submit(values);
      // Ready for the next question (or the requested details), same language
      reset({ prompt: "", targetLanguage: values.targetLanguage });
      setFocus("prompt");
    } catch (error) {
      const field = isApiError(error) ? FIELD_FOR_ERROR_CODE[error.code] : undefined;
      if (field && isApiError(error)) {
        setError(field, { type: "server", message: error.message }, { shouldFocus: true });
      }
      // Other failures are shown next to the results by <SubmitError/>
    }
  });

  return (
    <Card as="form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4.5">
      {!isFollowUp && <h2 className="m-0 font-display text-xl font-semibold">Ask a question</h2>}

      <Field
        id="prompt"
        label={isFollowUp ? "Add more details" : "Prompt"}
        error={errors.prompt?.message}
        aside={<PromptLength control={control} />}
      >
        <Textarea
          {...fieldA11yProps("prompt", errors.prompt?.message)}
          rows={isFollowUp ? 3 : 4}
          placeholder={isFollowUp ? "e.g. in healthcare" : "e.g. How is AI changing healthcare?"}
          readOnly={isSubmitting}
          {...register("prompt")}
        />
      </Field>

      <Field id="targetLanguage" label="Target language" error={errors.targetLanguage?.message}>
        <Select
          {...fieldA11yProps("targetLanguage", errors.targetLanguage?.message)}
          options={LANGUAGE_OPTIONS}
          placeholder="Select a language"
          {...register("targetLanguage", { disabled: isSubmitting })}
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={!isValid}
        loading={isSubmitting}
        loadingText={isFollowUp ? "Sending details…" : "Getting insights…"}
        icon={<ArrowRightIcon />}
      >
        {isFollowUp ? "Send details" : "Get insights"}
      </Button>
    </Card>
  );
}

/** Subscribes to the prompt on its own, so typing re-renders only this counter. */
function PromptLength({ control }: { control: Control<PromptFormInput> }) {
  const length = (useWatch({ control, name: "prompt" }) ?? "").length;
  return (
    <span
      className={cn(
        "ml-auto shrink-0 font-mono text-xs tabular-nums",
        length > MAX_PROMPT_LENGTH ? "text-danger-text" : "text-subtle",
      )}
    >
      {length} / {MAX_PROMPT_LENGTH}
    </span>
  );
}

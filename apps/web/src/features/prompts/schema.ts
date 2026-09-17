import { z } from "zod";

import type { LanguageCode } from "./types";

export const MAX_PROMPT_LENGTH = 2000;

export const LANGUAGES: readonly { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
];

const LANGUAGE_CODES = LANGUAGES.map((language) => language.code) as [
  LanguageCode,
  ...LanguageCode[],
];

/**
 * Mirrors the API's hard validation rules. Whether a prompt is detailed enough is
 * deliberately left to the API, which answers NEEDS_CLARIFICATION.
 */
export const promptFormSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Enter a prompt")
    .max(MAX_PROMPT_LENGTH, `Prompt must be at most ${MAX_PROMPT_LENGTH} characters`),
  targetLanguage: z.enum(LANGUAGE_CODES, { message: "Choose a target language" }),
});

export type PromptFormInput = z.input<typeof promptFormSchema>;
export type PromptFormValues = z.output<typeof promptFormSchema>;

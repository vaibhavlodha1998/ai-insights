import { NETWORK_ERROR, type ApiError } from "@/lib/api/errors";

import type { PromptFormInput } from "./schema";

/** API error codes that belong to one form field; they are shown on that field. */
export const FIELD_FOR_ERROR_CODE: Partial<Record<string, keyof PromptFormInput>> = {
  PROMPT_REQUIRED: "prompt",
  PROMPT_TOO_LONG: "prompt",
  LANGUAGE_REQUIRED: "targetLanguage",
  INVALID_LANGUAGE: "targetLanguage",
};

export function errorField(error: ApiError | null): keyof PromptFormInput | undefined {
  return error ? FIELD_FOR_ERROR_CODE[error.code] : undefined;
}

const GENERIC_MESSAGE = "Something went wrong on our side. Please try again.";

/**
 * The sentence a user sees for an error. Validation messages from the API are
 * already written for people; anything technical gets a plain replacement.
 */
export function userMessage(error: ApiError): string {
  switch (error.code) {
    case NETWORK_ERROR:
      return error.message;
    case "CONTEXT_NOT_FOUND":
      return "This conversation has expired. Ask your full question again.";
    case "RESPONSE_NOT_FOUND":
    case "INVALID_PAGE":
      return "These results are no longer available. Ask your question again.";
    default:
      if (FIELD_FOR_ERROR_CODE[error.code] || error.status === 422) return error.message;
      return GENERIC_MESSAGE;
  }
}

import { describe, expect, test } from "vitest";

import type { ApiError } from "@/lib/api/errors";

import { errorField, userMessage } from "./errors";

const apiError = (code: string, status: number, message = "raw message"): ApiError => ({
  code,
  status,
  message,
  requestId: "req-1",
  details: null,
});

describe("userMessage", () => {
  test.each([
    [apiError("PROMPT_REQUIRED", 422, "Prompt is required"), "Prompt is required"],
    [apiError("INVALID_LANGUAGE", 422, "Target language is not supported"), "Target language is not supported"],
    [
      apiError("NETWORK_ERROR", 0, "Could not reach the server. Check your connection and try again."),
      "Could not reach the server. Check your connection and try again.",
    ],
    [apiError("CONTEXT_NOT_FOUND", 404), "This conversation has expired. Ask your full question again."],
    [apiError("RESPONSE_NOT_FOUND", 404), "These results are no longer available. Ask your question again."],
    [apiError("INTERNAL_ERROR", 500, "Internal server error"), "Something went wrong on our side. Please try again."],
    [apiError("UNEXPECTED_ERROR", 502), "Something went wrong on our side. Please try again."],
  ])("%o", (error, expected) => {
    expect(userMessage(error)).toBe(expected);
  });
});

test("errorField maps field codes to form fields", () => {
  expect(errorField(apiError("PROMPT_TOO_LONG", 422))).toBe("prompt");
  expect(errorField(apiError("LANGUAGE_REQUIRED", 422))).toBe("targetLanguage");
  expect(errorField(apiError("NETWORK_ERROR", 0))).toBeUndefined();
  expect(errorField(null)).toBeUndefined();
});

import { describe, expect, test } from "vitest";

import { MAX_PROMPT_LENGTH, promptFormSchema } from "./schema";

describe("promptFormSchema", () => {
  test("accepts a prompt and a supported language, trimming the prompt", () => {
    const result = promptFormSchema.safeParse({ prompt: "  AI in health  ", targetLanguage: "es" });

    expect(result.success && result.data).toEqual({ prompt: "AI in health", targetLanguage: "es" });
  });

  test.each([
    [{ prompt: "", targetLanguage: "en" }, "prompt", "Enter a prompt"],
    [{ prompt: "   ", targetLanguage: "en" }, "prompt", "Enter a prompt"],
    [
      { prompt: "x".repeat(MAX_PROMPT_LENGTH + 1), targetLanguage: "en" },
      "prompt",
      "Prompt must be at most 2000 characters",
    ],
    [{ prompt: "AI in health", targetLanguage: "" }, "targetLanguage", "Choose a target language"],
    [{ prompt: "AI in health", targetLanguage: "jp" }, "targetLanguage", "Choose a target language"],
  ])("rejects %o", (input, field, message) => {
    const result = promptFormSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });

  test("leaves short but non-empty prompts to the API's clarification check", () => {
    expect(promptFormSchema.safeParse({ prompt: "AI", targetLanguage: "en" }).success).toBe(true);
  });
});

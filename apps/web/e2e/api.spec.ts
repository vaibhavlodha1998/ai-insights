import { expect, test } from "@playwright/test";

// Requests go through the web app's /api/* rewrite, so these also cover the proxy

test("the API is reachable through the web proxy", async ({ request }) => {
  const response = await request.get("/api/health", {
    headers: { "X-Request-ID": "e2e-proxy-check" },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-request-id"]).toBe("e2e-proxy-check");
});

test.describe("POST /api/prompts validation", () => {
  const cases = [
    { body: { targetLanguage: "en" }, code: "PROMPT_REQUIRED", message: "Prompt is required" },
    {
      body: { prompt: "How is AI changing healthcare?", targetLanguage: "jp" },
      code: "INVALID_LANGUAGE",
      message: "Target language is not supported",
    },
    {
      body: { prompt: "How is AI changing healthcare?", targetLanguage: "en", contextId: "x" },
      code: "INVALID_CONTEXT_ID",
      message: "Context id must be a valid UUID",
    },
  ];

  for (const { body, code, message } of cases) {
    test(code, async ({ request }) => {
      const response = await request.post("/api/prompts", { data: body });

      expect(response.status()).toBe(422);
      expect(await response.json()).toMatchObject({
        error: { code, message, request_id: expect.any(String) },
      });
    });
  }
});

test("short prompts need clarification before any AI call", async ({ request }) => {
  const response = await request.post("/api/prompts", {
    data: { prompt: "AI", targetLanguage: "en" },
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: "NEEDS_CLARIFICATION",
    message: "Please provide more details",
    contextId: expect.any(String),
  });
});

test("pages beyond the first are served by responseId", async ({ request }) => {
  const first = await (
    await request.post("/api/prompts", {
      data: { prompt: "How is AI changing healthcare?", targetLanguage: "en" },
    })
  ).json();

  const second = await request.get(`/api/prompts/${first.responseId}/insights?page=2`);

  expect(first.pagination).toMatchObject({ page: 1, totalItems: 20, hasNextPage: true });
  expect(await second.json()).toMatchObject({
    responseId: first.responseId,
    pagination: { page: 2, hasNextPage: false },
  });
});

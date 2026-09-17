import { describe, expect, test } from "vitest";

import { selectSearchTerm, setSearchTerm } from "@/features/insights/insights-view-slice";
import { makeStore } from "@/store/store";
import { errorResponse, makeInsight, mockFetch, requestBody } from "@/test/utils";

import { promptsApi } from "./api";
import {
  selectClarificationMessage,
  selectContextId,
  selectLastRequest,
  selectPendingPrompts,
  selectResponseId,
  selectSessionError,
  selectSessionStatus,
  startOver,
} from "./prompt-session-slice";

const { submitPrompt, getInsights } = promptsApi.endpoints;

const success = {
  status: "SUCCESS",
  responseId: "response-1",
  contextId: "context-1",
  insights: [makeInsight(1), makeInsight(2)],
  pagination: { page: 1, pageSize: 10, totalItems: 12, totalPages: 2, hasNextPage: true },
};

const clarification = {
  status: "NEEDS_CLARIFICATION",
  message: "Please provide more details",
  contextId: "context-1",
};

describe("submitting a prompt", () => {
  test("stores the request, and seeds page 1 into the insights cache", async () => {
    const fetchMock = mockFetch(() => Response.json(success));
    const store = makeStore();

    await store.dispatch(submitPrompt.initiate({ prompt: "AI in health", targetLanguage: "en" }));

    const state = store.getState();
    expect(selectSessionStatus(state)).toBe("success");
    expect(selectLastRequest(state)).toEqual({ prompt: "AI in health", targetLanguage: "en" });
    expect(selectResponseId(state)).toBe("response-1");
    expect(selectContextId(state)).toBeNull();

    const cached = getInsights.select("response-1")(state);
    expect(cached.data?.pages).toEqual([
      { responseId: "response-1", insights: success.insights, pagination: success.pagination },
    ]);
    expect(cached.data?.pageParams).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("opens a clarification thread, then sends its contextId with the follow-up", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    const store = makeStore();

    await store.dispatch(submitPrompt.initiate({ prompt: "AI", targetLanguage: "en" }));

    expect(selectSessionStatus(store.getState())).toBe("needsClarification");
    expect(selectContextId(store.getState())).toBe("context-1");
    expect(selectPendingPrompts(store.getState())).toEqual(["AI"]);
    expect(selectClarificationMessage(store.getState())).toBe("Please provide more details");

    fetchMock.mockImplementation(async () => Response.json(success));
    await store.dispatch(
      submitPrompt.initiate({ prompt: "in healthcare", targetLanguage: "en", contextId: "context-1" }),
    );

    expect(await requestBody(fetchMock, 1)).toEqual({
      prompt: "in healthcare",
      targetLanguage: "en",
      contextId: "context-1",
    });
    expect(selectSessionStatus(store.getState())).toBe("success");
    expect(selectPendingPrompts(store.getState())).toEqual([]);
    expect(selectContextId(store.getState())).toBeNull();
  });

  test("records structured API errors", async () => {
    mockFetch(() => errorResponse(422, "INVALID_LANGUAGE", "Target language is not supported"));
    const store = makeStore();

    await store.dispatch(submitPrompt.initiate({ prompt: "AI in health", targetLanguage: "en" }));

    expect(selectSessionStatus(store.getState())).toBe("error");
    expect(selectSessionError(store.getState())).toEqual({
      status: 422,
      code: "INVALID_LANGUAGE",
      message: "Target language is not supported",
      requestId: "req-test",
      details: null,
    });
  });

  test("drops an expired clarification thread", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    const store = makeStore();
    await store.dispatch(submitPrompt.initiate({ prompt: "AI", targetLanguage: "en" }));

    fetchMock.mockImplementation(async () => errorResponse(404, "CONTEXT_NOT_FOUND", "Context not found"));
    await store.dispatch(
      submitPrompt.initiate({ prompt: "in health", targetLanguage: "en", contextId: "context-1" }),
    );

    expect(selectContextId(store.getState())).toBeNull();
    expect(selectPendingPrompts(store.getState())).toEqual([]);
  });

  test("a new successful result clears the search term", async () => {
    mockFetch(() => Response.json(success));
    const store = makeStore();
    store.dispatch(setSearchTerm("cloud"));

    await store.dispatch(submitPrompt.initiate({ prompt: "AI in health", targetLanguage: "en" }));

    expect(selectSearchTerm(store.getState())).toBe("");
  });

  test("start over resets the session", async () => {
    mockFetch(() => Response.json(clarification));
    const store = makeStore();
    await store.dispatch(submitPrompt.initiate({ prompt: "AI", targetLanguage: "en" }));

    store.dispatch(startOver());

    expect(selectSessionStatus(store.getState())).toBe("idle");
    expect(selectContextId(store.getState())).toBeNull();
  });
});

import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { setSearchTerm, setSortDirection, setSortField } from "@/features/insights/insights-view-slice";
import { promptsApi } from "@/features/prompts/api";
import { makeStore } from "@/store/store";
import { errorResponse, makeInsight, mockFetch, renderWithStore } from "@/test/utils";

import { SessionStateView } from "./session-state-view";

const { submitPrompt } = promptsApi.endpoints;

function rowValue(term: string) {
  return screen.getByText(term, { selector: "dt" }).nextElementSibling;
}

describe("SessionStateView", () => {
  test("invites a first question when the store is empty", () => {
    renderWithStore(<SessionStateView />);

    expect(screen.getByRole("heading", { name: "Nothing here yet" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/");
  });

  test("shows the request, the response and the results view from the store", async () => {
    mockFetch(() =>
      Response.json({
        status: "SUCCESS",
        responseId: "response-1",
        contextId: "context-1",
        insights: [makeInsight(1)],
        pagination: { page: 1, pageSize: 10, totalItems: 12, totalPages: 2, hasNextPage: true },
      }),
    );
    const store = makeStore();
    await store.dispatch(submitPrompt.initiate({ prompt: "AI in health", targetLanguage: "fr" }));
    store.dispatch(setSearchTerm("cloud"));
    store.dispatch(setSortField("title"));
    store.dispatch(setSortDirection("desc"));

    renderWithStore(<SessionStateView />, { store });

    expect(rowValue("Target language")).toHaveTextContent("French (fr)");
    expect(rowValue("Status")).toHaveTextContent("Insights ready");
    expect(rowValue("Response ID")).toHaveTextContent("response-1");
    expect(rowValue("Pages loaded")).toHaveTextContent("1 of 2");
    expect(rowValue("Insights loaded")).toHaveTextContent("1 of 12");
    expect(rowValue("More pages")).toHaveTextContent("Yes");
    expect(rowValue("Search")).toHaveTextContent("“cloud”");
    expect(rowValue("Sort")).toHaveTextContent("Title, Z–A");
  });

  test("includes the technical details of the last error", async () => {
    mockFetch(() => errorResponse(422, "INVALID_LANGUAGE", "Target language is not supported"));
    const store = makeStore();
    await store.dispatch(submitPrompt.initiate({ prompt: "AI in health", targetLanguage: "en" }));

    renderWithStore(<SessionStateView />, { store });

    expect(rowValue("Code")).toHaveTextContent("INVALID_LANGUAGE");
    expect(rowValue("HTTP status")).toHaveTextContent("422");
    expect(rowValue("Request ID")).toHaveTextContent("req-test");
  });
});

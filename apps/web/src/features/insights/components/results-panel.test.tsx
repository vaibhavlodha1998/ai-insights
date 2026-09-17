import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { promptsApi } from "@/features/prompts/api";
import { makeStore } from "@/store/store";
import { makeInsight, makePage, mockFetch, renderWithStore } from "@/test/utils";

import { ResultsPanel } from "./results-panel";

const firstPage = makePage(
  Array.from({ length: 10 }, (_, i) =>
    makeInsight(i + 1, i === 3 ? { title: "Cloud costs", tags: ["cloud"] } : {}),
  ),
  { totalItems: 12 },
);
const secondPage = makePage([makeInsight(11), makeInsight(12, { title: "Cloud security" })], {
  page: 2,
  totalItems: 12,
});

function seededStore() {
  const store = makeStore();
  store.dispatch(
    promptsApi.util.upsertQueryEntries([
      {
        endpointName: "getInsights",
        arg: "response-1",
        value: { pages: [firstPage], pageParams: [1] },
      },
    ]),
  );
  return store;
}

function titles() {
  return within(screen.getByRole("list", { name: "Insights" }))
    .getAllByRole("heading")
    .map((heading) => heading.textContent);
}

describe("ResultsPanel", () => {
  test("shows the seeded first page without fetching it again", () => {
    const fetchMock = mockFetch(() => Response.json(secondPage));

    renderWithStore(<ResultsPanel responseId="response-1" />, { store: seededStore() });

    expect(titles()).toHaveLength(10);
    expect(screen.getByTestId("results-summary")).toHaveTextContent("Showing 10 of 12");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("load more appends the next page and hides the button at the end", async () => {
    const fetchMock = mockFetch(() => Response.json(secondPage));
    renderWithStore(<ResultsPanel responseId="response-1" />, { store: seededStore() });

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(titles()).toHaveLength(12));
    const url = new URL((fetchMock.mock.calls[0][0] as Request).url);
    expect(url.pathname).toBe("/api/prompts/response-1/insights");
    expect(url.searchParams.get("page")).toBe("2");
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(screen.getByTestId("results-summary")).toHaveTextContent("Showing 12 of 12");
  });

  test("search filters loaded insights after the debounce", async () => {
    mockFetch(() => Response.json(secondPage));
    renderWithStore(<ResultsPanel responseId="response-1" />, { store: seededStore() });

    await userEvent.type(screen.getByLabelText("Search"), "cloud");

    // Still unfiltered immediately after typing
    expect(titles()).toHaveLength(10);
    await waitFor(() => expect(titles()).toEqual(["Cloud costs"]));
    expect(screen.getByTestId("results-summary")).toHaveTextContent("1 of 10 loaded match");
  });

  test("sorting reorders by title in both directions", async () => {
    mockFetch(() => Response.json(secondPage));
    renderWithStore(<ResultsPanel responseId="response-1" />, { store: seededStore() });

    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "title-desc");
    expect(titles()[0]).toBe("Insight 10");

    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "title-asc");
    expect(titles()[0]).toBe("Cloud costs");
  });

  test("shows an empty state when nothing matched", () => {
    const store = makeStore();
    store.dispatch(
      promptsApi.util.upsertQueryEntries([
        {
          endpointName: "getInsights",
          arg: "response-1",
          value: { pages: [makePage([])], pageParams: [1] },
        },
      ]),
    );

    renderWithStore(<ResultsPanel responseId="response-1" />, { store });

    expect(screen.getByRole("heading", { name: "No insights found" })).toBeInTheDocument();
  });
});

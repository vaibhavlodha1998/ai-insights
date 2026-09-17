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

function seededStore(pages = [firstPage]) {
  const store = makeStore();
  store.dispatch(
    promptsApi.util.upsertQueryEntries([
      {
        endpointName: "getInsights",
        arg: "response-1",
        value: { pages, pageParams: pages.map((_, index) => index + 1) },
      },
    ]),
  );
  return store;
}

function renderPanel(store = seededStore()) {
  return renderWithStore(<ResultsPanel responseId="response-1" query="AI in healthcare" />, {
    store,
  });
}

function titles() {
  return within(screen.getByRole("list", { name: "Insights" }))
    .getAllByRole("heading")
    .map((heading) => heading.textContent);
}

const summary = () => screen.getByTestId("results-summary");

describe("ResultsPanel", () => {
  test("shows the question and the seeded first page without fetching it again", () => {
    const fetchMock = mockFetch(() => Response.json(secondPage));

    renderPanel();

    expect(screen.getByRole("heading", { level: 1, name: "AI in healthcare" })).toBeVisible();
    expect(titles()).toHaveLength(10);
    expect(summary()).toHaveTextContent("Showing 10 of 12 insights");
    expect(screen.getByText("You’ve seen 10 of 12 insights")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("load more appends the next page, then says everything is loaded", async () => {
    const fetchMock = mockFetch(() => Response.json(secondPage));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(titles()).toHaveLength(12));
    const url = new URL((fetchMock.mock.calls[0][0] as Request).url);
    expect(url.pathname).toBe("/api/prompts/response-1/insights");
    expect(url.searchParams.get("page")).toBe("2");
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(screen.getByText("All 12 insights loaded")).toBeVisible();
  });

  test("a failed load more shows a message and can be retried", async () => {
    const fetchMock = mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load more insights");
    expect(alert).toHaveTextContent("Could not reach the server. Check your connection and try again.");

    fetchMock.mockImplementation(async () => Response.json(secondPage));
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(titles()).toHaveLength(12));
  });

  test("search filters loaded insights after the debounce and highlights matches", async () => {
    mockFetch(() => Response.json(secondPage));
    renderPanel();

    await userEvent.type(screen.getByLabelText("Search"), "cloud");

    // Still unfiltered immediately after typing
    expect(titles()).toHaveLength(10);
    await waitFor(() => expect(titles()).toEqual(["Cloud costs"]));
    expect(summary()).toHaveTextContent("1 of 10 loaded insights match “cloud”");
    expect(screen.getAllByText("Cloud", { selector: "mark" })[0]).toBeVisible();
  });

  test("no matches offers to load more or clear the search", async () => {
    mockFetch(() => Response.json(secondPage));
    renderPanel();

    await userEvent.type(screen.getByLabelText("Search"), "penguins");

    expect(await screen.findByRole("heading", { name: "No insights match “penguins”" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    await waitFor(() => expect(titles()).toHaveLength(10));
    expect(screen.getByLabelText("Search")).toHaveValue("");
  });

  test("sorts by title or content, A–Z or Z–A; order is disabled for relevance", async () => {
    mockFetch(() => Response.json(secondPage));
    renderPanel();
    const zToA = screen.getByRole("radio", { name: "Z–A" });

    expect(zToA).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "title");
    expect(titles()[0]).toBe("Cloud costs");

    await userEvent.click(zToA);
    expect(titles()[0]).toBe("Insight 10");

    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "content");
    await userEvent.click(screen.getByRole("radio", { name: "A–Z" }));
    expect(titles()[0]).toBe("Insight 01");
  });

  test("shows an empty state when nothing matched the question", () => {
    renderPanel(seededStore([makePage([])]));

    expect(screen.getByRole("heading", { name: "No insights found" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
  });
});

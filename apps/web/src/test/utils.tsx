import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { vi } from "vitest";

import type { Insight, InsightsPage } from "@/features/prompts/types";
import { makeStore, type AppStore } from "@/store/store";

export function renderWithStore(
  ui: ReactElement,
  { store = makeStore(), ...options }: { store?: AppStore } & RenderOptions = {},
) {
  return {
    store,
    ...render(ui, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      ...options,
    }),
  };
}

export function makeInsight(index: number, overrides: Partial<Insight> = {}): Insight {
  return {
    id: `insight-${index}`,
    title: `Insight ${String(index).padStart(2, "0")}`,
    content: `Content for insight ${index}`,
    category: "technology",
    source: "Research summary",
    confidence: 0.8,
    tags: ["ai"],
    ...overrides,
  };
}

export function makePage(
  insights: Insight[],
  { page = 1, totalItems = insights.length, pageSize = 10 } = {},
): InsightsPage {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    responseId: "response-1",
    insights,
    pagination: { page, pageSize, totalItems, totalPages, hasNextPage: page < totalPages },
  };
}

type Handler = (request: Request) => Response | Promise<Response>;

/** Replaces global fetch; returns the mock so tests can inspect the requests. */
export function mockFetch(handler: Handler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input instanceof Request ? input : new Request(input, init)),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export async function requestBody(fetchMock: ReturnType<typeof mockFetch>, call = 0) {
  const [input] = fetchMock.mock.calls[call];
  return (input as Request).clone().json();
}

export function errorResponse(status: number, code: string, message: string, details: unknown = null) {
  return Response.json(
    { error: { code, message, request_id: "req-test", details } },
    { status },
  );
}

# web

**AI Insights**: a Next.js 16 client (App Router, React 19, TypeScript, Tailwind CSS 4) for the prompts API. Users submit a prompt and a target language, then answer clarification requests or browse the returned insights with load more, search and sorting. Setup and the root scripts are in the [root README](../../README.md).

> Next.js 16 differs from older versions. Before changing framework code, read the bundled docs in `node_modules/next/dist/docs/` (see [AGENTS.md](AGENTS.md)).

## Stack

| Concern | Choice |
| --- | --- |
| Global state | Redux Toolkit (`combineSlices`, typed hooks) |
| Server data and caching | RTK Query: a mutation for submits, an **infinite query** for result pages |
| Forms and validation | react-hook-form + Zod (`@hookform/resolvers/zod`) |
| Styling | Tailwind CSS 4, light and dark |
| Tests | Vitest + Testing Library, Playwright |

## Layout

The code is split into API logic, state and UI, grouped by feature:

```
src/
  app/
    layout.tsx               <StoreProvider> around the app
    page.tsx                 header + <InsightsWorkspace/>
  store/
    store.ts                 makeStore(): api + promptSession + insightsView
    hooks.ts                 useAppDispatch / useAppSelector
    store-provider.tsx       one store per browser tab
  lib/
    api/base-api.ts          createApi + base query; every endpoint fails with ApiError
    api/errors.ts            ApiError, toApiError, asApiError, fieldErrors
    hooks/use-debounced-value.ts
  features/
    prompts/
      types.ts               wire types (mirror apps/api/app/schemas/prompt.py)
      api.ts                 submitPrompt mutation, getInsights infinite query
      schema.ts              Zod form schema, supported languages
      prompt-session-slice.ts  request/response state, clarification thread, errors
      use-submit-prompt.ts   submit + attach the open contextId
      components/            prompt-form, clarification-notice
    insights/
      filter-sort.ts         pure search and sort functions
      insights-view-slice.ts debounced search term, sort order
      use-visible-insights.ts  loaded pages -> filtered -> sorted, memoized per step
      components/            results-panel, search-input, sort-select, insight-list, insight-card
  components/
    insights-workspace.tsx   composes form, notices, errors and results
    api-error-alert.tsx      structured error display (code, status, request id, field details)
  test/                      setup + render/fetch helpers
e2e/                         Playwright specs (UI flows and API contract through the proxy)
```

## State and data flow

```
PromptForm ──submit──▶ submitPrompt (POST /api/prompts)
                          │
                          ├─ SUCCESS: page 1 is written into getInsights(responseId) cache (synchronously,
                          │           before the mutation resolves) ─▶ promptSession.responseId
                          ├─ NEEDS_CLARIFICATION ─▶ promptSession.contextId + pendingPrompts
                          └─ 4xx/network ─▶ promptSession.error (ApiError) + field errors on the form

ResultsPanel(responseId) ─▶ useGetInsightsInfiniteQuery(responseId)
    "Load more" ─▶ fetchNextPage() ─▶ GET /api/prompts/{responseId}/insights?page=N (appended)
    SearchInput (local state) ─300 ms─▶ insightsView.searchTerm
    SortSelect ─▶ insightsView.sortOrder
    useVisibleInsights: flatten pages ─▶ filter ─▶ sort  (each step in its own useMemo)
```

| State | Lives in | Why |
| --- | --- | --- |
| Last request, status, `contextId`, pending prompts, clarification message, `responseId`, last error | `promptSession` slice | App-wide session state the brief asks to keep globally |
| Insight pages | RTK Query cache (`getInsights`, keyed by `responseId`) | Cached, deduplicated, with loading and error flags |
| Settled search term, sort order | `insightsView` slice | Shared by toolbar and list. Sort persists across results, and search resets on a new one |
| Keystrokes in search, form field values | Component state / react-hook-form | Too frequent for the store |

## Behaviour

- **Form:**
  - Validates `onChange` against the Zod schema: a prompt of 1–2000 characters after trimming, and a language from the list.
  - Submit stays disabled until the form is valid, and while a request is in flight.
  - The short-prompt rule is **not** duplicated client-side: the API decides when to ask for clarification.
- **Success:**
  - Insights render as cards, with a summary: "Showing 10 of 20".
  - "Load more" appears while `hasNextPage` is true.
  - An empty result shows an empty state.
- **NEEDS_CLARIFICATION:**
  - A notice above the form shows the API's message and the prompts sent so far.
  - The form switches to "Add more details". The next submit carries the `contextId`, so the API judges the prompts together.
  - "Start over" drops the thread.
- **Errors:**
  - Every failure becomes an `ApiError` (`status`, `code`, `message`, `requestId`, `details`).
  - Codes that belong to a field (`PROMPT_REQUIRED`, `PROMPT_TOO_LONG`, `LANGUAGE_REQUIRED`, `INVALID_LANGUAGE`) are also set on that field.
  - Everything is shown in a dismissible alert with the code, status, request id and field details.
  - `CONTEXT_NOT_FOUND` clears the stale thread.
  - Network failures show `NETWORK_ERROR`.
- **Search:**
  - Debounced by 300 ms. It matches every word of the term against the title, content, category, source and tags, ignoring case and accents.
  - It covers **loaded** pages, and the UI says so ("1 of 20 loaded match", "Search covers loaded insights only").
- **Sort:** relevance (the API's order), title A–Z / Z–A, content A–Z / Z–A. Comparison uses `Intl.Collator` for the response's language.

## Performance

- **No duplicate page 1 request:** the POST's first page seeds the infinite query cache before `responseId` reaches the UI. Playwright checks that only `page=2` is requested.
- **Typing doesn't re-render the list:**
  - Search keystrokes stay in `SearchInput`'s local state, and only the debounced value is dispatched.
  - The prompt counter subscribes on its own via `useWatch`, so typing re-renders only the counter.
- **Memoized steps:** flattening pages, filtering and sorting are separate `useMemo`s. A new search term doesn't re-flatten, and a new page doesn't rebuild the collator.
- **Normalized text is computed once:** `filterInsights` caches each insight's normalized search text in a `WeakMap`.
- **Loaded cards don't re-render:** `InsightList` and `InsightCard` are `memo`ized, and RTK Query keeps object identity for loaded insights. Loading page 2 renders only the new cards.
- **Relevance order skips sorting:** `sortInsights` returns the same array for relevance, so memoized children see no change.

## Scripts

Run from the repo root with `yarn workspace web <script>`, or use the root aliases:

| Script | Root alias | What it does |
| --- | --- | --- |
| `dev` | `yarn dev:web` | Dev server on http://localhost:3000 |
| `build` | `yarn build:web` | Production build (`.next/standalone`) |
| `start` | | Serve the production build. Next warns that `next start` doesn't support `output: standalone`, but it serves the build fine for local checks and CI. Docker runs the standalone server |
| `lint` | `yarn lint:web` | ESLint |
| `typecheck` | `yarn lint:web` | `next typegen` then `tsc --noEmit` |
| `test` | `yarn test:web` | Vitest, run once |
| `test:watch` | | Vitest in watch mode |
| `test:e2e` | `yarn test:e2e` | Playwright |

## Testing

**Unit and component tests (Vitest):** 47 tests, in `*.test.ts(x)` files next to the code.

| File | Covers |
| --- | --- |
| `features/prompts/schema.test.ts` | Form validation rules |
| `features/prompts/prompt-session.test.ts` | Real store + mocked fetch: success seeds the page cache, clarification thread and follow-up `contextId`, structured errors, expired context, reset |
| `features/insights/filter-sort.test.ts` | Search fields, accents, multi-word matching, both sort fields in both directions, no mutation |
| `features/insights/components/results-panel.test.tsx` | No refetch of page 1, load more appends page 2, debounced search, sorting, empty state |
| `components/insights-workspace.test.tsx` | Disabled submit, trimmed submit, clarification flow, start over, field errors, dismissible alert, network error |
| `lib/api/errors.test.ts`, `lib/hooks/use-debounced-value.test.ts` | Error normalization, debounce timing |

`src/test/utils.tsx` has `renderWithStore`, `mockFetch`, `makeInsight`/`makePage` and `errorResponse`.

**End-to-end tests (Playwright)** run against the real API, database and seed data:
- **`e2e/insights.spec.ts`:** disabled submit; results → load more (only `page=2` requested) → search → sort both ways; clarification then follow-up; Spanish results; an `INVALID_LANGUAGE` error shown in the UI (the request is rewritten, since the form can't send an unsupported language).
- **`e2e/api.spec.ts`:** the proxy, validation codes and messages, clarification, and page 2 by `responseId`.

```bash
yarn infra:up && yarn db:migrate                     # from the repo root
yarn workspace web playwright install chromium       # once
yarn test:e2e
```

- **Servers:** Playwright starts `yarn start:api` (:8000) and `yarn dev:web` (:3000), or reuses them if they're already running.
- **CI:** Playwright always starts fresh servers and runs `next start` against a production build, so run `yarn build:web` first when you set `CI=1` locally.

## Environment

- **Where variables come from:** the **repo-root** `.env`, loaded in `next.config.ts`. Env files inside `apps/web` are not loaded.
- **`API_URL`:** the only variable used. It is the target of the `/api/*` rewrite, and the browser calls same-origin `/api/...`, so no CORS is involved.
- **Build time:** the rewrite target is resolved at build time. The Dockerfile takes `API_URL` as a build argument (Compose passes `http://api:8000`).

## Docker

```bash
docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:8000 .
```

The build context is the repo root, so the Yarn workspace lockfile is included. The image runs `node apps/web/server.js` from the standalone output as the `node` user on port 3000. `yarn app:up` builds and runs it alongside the API.

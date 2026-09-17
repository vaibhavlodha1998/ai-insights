# web

**AI Insights**: a Next.js 16 client (App Router, React 19, TypeScript, Tailwind CSS 4) for the prompts API. Users ask a question in a supported language, answer a follow-up when the question is too vague, and browse the insights with load more, search and sorting. Setup and the root scripts are in the [root README](../../README.md).

The UI follows the **AI Insights UI** design (Fraunces for headings, IBM Plex Sans and Mono, deep-teal accent on a warm paper background). Every design value lives in one place as Tailwind theme tokens in `src/app/globals.css`.

> Next.js 16 differs from older versions. Before changing framework code, read the bundled docs in `node_modules/next/dist/docs/` (see [AGENTS.md](AGENTS.md)).

## Pages

| Route | What it is |
| --- | --- |
| `/` | The product: ask a question, answer a follow-up, browse, search and sort insights |
| `/state` | **Session state**: a read-only view of the global store (the last request, its response, clarification thread, results view, last error with its code and request ID, and the raw store). Technical details appear only here, never on `/` |

The store lives in the root layout, so it survives navigating between the two pages. A full reload resets it.

## Stack

| Concern | Choice |
| --- | --- |
| Global state | Redux Toolkit (`combineSlices`, typed hooks) |
| Server data and caching | RTK Query: a mutation for submits, an **infinite query** for result pages |
| Forms and validation | react-hook-form + Zod (`@hookform/resolvers/zod`) |
| UI | An in-repo component library (`src/components/ui`) on Tailwind CSS 4 theme tokens |
| Tests | Vitest + Testing Library, Playwright |

## Layout

```
src/
  app/
    globals.css              design tokens (@theme): colours, fonts, animation
    layout.tsx               fonts, <StoreProvider>, <AppHeader>
    page.tsx                 "/" -> <InsightsWorkspace/>
    state/page.tsx           "/state" -> <SessionStateView/>
  components/
    ui/                      reusable, app-agnostic components (see below); import from "@/components/ui"
    layout/app-header.tsx    logo and navigation
    insights-workspace.tsx   composes the "/" page from both features
  features/
    prompts/                 asking questions
      api.ts                 submitPrompt mutation, getInsights infinite query
      schema.ts              Zod form schema, supported languages
      prompt-session-slice.ts  request/response state, clarification thread, drafts, errors
      errors.ts              API error code -> form field, and the sentence a user sees
      suggestions.ts         starter questions and follow-up ideas
      use-submit-prompt.ts   submit (attaches the open contextId) and retry
      components/            prompt-form, welcome, clarification-notice, clarification-help, submit-error
    insights/                browsing results
      filter-sort.ts         pure search, sort and highlight functions
      insights-view-slice.ts debounced search term, sort field, sort direction
      use-visible-insights.ts  loaded pages -> filtered -> sorted, memoized per step
      components/            results-panel, results-heading, results-skeleton, results-footer,
                             search-input, sort-controls, insight-list, insight-card, highlight
    session-state/           the "/state" page
      use-session-snapshot.ts  reads the store and the pages cache without fetching
      components/session-state-view.tsx
  lib/
    api/base-api.ts          createApi + base query; every endpoint fails with ApiError
    api/errors.ts            ApiError, toApiError, asApiError, fieldErrors
    hooks/use-debounced-value.ts
    cn.ts                    class name joiner
  store/                     makeStore, typed hooks, StoreProvider
  test/                      setup + render/fetch helpers
e2e/                         Playwright specs (UI flows, session state page, API contract through the proxy)
```

## Component library (`src/components/ui`)

These components hold no app state and import nothing from `features/`, so they can move to a shared package unchanged. They are styled only with the theme tokens.

| Component | Purpose |
| --- | --- |
| `Button` | `primary` / `secondary` / `ghost` / `danger` / `link` variants, `md` / `lg`, `loading` + `loadingText`, trailing `icon`, `fullWidth`. Defaults to `type="button"` |
| `Field` + `fieldA11yProps(id, error)` | Label, control, error message (with `role="alert"`) and an `aside` slot (e.g. a counter). The helper sets `id`, `aria-invalid` and `aria-describedby` |
| `Textarea`, `Select` | Form controls sharing `controlClass` (focus, invalid, disabled states). `Select` takes `options` and an optional `placeholder` |
| `SearchField` | Search input with an icon and a "Clear" button once it has text |
| `SegmentedControl` | Radio group styled as joined buttons (`fieldset` + `legend`), with a disabled state |
| `Alert` | `warning` (`role="status"`) or `danger` (`role="alert"`) message with title, body and actions. `size="lg"` for page-level messages |
| `Card`, `Badge`, `Chip` | Surfaces and small labels. `Card` renders as any of `div`, `section`, `article`, `form`, `aside` |
| `EmptyState`, `ProgressBar`, `Skeleton`, `Spinner` | Feedback and loading states |
| `DescriptionList` | Label/value rows, with a dash for empty values |
| Icons | Stroke SVG icons in `currentColor`, hidden from screen readers |

## State and data flow

```
PromptForm ──submit──▶ submitPrompt (POST /api/prompts)
                          │
                          ├─ SUCCESS: page 1 is written into the getInsights(responseId) cache (synchronously,
                          │           before the mutation resolves) ─▶ promptSession.responseId + resultsFor
                          ├─ NEEDS_CLARIFICATION ─▶ promptSession.contextId + pendingPrompts
                          └─ 4xx/5xx/network ─▶ promptSession.error (ApiError); field codes also go onto the form

Welcome / ClarificationHelp ──pick──▶ promptSession.draft ─▶ PromptForm fills itself

ResultsPanel(responseId) ─▶ useGetInsightsInfiniteQuery(responseId)
    "Load more" ─▶ fetchNextPage() ─▶ GET /api/prompts/{responseId}/insights?page=N (appended)
    SearchInput (local state) ─300 ms─▶ insightsView.searchTerm
    SortControls ─▶ insightsView.sortField + sortDirection
    useVisibleInsights: flatten pages ─▶ filter ─▶ sort  (each step in its own useMemo)
```

| State | Lives in | Why |
| --- | --- | --- |
| Last request, status, `contextId`, pending prompts, clarification message, `responseId`, `resultsFor`, last error, suggestion draft | `promptSession` slice | App-wide session state, shown on `/state` |
| Insight pages | RTK Query cache (`getInsights`, keyed by `responseId`) | Cached, deduplicated, with loading and error flags |
| Settled search term, sort field and direction | `insightsView` slice | Shared by toolbar, list and `/state`. Sort persists across results, and search resets on a new one |
| Keystrokes in search, form field values | Component state / react-hook-form | Too frequent for the store |

## What the user sees

- **Start:**
  - "What would you like to know?" with four suggested questions. Picking one fills the prompt and the language.
  - Submit stays disabled until the Zod schema passes.
- **Validation** (react-hook-form `mode: "all"`, so messages appear once a field is changed or left, never before):
  - "Enter a prompt"
  - "Prompt must be at most 2000 characters" (the counter turns red too)
  - "Choose a target language"
  - The short-prompt rule is **not** duplicated client-side: the API decides when to ask for more details.
- **Loading:** the button reads "Getting insights…", the fields lock, and skeleton cards appear under "Results for …".
- **Needs more details:**
  - An amber notice above the form shows the API's message, what was asked so far and "Start over".
  - The form becomes "Add more details" / "Send details".
  - Idea chips ("in healthcare", …) fill the field. The next submit carries the `contextId`, and the results heading shows the combined question.
- **Results:**
  - Insight cards show category, a confidence bar, title, content, source and tags.
  - "Showing 10 of 20 insights" appears above the list. Below it are a progress bar, "You’ve seen 10 of 20 insights" and **Load more**, or "All 20 insights loaded" once everything is in.
- **Search:**
  - Debounced by 300 ms. It matches every word of the term against the title, content, category, source and tags, ignoring case and accents.
  - Matches are highlighted.
  - The summary line reads "2 of 20 insights match “security”", or "… of 10 loaded insights …" while more pages exist.
  - When nothing matches, the empty state offers Load more and Clear search.
- **Sort:** Relevance (the API's order), Title or Content, with an A–Z / Z–A toggle that is disabled for Relevance. Comparison uses `Intl.Collator` for the question's language.
- **Errors** (plain sentences only, no codes on `/`):

| Situation | Where | Message |
| --- | --- | --- |
| API rejects a field (`PROMPT_REQUIRED`, `PROMPT_TOO_LONG`, `LANGUAGE_REQUIRED`, `INVALID_LANGUAGE`) | Under that field | The API's message, e.g. "Target language is not supported" |
| Server unreachable | "We couldn’t get your insights" alert with **Try again** | "Could not reach the server. Check your connection and try again." |
| Server error (5xx, unexpected response) | Same alert | "Something went wrong on our side. Please try again." |
| Conversation expired (`CONTEXT_NOT_FOUND`) | Same alert, no retry; the thread is cleared | "This conversation has expired. Ask your full question again." |
| Load more fails | "Could not load more insights" alert with **Try again**, under the list | The same messages |

## Performance

- **No duplicate page 1 request:** the POST's first page seeds the infinite query cache before `responseId` reaches the UI. Playwright checks that only `page=2` is requested.
- **Typing doesn't re-render the list:**
  - Search keystrokes stay in `SearchInput`'s local state, and only the debounced value is dispatched.
  - The prompt counter subscribes on its own via `useWatch`, so typing re-renders only the counter.
- **Memoized steps:** flattening pages, building the collator, parsing search words, filtering and sorting are separate `useMemo`s.
- **Normalized text is computed once:** `filterInsights` caches each insight's normalized search text in a `WeakMap`.
- **Loaded cards don't re-render:** `InsightList`, `InsightCard` and `Highlight` are `memo`ized, and RTK Query keeps object identity for loaded insights. Loading a page renders only the new cards.
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

**Unit and component tests (Vitest):** 77 tests, in `*.test.ts(x)` files next to the code.

| File | Covers |
| --- | --- |
| `components/ui/ui.test.tsx` | Button loading and default type, Field accessibility wiring, SegmentedControl, SearchField clear, Alert roles, DescriptionList |
| `components/insights-workspace.test.tsx` | Suggestions fill the form, validation messages and disabled submit, loading then results, clarification flow with idea chips, start over, field errors without codes, retry after a network failure, server and expired-conversation messages |
| `features/insights/components/results-panel.test.tsx` | No refetch of page 1, load more then "all loaded", load more failure and retry, debounced search with highlights, no-match actions, sort field and direction, empty result |
| `features/insights/filter-sort.test.ts` | Search fields, accents, multi-word matching, sort by field and direction, highlight segments |
| `features/prompts/prompt-session.test.ts` | Real store + mocked fetch: cache seeding, `resultsFor`, clarification thread, errors, expired context, drafts, reset |
| `features/prompts/errors.test.ts`, `schema.test.ts` | User-facing messages per error code, form schema |
| `features/session-state/components/session-state-view.test.tsx` | Empty state, request/response/view values, error details |
| `lib/api/errors.test.ts`, `lib/hooks/use-debounced-value.test.ts` | Error normalization, debounce timing |

`src/test/utils.tsx` has `renderWithStore`, `mockFetch`, `makeInsight`/`makePage` and `errorResponse`.

**End-to-end tests (Playwright)** run against the real API, database and seed data:
- **`e2e/insights.spec.ts`:** validation and disabled submit; a suggestion; results → load more (only `page=2` requested) → search with highlight → clear → sort by title in both directions; clarification with an idea chip; a server field error shown in plain words; retry after the server is unreachable; the session state page after client-side navigation.
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

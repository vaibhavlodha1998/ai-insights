# AI Insights: design

A UI client plus a middleware (BFF) API for an AI service. Users submit a prompt and a target language. The API validates it, decides whether the "AI" should be called at all, and returns paginated insights or asks for clarification. No real LLM is called: insights come from seeded Postgres data.

Built on the starter (FastAPI + Postgres, Next.js + TypeScript) on the `ai-insights` branch.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Frontend | Next.js + TypeScript, Redux Toolkit + RTK Query, Zod + react-hook-form | Reuses the starter. RTK Query is required by the brief |
| AI framework | None: an `InsightProvider` interface with a DB-backed dummy implementation | No LLM calls, and a linear flow with nothing to orchestrate |
| Error body | Starter's nested shape with UPPER_SNAKE codes and the brief's messages | One consistent error contract across the API |
| Pagination | Backend pages (size 10). Frontend "Load more" appends pages. Search and sort run over the loaded pages | Meets both "BE pagination > 10" and "client-side search/sort", with no re-run of the AI per page |
| Storage | Postgres: `insights` (seeded by migration), `conversations`, `prompt_responses` | Stable pages, conversation tracking, uses the starter's migrations and test fixtures |
| Clarification | Response carries `contextId`. The follow-up submit sends it, and the backend evaluates the combined prompts | Gives `contextId` a real purpose |

## API

### `POST /prompts`

Request: `{ "prompt": string, "targetLanguage": string, "contextId"?: uuid }`

Checks, stopping at the first failure:

| # | Check | Result |
| --- | --- | --- |
| 1 | Body is not valid JSON | 400 `INVALID_JSON` |
| 2 | Body is not a JSON object | 422 `INVALID_BODY` |
| 3 | `prompt` missing, not a string, empty or whitespace | 422 `PROMPT_REQUIRED` "Prompt is required" |
| 4 | `prompt` > 2000 chars | 422 `PROMPT_TOO_LONG` |
| 5 | `targetLanguage` missing or empty | 422 `LANGUAGE_REQUIRED` |
| 6 | `targetLanguage` not in `en, es, fr, de` (exact match) | 422 `INVALID_LANGUAGE` "Target language is not supported" |
| 7 | `contextId` not a UUID | 422 `INVALID_CONTEXT_ID` |
| 8 | Unknown fields | 422 `VALIDATION_ERROR` |
| 9 | `contextId` does not exist | 404 `CONTEXT_NOT_FOUND` |
| 10 | Clarification check, before any provider call | 200 `NEEDS_CLARIFICATION` |
| 11 | Provider returns matching insight ids | 200 `SUCCESS`, page 1 |

Error body: `{"error": {"code", "message", "request_id", "details"}}`.

**Clarification check.** It runs on the text of the pending turns, meaning this conversation's prompts since its last `SUCCESS`, plus the new prompt. Clarification is needed when:
- the combined text is under 5 characters;
- or it has fewer than 2 meaningful words, after removing stopwords and vague words in en/es/fr/de such as "help", "more" and "explain". This also covers vague phrases like "tell me more".

Clarification response: `{"status": "NEEDS_CLARIFICATION", "message": "Please provide more details", "contextId"}`. Every response returns a `contextId`, and a new conversation is created when none is sent.

**Success response:** `{"status": "SUCCESS", "responseId", "contextId", "insights": Insight[], "pagination": {"page", "pageSize", "totalItems", "totalPages", "hasNextPage"}}`. `pagination` is always present.

`Insight`: `{ id, title, content, category, source, confidence, tags }`.

### `GET /prompts/{responseId}/insights?page=N`

Returns a page of the stored result in the stored order. Errors: 404 `RESPONSE_NOT_FOUND`, 422 `INVALID_PAGE` (not a positive integer, or beyond the last page).

### Dummy provider

`DummyInsightProvider.find_insight_ids(session, text, language)`:
1. Takes the meaningful words of the text: lowercased, accents stripped, filler words dropped.
2. Keeps insights in that language whose `keywords` (multilingual topic keywords plus tags) match at least one of those words.
3. Ranks them by keyword hits plus words shared with the insight's own title and content, then by title. The second score keeps non-English rankings meaningful.

Seed data: 36 insights per language across technology (12), health (8), finance (6), climate (5) and travel (5).

## Frontend

```
src/
  app/            layout (StoreProvider), page -> <InsightsWorkspace/>
  store/          makeStore, typed hooks, StoreProvider
  lib/api/        base RTK Query api, API error parsing
  lib/hooks/      useDebouncedValue
  features/prompts/    api endpoints, zod schema, session slice, form + clarification notice
  features/insights/   view slice (search, sort), filter/sort utils, results components
  components/     ui/ (reusable component library on theme tokens), layout/, InsightsWorkspace
  features/session-state/  the /state page: a read-only view of the global store
```

- **Global state:**
  - The `promptSession` slice holds the last request, the response status, `contextId`, the pending clarification turns, `responseId` and the last error.
  - The `insightsView` slice holds the debounced search term and the sort order.
  - The RTK Query cache holds the response data.
- **API:**
  - The `submitPrompt` mutation runs `POST /api/prompts` through the Next rewrite.
  - The `getInsights` **infinite query** is keyed by `responseId`, with `pageParam` = page and the next page taken from `pagination.hasNextPage`.
  - Page 1 from the POST is written into that cache with `upsertQueryEntries` inside the mutation's `queryFn`, which is synchronous and runs before the mutation resolves. Seeding in `onQueryStarted` would run after `responseId` reached the UI, letting the results view request page 1 again.
- **Form:**
  - `mode: "all"` (messages once a field is changed or left), and submit is disabled until the Zod schema passes (prompt 1–2000 chars trimmed, language from the enum).
  - The 5-character rule is deliberately **not** enforced client-side: that decision belongs to the backend.
  - 4xx field codes are mapped onto form fields. Everything else goes to an alert in plain words (no codes or request IDs on the product page; those appear on `/state`).
- **Clarification:** a notice above the form shows the message and the pending turns. The next submit sends `contextId`, and "Start over" clears it.
- **Performance:**
  - The search input keeps local state, and only the debounced value (300 ms) reaches the store.
  - Flattening pages, filtering and sorting are separate `useMemo` steps.
  - `InsightCard` is `memo`ized, so appending a page renders only the new cards.
  - Callbacks are stable, and a memoized `Intl.Collator` is created per language.
- **Search:** case- and accent-insensitive match on title, content, category, source and tags.
- **Sort:** relevance (backend order), or title/content with an A–Z / Z–A toggle.

## Testing

- **API:**
  - Unit tests for the clarification rules and error codes.
  - Route tests against the real, migrated test database: every validation code, the clarification → follow-up flow, success, pagination and 404s.
- **Web (Vitest):**
  - Zod schema, filter and sort, debounce hook, slice reducers, API error parsing.
  - Form: submit disabled until valid.
  - Results: search and sort render.
- **E2E (Playwright):** submit → results → load more → search → sort; clarification → follow-up → results; API validation errors.

# api

FastAPI service using async SQLAlchemy (psycopg 3), Redis and Alembic. Dependencies are managed with Poetry. Setup, env vars and the root scripts are in the [root README](../../README.md).

## Layout

```
app/
  main.py            configure_logging(), create_app(): error handlers, middleware, routers, lifespan
  core/
    config.py        Settings, read from the repo-root .env (then apps/api/.env, then real env vars)
    errors.py        AppError / NotFoundError / ConflictError and the exception handlers
    languages.py     supported target languages (en, es, fr, de)
    logging.py       logging setup: text or JSON output, request id on every log record
    middleware.py    RequestContextMiddleware: X-Request-ID and one log line per request
    redis.py         create_redis() and the get_redis dependency
    loop.py          selector event loop for Windows (dev server and tests)
  db/
    base.py          DeclarativeBase with constraint naming conventions
    session.py       create_engine(), create_session_factory() and the get_session dependency
  models/            Insight, Conversation, PromptResponse; import each model in __init__.py
  routers/           HTTP layer: health.py, prompts.py
  schemas/           Pydantic models; camelCase on the wire via base.CamelModel
  services/
    prompts.py           submit flow, conversation context, pagination
    clarification.py     "is this prompt specific enough?" rules, no I/O
    insight_provider.py  InsightProvider interface + DummyInsightProvider (the fake AI)
    text.py              normalize/tokenize (lowercase, accent-free)
alembic/             migration environment; migrations in versions/, seed data in seed/
tests/
  conftest.py        app, client, test_database, db_session and db_client fixtures
  core/ routers/ services/   mirror app/ (routers/test_prompts.py uses the seeded test DB)
  db/                tests against the real test database
```

## Endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | `200 {"status": "ok", "version": "0.1.0"}`. Touches no dependencies |
| GET | `/health/ready` | `200` or `503` with `{"status": "ok" \| "unavailable", "checks": {"database": ..., "redis": ...}}` |
| POST | `/prompts` | `200` `SUCCESS` (first page of insights) or `NEEDS_CLARIFICATION`; 4xx structured errors. See [Prompts and insights](#prompts-and-insights) |
| GET | `/prompts/{responseId}/insights?page=N` | `200` one page of a stored `SUCCESS` result; 404 `RESPONSE_NOT_FOUND`, 422 `INVALID_PAGE` |

Interactive docs: http://localhost:8000/docs

## How the pieces connect

- **Clients are per app instance.** The lifespan in `main.py` creates the engine, the session factory and the Redis client, stores them on `app.state`, and closes them on shutdown. Dependencies read them from `request.app.state`, so each `create_app()` (including each test client) gets its own clients.
- **Sessions:** use `session: Annotated[AsyncSession, Depends(get_session)]` in a route. The session closes after the request. Commit explicitly when you write.
- **Redis:** use `redis: Annotated[Redis, Depends(get_redis)]`.
- **Settings:** `from app.core.config import settings`. `settings.DATABASE_URL` (a SQLAlchemy `URL`) and `settings.REDIS_URL` are built from the `POSTGRES_*` and `REDIS_*` variables.

## Errors

Every error response the API generates has this shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Widget 42 does not exist",
    "request_id": "3f2b0c1e9a8d4f6b8c7d5e4f3a2b1c0d",
    "details": null
  }
}
```

| Source | Status | `code` | `details` |
| --- | --- | --- | --- |
| `raise NotFoundError("...")` / `ConflictError("...")` | 404 / 409 | `NOT_FOUND` / `CONFLICT`, or the subclass's own code | whatever you pass as `details=` |
| `raise AppError("...")` | 400 | `BAD_REQUEST` | whatever you pass as `details=` |
| `raise HTTPException(403, "...")`, unknown routes, wrong methods | from the exception | from the status (`FORBIDDEN`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`) | non-string `detail`, if any |
| Malformed JSON body | 400 | `INVALID_JSON` | Pydantic's error list |
| A schema raises `PydanticCustomError("SOME_CODE", "message")` | 422 | `SOME_CODE` (e.g. `PROMPT_REQUIRED`) | Pydantic's error list (`loc`, `msg`, `type`, `ctx`) |
| Any other invalid path, query or body | 422 | `VALIDATION_ERROR` | Pydantic's error list |
| Any other exception | 500 | `INTERNAL_ERROR` | none. The message is generic and the traceback only goes to the logs |

Codes are always UPPER_SNAKE. Validation details never echo the submitted `input` back.

Raise `AppError` subclasses from services for expected failures, since they don't depend on FastAPI. Add your own subclass by setting `status_code` and `code`:

```python
class PaymentRequiredError(AppError):
    status_code = 402
    code = "PAYMENT_REQUIRED"
```

`/health/ready` returning 503 isn't an error in this sense: it's a normal readiness report.

## Prompts and insights

A middleware between a client and an "AI" service. No LLM is called: `DummyInsightProvider` answers from insights seeded into Postgres.

### `POST /prompts`

```json
{ "prompt": "How is AI changing healthcare?", "targetLanguage": "en", "contextId": "optional uuid" }
```

Validation runs in this order, and the first failure decides the response:

| Check | Status | `code` | `message` |
| --- | --- | --- | --- |
| Body is not valid JSON | 400 | `INVALID_JSON` | Request body is not valid JSON |
| Body is not a JSON object | 422 | `INVALID_BODY` | Request body must be a JSON object |
| `prompt` missing, not a string, empty or only whitespace | 422 | `PROMPT_REQUIRED` | Prompt is required |
| `prompt` longer than 2000 characters (after trimming) | 422 | `PROMPT_TOO_LONG` | Prompt must be at most 2000 characters |
| `targetLanguage` missing or empty | 422 | `LANGUAGE_REQUIRED` | Target language is required |
| `targetLanguage` not exactly `en`, `es`, `fr` or `de` | 422 | `INVALID_LANGUAGE` | Target language is not supported |
| `contextId` not a UUID | 422 | `INVALID_CONTEXT_ID` | Context id must be a valid UUID |
| Any other field | 422 | `VALIDATION_ERROR` | Request validation failed |
| `contextId` doesn't exist | 404 | `CONTEXT_NOT_FOUND` | Context not found |

A valid request then goes through the **clarification check** ([`services/clarification.py`](app/services/clarification.py)) **before** the provider is called. It looks at the conversation's *pending* prompts (those after its last success) plus the new one, and asks for clarification when the combined text:
- is shorter than 5 characters;
- or has fewer than 2 meaningful words, ignoring accents, case, numbers, and filler or vague words in en/es/fr/de ("the", "help", "tell me more", "dime", "explique"...).

```json
{ "status": "NEEDS_CLARIFICATION", "message": "Please provide more details", "contextId": "..." }
```

Send that `contextId` with the next prompt and the two are judged together: `"AI"`, then `"in healthcare"`, succeeds as `"AI in healthcare"`. Every response includes a `contextId`, and a new conversation starts when none is sent. After a success, the same `contextId` starts a fresh pending thread.

Otherwise the provider returns the matching insight ids, best first. They are stored on a `PromptResponse` row, and the first page is returned:

```json
{
  "status": "SUCCESS",
  "responseId": "...",
  "contextId": "...",
  "insights": [{ "id", "title", "content", "category", "source", "confidence", "tags" }],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 20, "totalPages": 2, "hasNextPage": true }
}
```

`pagination` is always present. Results with 10 or fewer items are simply one page. No matches is an empty `SUCCESS`.

### `GET /prompts/{responseId}/insights?page=N`

Serves later pages by slicing the stored id list, so every page comes from the same ranked result and the provider isn't called again. `page` must be a positive integer within `totalPages` (`INVALID_PAGE` otherwise). An unknown `responseId`, or one that was a clarification, returns `RESPONSE_NOT_FOUND`.

### The dummy provider and its data

- **Data:** the `create_insights_and_conversations` migration seeds [`alembic/seed/insights_v1.json`](alembic/seed/insights_v1.json): 36 insights (technology 12, health 8, finance 6, climate 5, travel 5), each written in en, es, fr and de. Ids are stable (uuid5 of key + language). The content is illustrative sample text, not real research.
- **Matching:** an insight matches when a meaningful prompt word equals one of its `keywords` (multilingual topic words plus its tags), or starts with a keyword of 4+ characters ("healthcare" matches "health").
- **Ranking:** matches are ordered by keyword hits plus prompt words found in the insight's own title and content, then by title. For example, "How is AI changing healthcare?" returns 20 insights in 2 pages, led by "AI-assisted diagnostics are moving into clinics".
- **Swapping in a real LLM:** implement `InsightProvider.find_insight_ids` and return it from `get_insight_provider()`. Routes, validation, clarification and pagination stay as they are.

Try it:

```bash
curl -X POST localhost:8000/prompts -H "Content-Type: application/json" \
  -d '{"prompt": "How is AI changing healthcare?", "targetLanguage": "en"}'
```

## Logging and request IDs

- `configure_logging()` runs once when `app.main` is imported. Uvicorn's own logs go through the same handler, so everything shares one format.
- `RequestContextMiddleware` reuses an incoming `X-Request-ID` if it's 1–128 characters from `[A-Za-z0-9._-]`, and generates one otherwise. It returns the id in the `X-Request-ID` response header (exposed to browsers through CORS), includes it in every log record, and adds it to error bodies. It logs one `app.request` line per request, with method, path, status and duration. Uvicorn's access log is turned off to avoid duplicates.
- Log from your own code with `logging.getLogger(__name__)`. Fields passed as `extra={...}` become top-level keys in JSON output.

Text output (`LOG_FORMAT=text`):

```
2026-09-17 10:50:27,061 INFO     app.request [live-8002] GET /health/ready 200 61.8ms
```

JSON output (`LOG_FORMAT=json`):

```json
{"timestamp": "2026-09-17T05:20:26.887727+00:00", "level": "INFO", "logger": "app.request", "message": "GET /health/ready 200 83.2ms", "request_id": "live-8001", "method": "GET", "path": "/health/ready", "status_code": 200, "duration_ms": 83.2}
```

## Adding an endpoint

1. Add the schema in `app/schemas/<feature>.py`.
2. Add the logic in `app/services/<feature>.py`. Take sessions and clients as arguments, and raise `AppError` subclasses for expected failures.
3. Add the router in `app/routers/<feature>.py` and register it in `create_app()` with `app.include_router(...)`.
4. Add tests (see below).

## Migrations

See [Database migrations](../../README.md#database-migrations). You can also run Alembic directly from this folder:

```bash
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "message"
poetry run alembic downgrade -1
poetry run alembic check      # fails if the models have changes with no migration
```

`env.py` runs psycopg synchronously, so migrations don't need an event loop on any platform. If a caller passes a connection in `config.attributes["connection"]`, Alembic migrates over that connection. The test fixtures use this to migrate the test database.

## Tests and lint

```bash
poetry run pytest                                   # or: yarn test:api
poetry run ruff check app tests alembic            # yarn lint:api runs all three
poetry run ruff format --check app tests alembic
poetry run mypy app tests alembic
```

Fixtures in `tests/conftest.py`:

| Fixture | Gives you | Use for |
| --- | --- | --- |
| `app` | A fresh `create_app()` | Adding test-only routes or `dependency_overrides` |
| `client` | Sync `TestClient` (runs the lifespan) | Route tests that stub services with `monkeypatch`, like `tests/routers/test_health.py` |
| `test_database` | URL of a freshly recreated and migrated `<POSTGRES_DB>_test` database (once per run) | Rarely used directly |
| `db_session` | `AsyncSession` inside a transaction that is rolled back after the test | Service and model tests against real Postgres |
| `db_client` | Async `httpx2` client whose requests use `db_session` and an in-memory Redis | Route tests against real Postgres |

Database tests are async, so mark them with `pytest.mark.anyio`:

```python
import pytest
from httpx2 import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.anyio


async def test_service_writes(
    db_session: AsyncSession,
) -> (
    None
): ...  # calling db_session.commit() is fine; everything is rolled back afterwards


async def test_route_reads(db_client: AsyncClient) -> None:
    response = await db_client.get("/health/ready")
```

- Use `db_client`, not `client`, when a route touches the database. `TestClient` runs the app on its own event loop, which can't share `db_session`'s connection.
- If Postgres isn't reachable, tests that use the database fixtures are **skipped** after a short connection timeout (3 s per address tried), and everything else still runs. Set `TEST_DATABASE_REQUIRED=1` (CI does) to make that a failure.
- `tests/db/test_database.py` checks that the fixtures themselves isolate tests.

## Docker

`Dockerfile` builds a slim Python 3.12 image that runs as a non-root user: `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Compose reuses the same image for the one-off `migrate` service. See [Running everything in Docker](../../README.md#running-everything-in-docker).

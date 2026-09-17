# api

FastAPI service using async SQLAlchemy (psycopg 3), Redis and Alembic. Dependencies are managed with Poetry. Setup, env vars and the root scripts are in the [root README](../../README.md).

## Layout

```
app/
  main.py            create_app(): CORS, routers, lifespan (creates and closes the DB engine and Redis client)
  core/
    config.py        Settings, read from the repo-root .env (then apps/api/.env, then real env vars)
    redis.py         create_redis() and the get_redis dependency
    loop.py          selector event loop for Windows dev
  db/
    base.py          DeclarativeBase with constraint naming conventions
    session.py       create_engine(), create_session_factory() and the get_session dependency
  models/            SQLAlchemy models; import each one in __init__.py so Alembic sees it
  routers/           HTTP layer: parses requests and sets status codes
  schemas/           Pydantic request and response models
  services/          business logic, kept free of FastAPI so it's easy to unit test
alembic/             migration environment; migrations go in versions/
tests/               mirrors app/ (core/, routers/, services/)
```

## Endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | `200 {"status": "ok", "version": "0.1.0"}`. Touches no dependencies |
| GET | `/health/ready` | `200` or `503` with `{"status": "ok" \| "unavailable", "checks": {"database": ..., "redis": ...}}` |

Interactive docs: http://localhost:8000/docs

## How the pieces connect

- **Clients are per app instance.** The lifespan in `main.py` creates the engine, the session factory and the Redis client, stores them on `app.state`, and closes them on shutdown. Dependencies read them from `request.app.state`, so each `create_app()` (including each test client) gets its own clients.
- **Sessions:** use `session: Annotated[AsyncSession, Depends(get_session)]` in a route. The session closes after the request. Commit explicitly when you write.
- **Redis:** use `redis: Annotated[Redis, Depends(get_redis)]`.
- **Settings:** `from app.core.config import settings`. `settings.DATABASE_URL` (a SQLAlchemy `URL`) and `settings.REDIS_URL` are built from the `POSTGRES_*` and `REDIS_*` variables.

## Adding an endpoint

1. Add the schema in `app/schemas/<feature>.py`.
2. Add the logic in `app/services/<feature>.py`. Take sessions and clients as arguments.
3. Add the router in `app/routers/<feature>.py` and register it in `create_app()` with `app.include_router(...)`.
4. Add tests: unit tests for the service in `tests/services/`, and route tests in `tests/routers/` that stub the service with `monkeypatch`, as `tests/routers/test_health.py` does.

## Migrations

See [Database migrations](../../README.md#database-migrations). You can also run Alembic directly from this folder:

```bash
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "message"
poetry run alembic downgrade -1
poetry run alembic check      # fails if the models have changes with no migration
```

`env.py` runs psycopg synchronously, so migrations don't need an event loop on any platform.

## Tests and lint

```bash
poetry run pytest                                   # or: yarn test:api
poetry run ruff check app tests alembic            # yarn lint:api runs all three
poetry run ruff format --check app tests alembic
poetry run mypy app tests alembic
```

Tests don't need Docker. The `client` fixture in `tests/conftest.py` builds a fresh app with `TestClient`, and datastore checks are stubbed or use `fakeredis`. Async tests use `pytest.mark.anyio`.

## Docker

`Dockerfile` builds a slim Python 3.12 image that runs as a non-root user: `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Compose reuses the same image for the one-off `migrate` service. See [Running everything in Docker](../../README.md#running-everything-in-docker).

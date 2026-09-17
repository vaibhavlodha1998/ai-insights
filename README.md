# starter

A monorepo starter with a **FastAPI** backend, a **Next.js** frontend, and **Postgres + Redis** running in Docker. Everything reads one shared `.env` file at the repo root.

| Path | What it is |
| --- | --- |
| [`apps/api`](apps/api/README.md) | FastAPI · async SQLAlchemy 2 + psycopg 3 · Alembic · Redis · Poetry · pytest, ruff, mypy |
| [`apps/web`](apps/web/README.md) | Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript · ESLint |
| [`infra/docker-compose.yml`](infra/docker-compose.yml) | Postgres 17 with pgvector, Redis 7, and optional containers for the api and web apps |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI: lint, typecheck, tests, migration check and web build |

## What works today

- **API:** two health endpoints. `GET /health` is a liveness check that doesn't touch any dependency. `GET /health/ready` checks Postgres and Redis at the same time with a 2 s timeout and returns `503` if either is down. CORS is set from the env file.
- **Database:** Alembic is wired to the app's settings and to a shared `Base` with constraint naming conventions. Autogenerate works. **There are no models or migrations yet.**
- **Web:** one page (`/`) that calls the API on every request and shows the status of the api, database and redis. `/api/*` on the web app is proxied to the API.
- **Tooling:** Docker images for both apps, pre-commit hooks, and GitHub Actions CI.

Not included yet: auth, users, or any domain models. `bcrypt` and `uuid6` are installed in the API but not used yet.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22 | Yarn 4 comes through Corepack (`corepack enable`) |
| Python | 3.12 | |
| Poetry | 2.x | Installs the API's dependencies into `apps/api/.venv` |
| Docker | Compose v2.24+ | Runs Postgres and Redis (and optionally the apps) |

## Getting started

```bash
# 1. Create your env file
cp .env.example .env

# 2. Install dependencies
corepack enable
yarn install
cd apps/api && poetry install && cd ../..

# 3. Start Postgres and Redis, then apply migrations
yarn infra:up
yarn db:migrate

# 4. Run the apps (two terminals)
yarn dev:api     # http://localhost:8000  (API docs at /docs)
yarn dev:web     # http://localhost:3000
```

Open http://localhost:3000. You should see `api`, `database` and `redis` all marked **ok**.

Optional: install the git hooks with `cd apps/api && poetry run pre-commit install`.

## Environment variables

There's one `.env` at the repo root, copied from [`.env.example`](.env.example). It's gitignored.

| Variable | Default | Used by |
| --- | --- | --- |
| `ENVIRONMENT` | `dev` | api |
| `POSTGRES_HOST` | `localhost` | api, alembic |
| `POSTGRES_PORT` | `5434` | api, alembic; also the host port Docker publishes |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `starter` | api, alembic, the Postgres container |
| `REDIS_HOST` | `localhost` | api |
| `REDIS_PORT` | `6381` | api; also the host port Docker publishes |
| `REDIS_DB` | `0` | api |
| `CORS_ORIGINS` | `http://localhost:3000` | api (comma-separated) |
| `API_URL` | `http://localhost:8000` | web: server-side fetches and the `/api/*` rewrite |

How each part reads the file:

- **Docker Compose:** the yarn scripts pass `--env-file .env`. Postgres and Redis use non-default host ports (5434, 6381) so they don't clash with local installs.
- **API:** [`app/core/config.py`](apps/api/app/core/config.py) reads the root `.env` by absolute path, so it works from any working directory. An optional `apps/api/.env` overrides it. Real environment variables override both. The database and Redis URLs are built from these parts, and the password is escaped properly.
- **Web:** [`next.config.ts`](apps/web/next.config.ts) loads the root `.env` with `@next/env`. Put web variables in the root file: `.env*` files inside `apps/web` are **not** loaded. `API_URL` is read when the Next config loads, so restart `yarn dev:web` after changing it.

## Scripts

Run these from the repo root.

| Script | What it does |
| --- | --- |
| `yarn infra:up` / `yarn infra:down` | Start or stop Postgres and Redis. `up` waits until both are healthy |
| `yarn dev:api` | API with auto-reload on port 8000 |
| `yarn dev:web` | Next.js dev server on port 3000 |
| `yarn db:migrate` | `alembic upgrade head` |
| `yarn db:revision "message"` | Autogenerate a migration from model changes |
| `yarn test:api` | pytest (no Docker needed; datastores are stubbed) |
| `yarn lint:api` | ruff check + ruff format check + mypy |
| `yarn lint:web` | ESLint + route type generation + `tsc` |
| `yarn build:web` | Production build of the web app |
| `yarn app:up` / `yarn app:down` | Build and run **everything** in Docker (see below) |

## Running everything in Docker

```bash
yarn app:up
```

This builds the api and web images and starts them in order: `postgres` + `redis` → `migrate` (runs `alembic upgrade head`, then exits) → `api` on :8000 → `web` on :3000. Inside Docker, the api reaches the datastores by service name (`postgres:5432`, `redis:6379`) and web reaches the api at `http://api:8000`. Compose sets these, overriding the host values in `.env`.

`yarn infra:up` starts only the datastores, because the app containers are in the `app` Compose profile.

## Database migrations

1. Add a model under `apps/api/app/models/` that inherits from `app.db.base.Base`.
2. Import it in [`app/models/__init__.py`](apps/api/app/models/__init__.py), or autogenerate won't see it.
3. `yarn db:revision "create users table"`. The new file lands in `apps/api/alembic/versions/`, named with the date, and ruff formats it automatically.
4. Review the generated file, then run `yarn db:migrate`.

CI runs `alembic upgrade head` followed by `alembic check`, so it fails if the models and migrations are out of sync.

## Quality checks

- **pre-commit** ([`.pre-commit-config.yaml`](.pre-commit-config.yaml)): whitespace, end-of-file, YAML/TOML and private-key checks; ruff on the api; `yarn lint:api` when api Python files change; `yarn lint:web` when web files change.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), on pushes to `main` and on pull requests:
  - **api job:** lint, tests, then migrations against a real Postgres.
  - **web job:** `yarn install --immutable`, lint + typecheck, build.

## Windows notes

- `yarn dev:api` starts uvicorn with a selector event loop ([`app/core/loop.py`](apps/api/app/core/loop.py)), because psycopg's async mode doesn't work on Windows' default Proactor loop. Linux containers don't need this.
- `.gitattributes` and `.editorconfig` keep line endings as LF.

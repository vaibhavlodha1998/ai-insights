# web

Next.js 16 app (App Router, Turbopack, React 19, Tailwind CSS 4). Setup and the root scripts are in the [root README](../../README.md).

> Next.js 16 differs from older versions. Before changing framework code, read the bundled docs in `node_modules/next/dist/docs/` (see [AGENTS.md](AGENTS.md)).

## Layout

```
src/
  app/
    layout.tsx          root layout, Geist fonts, metadata
    page.tsx            "/": live status of api, database and redis (async server component)
    globals.css         Tailwind import and theme tokens (light and dark)
  components/
    status-row.tsx      one status line; status-row.test.tsx next to it
  lib/
    api.ts              server-only API client: apiFetch(), getReadiness(), response types
    api.test.ts
  test/
    empty-module.ts     stands in for `server-only` under Vitest
e2e/
  home.spec.ts          Playwright tests against the running stack
next.config.ts          loads the root .env, standalone output, /api/* rewrite
vitest.config.mts       jsdom, tsconfig paths, server-only alias
playwright.config.ts    Chromium, starts or reuses the API and web servers
Dockerfile              standalone production image (build from the repo root)
```

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

## Talking to the API

The two ways in, both driven by `API_URL` in the root `.env`:

- **Server components, route handlers, server actions:** use `apiFetch()` from `@/lib/api`. It calls `API_URL` directly, with `cache: "no-store"` and a 3 s timeout. The module imports `server-only`, so it can't end up in client bundles.
- **Client components:** call relative paths such as `fetch("/api/health")`. `next.config.ts` rewrites `/api/:path*` to `${API_URL}/:path*`, so the browser only ever talks to the web origin and doesn't need CORS.

Failed API calls return the standard error body. Its type is `ApiErrorBody` in `@/lib/api`, and `error.request_id` matches the `X-Request-ID` response header and the API's logs.

`page.tsx` calls `await connection()` so the status is fetched on every request instead of being prerendered once at build time.

## Testing

**Unit tests (Vitest + React Testing Library):** put `*.test.ts(x)` files next to the code under `src/`.
- Vitest can't render `async` server components such as `page.tsx`. Keep async pages thin, unit-test the pieces they use (components, `lib/` functions), and cover the page itself with an end-to-end test.
- `server-only` is aliased to an empty module, so `lib/api.ts` can be imported in tests.
- `vi.stubEnv` and `vi.stubGlobal` are undone after each test (`unstubEnvs` / `unstubGlobals`). `api.test.ts` shows how to stub `fetch` and `API_URL`.

**End-to-end tests (Playwright):** put `*.spec.ts` files in `e2e/`.

```bash
yarn infra:up && yarn db:migrate                     # datastores, from the repo root
yarn workspace web playwright install chromium       # once
yarn test:e2e
```

- **Servers:** Playwright starts `yarn start:api` (:8000) and `yarn dev:web` (:3000), or reuses them if they're already running.
- **CI:** Playwright always starts fresh servers and runs `next start` against a production build, so run `yarn build:web` first when you set `CI=1` locally.
- **Results:** reports and traces go to `playwright-report/` and `test-results/` (gitignored).

## Environment

- Variables come from the **repo-root** `.env`, loaded in `next.config.ts`. Env files inside `apps/web` are not loaded.
- Only `API_URL` is used right now. It's server-only. Anything the browser needs must be prefixed with `NEXT_PUBLIC_` and is baked in at build time.
- The rewrite target is also resolved at build time. The Dockerfile takes `API_URL` as a build argument (Compose passes `http://api:8000`).

## Docker

```bash
docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:8000 .
```

The build context is the repo root, so the Yarn workspace lockfile is included. The image runs `node apps/web/server.js` from the standalone output as the `node` user on port 3000. `yarn app:up` builds and runs it alongside the API.

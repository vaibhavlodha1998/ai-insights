# web

Next.js 16 app (App Router, Turbopack, React 19, Tailwind CSS 4). Setup and the root scripts are in the [root README](../../README.md).

> Next.js 16 differs from older versions. Before changing framework code, read the bundled docs in `node_modules/next/dist/docs/` (see [AGENTS.md](AGENTS.md)).

## Layout

```
src/
  app/
    layout.tsx      root layout, Geist fonts, metadata
    page.tsx        "/": live status of api, database and redis
    globals.css     Tailwind import and theme tokens (light and dark)
  lib/
    api.ts          server-only API client: apiFetch() and getReadiness()
next.config.ts      loads the root .env, standalone output, /api/* rewrite
Dockerfile          standalone production image (build from the repo root)
```

## Scripts

Run from the repo root with `yarn workspace web <script>`, or use the root aliases:

| Script | Root alias | What it does |
| --- | --- | --- |
| `dev` | `yarn dev:web` | Dev server on http://localhost:3000 |
| `build` | `yarn build:web` | Production build (`.next/standalone`) |
| `start` | | Serve the production build |
| `lint` | `yarn lint:web` | ESLint |
| `typecheck` | `yarn lint:web` | `next typegen` then `tsc --noEmit` |

## Talking to the API

The two ways in, both driven by `API_URL` in the root `.env`:

- **Server components, route handlers, server actions:** use `apiFetch()` from `@/lib/api`. It calls `API_URL` directly, with `cache: "no-store"` and a 3 s timeout. The module imports `server-only`, so it can't end up in client bundles.
- **Client components:** call relative paths such as `fetch("/api/health")`. `next.config.ts` rewrites `/api/:path*` to `${API_URL}/:path*`, so the browser only ever talks to the web origin and doesn't need CORS.

`page.tsx` calls `await connection()` so the status is fetched on every request instead of being prerendered once at build time.

## Environment

- Variables come from the **repo-root** `.env`, loaded in `next.config.ts`. Env files inside `apps/web` are not loaded.
- Only `API_URL` is used right now. It's server-only. Anything the browser needs must be prefixed with `NEXT_PUBLIC_` and is baked in at build time.
- The rewrite target is also resolved at build time. The Dockerfile takes `API_URL` as a build argument (Compose passes `http://api:8000`).

## Docker

```bash
docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:8000 .
```

The build context is the repo root, so the Yarn workspace lockfile is included. The image runs `node apps/web/server.js` from the standalone output as the `node` user on port 3000. `yarn app:up` builds and runs it alongside the API.

import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.join(__dirname, "../..");
const isCI = !!process.env.CI;

/**
 * End-to-end tests against the real API, Postgres and Redis.
 * Postgres and Redis must already be running and migrated (`yarn infra:up && yarn db:migrate`).
 * The API and web servers are started here, or reused if they are already running locally.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "yarn start:api",
      url: "http://localhost:8000/health",
      cwd: repoRoot,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // CI tests the production build (run `yarn build:web` first)
      command: isCI ? "yarn workspace web start" : "yarn dev:web",
      url: "http://localhost:3000",
      cwd: repoRoot,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});

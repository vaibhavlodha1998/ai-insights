import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Next runs this file from apps/web; the shared .env lives at the repo root
const repoRoot = path.join(process.cwd(), "../..");

// Next has already loaded apps/web's env files by now, so force a reload to pick up
// the root .env. Real environment variables still take precedence over the file.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", console, true);

const apiUrl = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  async rewrites() {
    // Browser code calls /api/* on the web origin, so it needs no CORS setup
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;

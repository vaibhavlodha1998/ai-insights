import { connection } from "next/server";

import { StatusRow } from "@/components/status-row";
import { getReadiness } from "@/lib/api";

export default async function Home() {
  // Check the API on every request rather than once at build time
  await connection();
  const readiness = await getReadiness();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">starter</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Next.js talking to FastAPI, Postgres and Redis.
        </p>
      </div>

      <section className="rounded-lg border border-black/10 px-4 dark:border-white/10">
        <ul>
          <StatusRow name="api" status={readiness ? "ok" : "unavailable"} />
          {readiness &&
            Object.entries(readiness.checks).map(([name, status]) => (
              <StatusRow key={name} name={name} status={status} />
            ))}
        </ul>
      </section>

      {!readiness && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Can&apos;t reach the API. Start it with{" "}
          <code className="font-mono">yarn dev:api</code>.
        </p>
      )}
    </main>
  );
}

import { connection } from "next/server";

import { getReadiness, type CheckStatus } from "@/lib/api";

function StatusRow({ name, status }: { name: string; status: CheckStatus }) {
  const ok = status === "ok";
  return (
    <li className="flex items-center justify-between border-b border-black/10 py-3 last:border-0 dark:border-white/10">
      <span className="font-mono text-sm">{name}</span>
      <span
        className={`flex items-center gap-2 text-sm font-medium ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
      >
        <span
          aria-hidden
          className={`size-2 rounded-full ${ok ? "bg-emerald-600" : "bg-red-600"}`}
        />
        {status}
      </span>
    </li>
  );
}

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

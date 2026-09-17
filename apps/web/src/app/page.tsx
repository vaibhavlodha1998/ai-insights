import { InsightsWorkspace } from "@/components/insights-workspace";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">AI Insights</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Ask a question in any supported language and review the insights that come back.
        </p>
      </header>
      <InsightsWorkspace />
    </main>
  );
}

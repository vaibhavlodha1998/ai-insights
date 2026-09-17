export function ResultsHeading({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-sm text-subtle">Results for</p>
      <h1 className="m-0 font-display text-[34px] leading-tight font-medium tracking-[-0.015em]">
        {query}
      </h1>
    </div>
  );
}

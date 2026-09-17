import { Card, Skeleton } from "@/components/ui";

import { ResultsHeading } from "./results-heading";

const PLACEHOLDERS = [
  { title: "w-[68%]", line: "w-[82%]" },
  { title: "w-[54%]", line: "w-[74%]" },
  { title: "w-[61%]", line: "w-[66%]" },
];

/** Stand-in for the results while a question is being answered. */
export function ResultsSkeleton({ query }: { query: string }) {
  return (
    <section aria-busy="true" className="flex flex-col gap-5.5">
      <ResultsHeading query={query} />
      <p className="sr-only" role="status">
        Getting insights…
      </p>
      <div className="flex flex-col gap-3.5">
        {PLACEHOLDERS.map((placeholder, index) => (
          <Card key={index} padding="md" className="flex animate-pulse-soft flex-col gap-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-30" />
            </div>
            <Skeleton className={`h-5.5 bg-disabled ${placeholder.title}`} />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className={`h-3.5 ${placeholder.line}`} />
          </Card>
        ))}
      </div>
    </section>
  );
}

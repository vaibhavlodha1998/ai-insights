"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SparkIcon } from "@/components/ui";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Insights" },
  { href: "/state", label: "Session state" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-14 sm:py-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink no-underline sm:gap-3">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-accent text-white">
            <SparkIcon />
          </span>
          <span className="font-display text-lg font-semibold tracking-[-0.01em] whitespace-nowrap sm:text-[22px]">
            AI Insights
          </span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const current = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-[10px] px-2.5 text-sm font-medium whitespace-nowrap sm:px-3",
                      current ? "bg-line-subtle text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

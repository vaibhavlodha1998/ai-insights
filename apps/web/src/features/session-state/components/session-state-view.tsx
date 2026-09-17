"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Card, DescriptionList, EmptyState } from "@/components/ui";
import { SORT_DIRECTION_OPTIONS, SORT_FIELD_OPTIONS } from "@/features/insights/filter-sort";
import type { SessionStatus } from "@/features/prompts/prompt-session-slice";
import { LANGUAGES } from "@/features/prompts/schema";

import { useSessionSnapshot } from "../use-session-snapshot";

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: "No question yet",
  submitting: "Getting insights",
  success: "Insights ready",
  needsClarification: "Waiting for details",
  error: "Last request failed",
};

const labelFor = <T extends string>(options: readonly { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? value;

function languageName(code: string | undefined) {
  if (!code) return null;
  const language = LANGUAGES.find((item) => item.code === code);
  return language ? `${language.label} (${code})` : code;
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card as="section" padding="md" className={className}>
      <h2 className="m-0 mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

/** A read-only view of the global store: the last request, its response and the results view. */
export function SessionStateView() {
  const { session, view, results } = useSessionSnapshot();
  const { lastRequest, error } = session;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-4xl font-medium tracking-[-0.015em]">Session state</h1>
        <p className="m-0 max-w-[680px] text-base leading-relaxed text-ink-muted">
          What the app is holding for this tab: your last question, the answer to it and how the
          results are filtered. It resets when the page is reloaded.
        </p>
      </div>

      {session.status === "idle" && !lastRequest ? (
        <EmptyState
          title="Nothing here yet"
          actions={
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-[10px] bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Ask a question
            </Link>
          }
        >
          Ask a question on the Insights page and it will show up here.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Section title="Request">
            <DescriptionList
              items={[
                { term: "Prompt", detail: lastRequest?.prompt },
                { term: "Target language", detail: languageName(lastRequest?.targetLanguage) },
                { term: "Continues conversation", detail: lastRequest?.contextId, mono: true },
              ]}
            />
          </Section>

          <Section title="Response">
            <DescriptionList
              items={[
                { term: "Status", detail: <Badge>{STATUS_LABEL[session.status]}</Badge> },
                { term: "Results for", detail: session.resultsFor },
                { term: "Response ID", detail: session.responseId, mono: true },
                {
                  term: "Pages loaded",
                  detail: results && `${results.pagesLoaded} of ${results.totalPages}`,
                },
                {
                  term: "Insights loaded",
                  detail: results && `${results.insightsLoaded} of ${results.totalItems}`,
                },
                { term: "Page size", detail: results?.pageSize },
                {
                  term: "More pages",
                  detail: results && (results.hasNextPage ? "Yes" : "No"),
                },
              ]}
            />
          </Section>

          <Section title="Clarification">
            <DescriptionList
              items={[
                { term: "Waiting for details", detail: session.contextId ? "Yes" : "No" },
                { term: "Message", detail: session.clarificationMessage },
                { term: "Conversation ID", detail: session.contextId, mono: true },
                {
                  term: "Asked so far",
                  detail: session.pendingPrompts.map((prompt) => `“${prompt}”`).join(", "),
                },
              ]}
            />
          </Section>

          <Section title="Results view">
            <DescriptionList
              items={[
                { term: "Search", detail: view.searchTerm && `“${view.searchTerm}”` },
                {
                  term: "Sort",
                  detail:
                    view.sortField === "relevance"
                      ? "Relevance"
                      : `${labelFor(SORT_FIELD_OPTIONS, view.sortField)}, ${labelFor(SORT_DIRECTION_OPTIONS, view.sortDirection)}`,
                },
              ]}
            />
          </Section>

          {error && (
            <Section title="Last error" className="md:col-span-2">
              <DescriptionList
                items={[
                  { term: "Message", detail: error.message },
                  { term: "Code", detail: error.code, mono: true },
                  { term: "HTTP status", detail: error.status || null, mono: true },
                  { term: "Request ID", detail: error.requestId, mono: true },
                ]}
              />
            </Section>
          )}

          <Card as="section" padding="md" className="md:col-span-2">
            <details>
              <summary className="cursor-pointer font-display text-xl font-semibold">Raw store</summary>
              <pre className="mt-4 mb-0 overflow-x-auto rounded-xl bg-surface-muted p-4 font-mono text-[13px] leading-relaxed text-ink-soft">
                {JSON.stringify({ promptSession: session, insightsView: view, results }, null, 2)}
              </pre>
            </details>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { fieldErrors, type ApiError } from "@/lib/api/errors";

type ApiErrorAlertProps = {
  error: ApiError;
  title?: string;
  onDismiss?: () => void;
};

export function ApiErrorAlert({ error, title = "Request failed", onDismiss }: ApiErrorAlertProps) {
  // Skip details that only repeat the headline message
  const fields = fieldErrors(error).filter(({ message }) => message !== error.message);

  return (
    <section
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-950 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-sm">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {fields.map(({ field, message }) => (
            <li key={`${field}:${message}`}>
              <span className="font-mono text-xs">{field}</span>: {message}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-red-900/70 dark:text-red-200/70">
        <div className="flex gap-1">
          <dt>code</dt>
          <dd className="font-semibold">{error.code}</dd>
        </div>
        {error.status > 0 && (
          <div className="flex gap-1">
            <dt>status</dt>
            <dd>{error.status}</dd>
          </div>
        )}
        {error.requestId && (
          <div className="flex min-w-0 gap-1">
            <dt>request</dt>
            <dd className="truncate">{error.requestId}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

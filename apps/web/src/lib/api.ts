import "server-only";

export type CheckStatus = "ok" | "unavailable";

export type ReadinessResponse = {
  status: CheckStatus;
  checks: Record<string, CheckStatus>;
};

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/** Server-side fetch against the API. Browser code should call `/api/*` instead. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
    ...init,
  });
}

/** Readiness report, or null when the API itself can't be reached. */
export async function getReadiness(): Promise<ReadinessResponse | null> {
  try {
    const response = await apiFetch("/health/ready");
    return (await response.json()) as ReadinessResponse;
  } catch {
    return null;
  }
}

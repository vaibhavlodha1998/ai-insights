import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

/** Body of every error response the API generates (apps/api/app/schemas/error.py). */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    request_id: string | null;
    details: unknown;
  };
};

/** The one error shape components deal with, whatever went wrong. */
export type ApiError = {
  /** HTTP status, or 0 when no response arrived. */
  status: number;
  code: string;
  message: string;
  requestId: string | null;
  details: unknown;
};

export const NETWORK_ERROR = "NETWORK_ERROR";
export const UNEXPECTED_ERROR = "UNEXPECTED_ERROR";

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/** What `.unwrap()` rejects with for requests made through `baseApi`. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number" &&
    typeof (value as { code?: unknown }).code === "string" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

export function toApiError(error: FetchBaseQueryError): ApiError {
  if (typeof error.status === "number") {
    if (isApiErrorBody(error.data)) {
      const { code, message, request_id, details } = error.data.error;
      return { status: error.status, code, message, requestId: request_id, details };
    }
    return {
      status: error.status,
      code: UNEXPECTED_ERROR,
      message: "The server returned an unexpected response",
      requestId: null,
      details: error.data,
    };
  }

  if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
    return {
      status: 0,
      code: NETWORK_ERROR,
      message: "Could not reach the server. Check your connection and try again.",
      requestId: null,
      details: null,
    };
  }

  return {
    status: "originalStatus" in error ? error.originalStatus : 0,
    code: UNEXPECTED_ERROR,
    message: "The server returned an unexpected response",
    requestId: null,
    details: null,
  };
}

/**
 * RTK Query hooks report either our `ApiError` (from the base query) or a
 * `SerializedError` (something threw in client code); components get one shape.
 */
export function asApiError(error: ApiError | SerializedError | undefined): ApiError | undefined {
  if (error === undefined || isApiError(error)) return error;
  return {
    status: 0,
    code: UNEXPECTED_ERROR,
    message: error.message ?? "Something went wrong",
    requestId: null,
    details: null,
  };
}

/** Field-level problems in a 422 body, as `[{ field, message }]`. */
export function fieldErrors(error: ApiError): { field: string; message: string }[] {
  if (!Array.isArray(error.details)) return [];
  return error.details.flatMap((detail) => {
    if (typeof detail !== "object" || detail === null) return [];
    const { loc, msg } = detail as { loc?: unknown; msg?: unknown };
    if (!Array.isArray(loc) || typeof msg !== "string") return [];
    const field = loc.filter((part) => part !== "body").join(".") || "body";
    return [{ field, message: msg }];
  });
}

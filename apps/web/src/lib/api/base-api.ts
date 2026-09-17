import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from "@reduxjs/toolkit/query/react";

import { toApiError, type ApiError } from "./errors";

/** Same-origin path; next.config.ts rewrites /api/* to the API. */
export const API_BASE_PATH = "/api";

const rawBaseQuery = fetchBaseQuery({
  // Absolute in the browser so fetch never depends on a <base> element; the
  // fallback only matters outside a browser (tests set a jsdom URL)
  baseUrl:
    typeof window === "undefined"
      ? API_BASE_PATH
      : new URL(API_BASE_PATH, window.location.origin).toString(),
  timeout: 15_000,
});

/** Every endpoint rejects with an `ApiError`, never a raw fetch error. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    return { error: toApiError(result.error), meta: result.meta };
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  endpoints: () => ({}),
});

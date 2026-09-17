import { baseApi } from "@/lib/api/base-api";
import type { ApiError } from "@/lib/api/errors";

import type { InsightsPage, PromptRequest, PromptResponse } from "./types";

export const promptsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitPrompt: build.mutation<PromptResponse, PromptRequest>({
      async queryFn(body, { dispatch }, _extraOptions, baseQuery) {
        const result = await baseQuery({ url: "/prompts", method: "POST", body });
        if (result.error) return { error: result.error as ApiError };

        const data = result.data as PromptResponse;
        if (data.status === "SUCCESS") {
          // Page 1 came with the POST. Seed the pages cache synchronously, before this
          // mutation resolves, so the results view never re-requests it.
          const { responseId, insights, pagination } = data;
          dispatch(
            promptsApi.util.upsertQueryEntries([
              {
                endpointName: "getInsights",
                arg: responseId,
                value: { pages: [{ responseId, insights, pagination }], pageParams: [1] },
              },
            ]),
          );
        }
        return { data };
      },
    }),

    /** All loaded pages of one response, keyed by `responseId`. */
    getInsights: build.infiniteQuery<InsightsPage, string, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
      },
      query: ({ queryArg: responseId, pageParam }) => ({
        url: `/prompts/${encodeURIComponent(responseId)}/insights`,
        params: { page: pageParam },
      }),
    }),
  }),
});

export const { useSubmitPromptMutation, useGetInsightsInfiniteQuery } = promptsApi;

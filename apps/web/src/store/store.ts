import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { insightsViewSlice } from "@/features/insights/insights-view-slice";
import { promptSessionSlice } from "@/features/prompts/prompt-session-slice";
import { baseApi } from "@/lib/api/base-api";

const rootReducer = combineSlices(baseApi, promptSessionSlice, insightsViewSlice);

export type RootState = ReturnType<typeof rootReducer>;

/** A new store per call: one per browser tab, and a fresh one per test. */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];

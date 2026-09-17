import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { promptsApi } from "@/features/prompts/api";

import type { SortOrder } from "./filter-sort";

export type InsightsViewState = {
  /** Already debounced: only the settled search term reaches the store. */
  searchTerm: string;
  sortOrder: SortOrder;
};

export const initialState: InsightsViewState = {
  searchTerm: "",
  sortOrder: "relevance",
};

export const insightsViewSlice = createSlice({
  name: "insightsView",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<SortOrder>) => {
      state.sortOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    // A new result starts unfiltered; the chosen sort order is a preference and stays
    builder.addMatcher(promptsApi.endpoints.submitPrompt.matchFulfilled, (state, action) => {
      if (action.payload.status === "SUCCESS") state.searchTerm = "";
    });
  },
  selectors: {
    selectSearchTerm: (state) => state.searchTerm,
    selectSortOrder: (state) => state.sortOrder,
  },
});

export const { setSearchTerm, setSortOrder } = insightsViewSlice.actions;
export const { selectSearchTerm, selectSortOrder } = insightsViewSlice.selectors;

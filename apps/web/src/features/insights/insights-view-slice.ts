import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { promptsApi } from "@/features/prompts/api";

import type { SortDirection, SortField } from "./filter-sort";

export type InsightsViewState = {
  /** Already debounced: only the settled search term reaches the store. */
  searchTerm: string;
  sortField: SortField;
  sortDirection: SortDirection;
};

export const initialState: InsightsViewState = {
  searchTerm: "",
  sortField: "relevance",
  sortDirection: "asc",
};

export const insightsViewSlice = createSlice({
  name: "insightsView",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSortField: (state, action: PayloadAction<SortField>) => {
      state.sortField = action.payload;
    },
    setSortDirection: (state, action: PayloadAction<SortDirection>) => {
      state.sortDirection = action.payload;
    },
  },
  extraReducers: (builder) => {
    // A new result starts unfiltered; the chosen sort is a preference and stays
    builder.addMatcher(promptsApi.endpoints.submitPrompt.matchFulfilled, (state, action) => {
      if (action.payload.status === "SUCCESS") state.searchTerm = "";
    });
  },
  selectors: {
    selectSearchTerm: (state) => state.searchTerm,
    selectSortField: (state) => state.sortField,
    selectSortDirection: (state) => state.sortDirection,
  },
});

export const { setSearchTerm, setSortField, setSortDirection } = insightsViewSlice.actions;
export const { selectSearchTerm, selectSortField, selectSortDirection } =
  insightsViewSlice.selectors;

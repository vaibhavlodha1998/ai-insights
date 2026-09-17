import { createSlice } from "@reduxjs/toolkit";

import { asApiError, type ApiError } from "@/lib/api/errors";

import { promptsApi } from "./api";
import type { PromptRequest } from "./types";

export type SessionStatus =
  | "idle"
  | "submitting"
  | "success"
  | "needsClarification"
  | "error";

export type PromptSessionState = {
  status: SessionStatus;
  /** The most recent request sent to the API. */
  lastRequest: PromptRequest | null;
  /** Set only while a clarification thread is open; sent with the next submit. */
  contextId: string | null;
  /** Prompts in the open clarification thread, oldest first. */
  pendingPrompts: string[];
  clarificationMessage: string | null;
  /** Identifies the insights to show; pages live in the RTK Query cache. */
  responseId: string | null;
  error: ApiError | null;
};

export const initialState: PromptSessionState = {
  status: "idle",
  lastRequest: null,
  contextId: null,
  pendingPrompts: [],
  clarificationMessage: null,
  responseId: null,
  error: null,
};

const { submitPrompt } = promptsApi.endpoints;

export const promptSessionSlice = createSlice({
  name: "promptSession",
  initialState,
  reducers: {
    startOver: () => initialState,
    dismissError: (state) => {
      state.error = null;
      if (state.status === "error") {
        state.status = state.responseId
          ? "success"
          : state.contextId
            ? "needsClarification"
            : "idle";
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(submitPrompt.matchPending, (state, action) => {
        state.status = "submitting";
        state.lastRequest = action.meta.arg.originalArgs;
        state.error = null;
      })
      .addMatcher(submitPrompt.matchFulfilled, (state, action) => {
        const response = action.payload;
        if (response.status === "NEEDS_CLARIFICATION") {
          state.status = "needsClarification";
          state.contextId = response.contextId;
          state.pendingPrompts.push(action.meta.arg.originalArgs.prompt);
          state.clarificationMessage = response.message;
          state.responseId = null;
          return;
        }
        state.status = "success";
        state.responseId = response.responseId;
        state.contextId = null;
        state.pendingPrompts = [];
        state.clarificationMessage = null;
      })
      .addMatcher(submitPrompt.matchRejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? asApiError(action.error) ?? null;
        // The thread is gone on the server; keeping its id would fail again
        if (state.error?.code === "CONTEXT_NOT_FOUND") {
          state.contextId = null;
          state.pendingPrompts = [];
          state.clarificationMessage = null;
        }
      });
  },
  selectors: {
    selectSessionStatus: (state) => state.status,
    selectLastRequest: (state) => state.lastRequest,
    selectContextId: (state) => state.contextId,
    selectPendingPrompts: (state) => state.pendingPrompts,
    selectClarificationMessage: (state) => state.clarificationMessage,
    selectResponseId: (state) => state.responseId,
    selectSessionError: (state) => state.error,
  },
});

export const { startOver, dismissError } = promptSessionSlice.actions;
export const {
  selectSessionStatus,
  selectLastRequest,
  selectContextId,
  selectPendingPrompts,
  selectClarificationMessage,
  selectResponseId,
  selectSessionError,
} = promptSessionSlice.selectors;

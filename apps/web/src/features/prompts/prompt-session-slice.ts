import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { asApiError, type ApiError } from "@/lib/api/errors";

import { promptsApi } from "./api";
import type { LanguageCode, PromptRequest } from "./types";

export type SessionStatus =
  | "idle"
  | "submitting"
  | "success"
  | "needsClarification"
  | "error";

/** Text to put into the form from outside it, e.g. a suggestion the user picked. */
export type PromptDraft = {
  prompt: string;
  targetLanguage?: LanguageCode;
  /** Changes on every fill, so picking the same suggestion twice still applies. */
  id: number;
};

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
  /** The full question the current results answer (a thread's prompts combined). */
  resultsFor: string | null;
  error: ApiError | null;
  draft: PromptDraft | null;
};

export const initialState: PromptSessionState = {
  status: "idle",
  lastRequest: null,
  contextId: null,
  pendingPrompts: [],
  clarificationMessage: null,
  responseId: null,
  resultsFor: null,
  error: null,
  draft: null,
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
    fillPrompt: (state, action: PayloadAction<Omit<PromptDraft, "id">>) => {
      state.draft = { ...action.payload, id: (state.draft?.id ?? 0) + 1 };
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
        const prompt = action.meta.arg.originalArgs.prompt;
        if (response.status === "NEEDS_CLARIFICATION") {
          state.status = "needsClarification";
          state.contextId = response.contextId;
          state.pendingPrompts.push(prompt);
          state.clarificationMessage = response.message;
          state.responseId = null;
          state.resultsFor = null;
          return;
        }
        state.status = "success";
        state.responseId = response.responseId;
        state.resultsFor = [...state.pendingPrompts, prompt].join(" ");
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
    selectResultsFor: (state) => state.resultsFor,
    selectSessionError: (state) => state.error,
    selectDraft: (state) => state.draft,
  },
});

export const { startOver, dismissError, fillPrompt } = promptSessionSlice.actions;
export const {
  selectSessionStatus,
  selectLastRequest,
  selectContextId,
  selectPendingPrompts,
  selectClarificationMessage,
  selectResponseId,
  selectResultsFor,
  selectSessionError,
  selectDraft,
} = promptSessionSlice.selectors;

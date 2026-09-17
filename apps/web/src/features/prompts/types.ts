/** Wire types for the prompts API (apps/api/app/schemas/prompt.py). */

export type LanguageCode = "en" | "es" | "fr" | "de";

export type PromptRequest = {
  prompt: string;
  targetLanguage: LanguageCode;
  contextId?: string;
};

export type Insight = {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  confidence: number;
  tags: string[];
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type InsightsPage = {
  responseId: string;
  insights: Insight[];
  pagination: Pagination;
};

export type SuccessResponse = InsightsPage & {
  status: "SUCCESS";
  contextId: string;
};

export type ClarificationResponse = {
  status: "NEEDS_CLARIFICATION";
  message: string;
  contextId: string;
};

export type PromptResponse = SuccessResponse | ClarificationResponse;

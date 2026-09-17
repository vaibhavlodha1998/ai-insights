import type { LanguageCode } from "./types";

/** Starter questions on the empty page; picking one fills the form. */
export const PROMPT_SUGGESTIONS: readonly { prompt: string; targetLanguage: LanguageCode }[] = [
  { prompt: "How is AI changing healthcare?", targetLanguage: "en" },
  { prompt: "¿Cómo está cambiando la IA la salud?", targetLanguage: "es" },
  { prompt: "Tips for saving money each month", targetLanguage: "en" },
  { prompt: "Où va l’énergie renouvelable ?", targetLanguage: "fr" },
];

/** Follow-up details offered while the API is asking for more context. */
export const CLARIFICATION_IDEAS: readonly string[] = [
  "in healthcare",
  "for small businesses",
  "over the next five years",
  "and data privacy",
];

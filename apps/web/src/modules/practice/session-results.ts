import { apiRequest } from "@/src/lib/api-client";

export type PracticeSessionMode =
  | "lesson"
  | "fill_blank"
  | "listening"
  | "dictation"
  | "weak_words"
  | "daily_review"
  | "saved_words"
  | "flashcards";

export type PracticeSessionResultItemInput = {
  vocabularyItemId: number;
  challengeType: string;
  correct: boolean;
  answer?: string;
};

export type PracticeSessionResultInput = {
  mode: PracticeSessionMode;
  items: PracticeSessionResultItemInput[];
};

export const createPracticeSessionResult = (
  input: PracticeSessionResultInput
) =>
  apiRequest<unknown>("/practice/sessions", {
    method: "POST",
    body: input,
  });

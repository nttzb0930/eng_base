import type {
  ToeicGrammarAnswerPayload,
  ToeicGrammarAnswerResult,
  ToeicGrammarCatalog,
  ToeicGrammarPractice,
  ToeicGrammarPracticeMode,
  ToeicGrammarSubtopicDetail,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicGrammarHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export const toeicGrammarKeys = {
  all: ["toeic-grammar"] as const,
  catalog: () => [...toeicGrammarKeys.all, "catalog"] as const,
  subtopic: (target: string) =>
    [...toeicGrammarKeys.all, "subtopic", target] as const,
  practiceRoot: () => [...toeicGrammarKeys.all, "practice"] as const,
  practice: (mode: ToeicGrammarPracticeMode, target: string) =>
    [...toeicGrammarKeys.practiceRoot(), mode, target] as const,
};

export function createToeicGrammarApi(http: ToeicGrammarHttp) {
  return {
    async catalog() {
      return (await http.get<ToeicGrammarCatalog>("/toeic/grammar/catalog"))
        .data;
    },
    async subtopic(target: string) {
      return (
        await http.get<ToeicGrammarSubtopicDetail>(
          `/toeic/grammar/subtopics/${encodeURIComponent(target)}`
        )
      ).data;
    },
    async practice(mode: ToeicGrammarPracticeMode, target: string) {
      const query = new URLSearchParams({ mode, target });
      return (
        await http.get<ToeicGrammarPractice>(
          `/toeic/grammar/practice?${query.toString()}`
        )
      ).data;
    },
    async answer(body: ToeicGrammarAnswerPayload) {
      return (
        await http.post<ToeicGrammarAnswerResult>(
          "/toeic/grammar/answers",
          body
        )
      ).data;
    },
  };
}

export const toeicGrammarApi = createToeicGrammarApi(webHttpClient);

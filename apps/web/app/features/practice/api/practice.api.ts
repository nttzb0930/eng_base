import type {
  DictationPracticeChallenge,
  FillBlankPracticeChallenge,
  ListeningPracticeChallenge,
  PracticeLevelSummary,
  WeakWordsPracticeChallenge,
  WeakWordsSummary,
} from "@repo/shared/practice";

import { webHttpClient } from "@/src/lib/web-http-client";

import type { PracticeSessionResultInput } from "../types/practice-session.types";

export type PracticeHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

type ChallengeQuery = {
  level?: string;
  lesson?: string | number;
};

const buildChallengeQuery = ({ level, lesson }: ChallengeQuery = {}) => {
  const query = new URLSearchParams();

  if (level) query.set("level", level);
  if (lesson) query.set("lesson", String(lesson));

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export function createPracticeApi(http: PracticeHttp) {
  return {
    async getFillBlankSummary() {
      return (
        await http.get<PracticeLevelSummary>("/practice/fill-blank/summary")
      ).data;
    },

    async listFillBlankChallenges(query?: ChallengeQuery) {
      return (
        await http.get<FillBlankPracticeChallenge[]>(
          `/practice/fill-blank/challenges${buildChallengeQuery(query)}`,
        )
      ).data;
    },

    async getListeningSummary() {
      return (
        await http.get<PracticeLevelSummary>("/practice/listening/summary")
      ).data;
    },

    async listListeningChallenges(query?: ChallengeQuery) {
      return (
        await http.get<ListeningPracticeChallenge[]>(
          `/practice/listening/challenges${buildChallengeQuery(query)}`,
        )
      ).data;
    },

    async getDictationSummary() {
      return (
        await http.get<PracticeLevelSummary>("/practice/dictation/summary")
      ).data;
    },

    async listDictationChallenges(query?: ChallengeQuery) {
      return (
        await http.get<DictationPracticeChallenge[]>(
          `/practice/dictation/challenges${buildChallengeQuery(query)}`,
        )
      ).data;
    },

    async getWeakWordsSummary() {
      return (
        await http.get<WeakWordsSummary>("/practice/weak-words/summary")
      ).data;
    },

    async listWeakWordsChallenges() {
      return (
        await http.get<WeakWordsPracticeChallenge[]>(
          "/practice/weak-words/challenges",
        )
      ).data;
    },

    async recordSession(input: PracticeSessionResultInput) {
      return (await http.post<unknown>("/practice/sessions", input)).data;
    },
  };
}

export const practiceApi = createPracticeApi(webHttpClient);

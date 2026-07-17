import type {
  VocabularyTopic,
  VocabularyTopicDetails,
} from "@repo/shared";

import { webHttpClient } from "@/src/lib/web-http-client";

export type TopicHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createTopicApi(http: TopicHttp) {
  return {
    async list() {
      return (await http.get<VocabularyTopic[]>("/topics")).data;
    },

    async detail(slug: string, level?: string) {
      const query = level ? `?level=${encodeURIComponent(level)}` : "";
      return (
        await http.get<VocabularyTopicDetails | null>(
          `/topics/${encodeURIComponent(slug)}${query}`,
        )
      ).data;
    },
  };
}

export const topicApi = createTopicApi(webHttpClient);

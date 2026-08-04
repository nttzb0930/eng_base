import type {
  VocabularyTopic,
  VocabularyTopicDetails,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type TopicHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createTopicApi(http: TopicHttp) {
  return {
    async list(locale: string) {
      const query = new URLSearchParams({ locale });
      return (await http.get<VocabularyTopic[]>(`/topics?${query.toString()}`))
        .data;
    },

    async detail(slug: string, locale: string, level?: string) {
      const query = new URLSearchParams({ locale });
      if (level) query.set("level", level);
      return (
        await http.get<VocabularyTopicDetails | null>(
          `/topics/${encodeURIComponent(slug)}?${query.toString()}`,
        )
      ).data;
    },
  };
}

export const topicApi = createTopicApi(webHttpClient);

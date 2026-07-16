import { cache } from "react";
import type {
  VocabularyTopic,
  VocabularyTopicDetails,
} from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export const getVocabularyTopics = cache(() =>
  apiRequest<VocabularyTopic[]>("/topics")
);

export const getVocabularyTopicBySlug = cache(
  (slug: string, level?: string) => {
    const query = level ? `?level=${encodeURIComponent(level)}` : "";
    return apiRequest<VocabularyTopicDetails | null>(
      `/topics/${encodeURIComponent(slug)}${query}`
    );
  }
);

"use client";

import { useQuery } from "@tanstack/react-query";

import { topicApi } from "../api/topic.api";

export const topicKeys = {
  all: ["topics"] as const,
  list: ["topics", "list"] as const,
  detail: (slug?: string, level?: string) =>
    ["topics", "detail", slug ?? "", level ?? "all"] as const,
};

export function useTopics() {
  return useQuery({
    queryKey: topicKeys.list,
    queryFn: topicApi.list,
  });
}

export function useTopic(slug?: string, level?: string) {
  return useQuery({
    queryKey: topicKeys.detail(slug, level),
    queryFn: () => topicApi.detail(slug!, level),
    enabled: !!slug,
  });
}

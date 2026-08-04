"use client";

import { useQuery } from "@tanstack/react-query";

import { topicApi } from "../api/topic.api";

export const topicKeys = {
  all: ["topics"] as const,
  list: (locale: string) => ["topics", "list", locale] as const,
  detail: (slug: string, locale: string, level?: string) =>
    ["topics", "detail", locale, slug, level ?? "all"] as const,
};

export function useTopics(locale: string) {
  return useQuery({
    queryKey: topicKeys.list(locale),
    queryFn: () => topicApi.list(locale),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopic(
  slug: string | undefined,
  locale: string,
  level?: string
) {
  return useQuery({
    queryKey: topicKeys.detail(slug ?? "", locale, level),
    queryFn: () => topicApi.detail(slug!, locale, level),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

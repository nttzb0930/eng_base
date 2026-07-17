"use client";

import { useQuery } from "@tanstack/react-query";

import { lessonApi } from "../api/lesson.api";

export const lessonKeys = {
  all: ["lessons"] as const,
  detail: (id?: number) => ["lessons", id ?? "active"] as const,
};

export function useLesson(id?: number) {
  return useQuery({
    queryKey: lessonKeys.detail(id),
    queryFn: () => lessonApi.get(id),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { practiceSessionApi } from "../api/practice-session.api";
import type { ListPracticeSessionsQuery } from "../types/practice-session.types";

export const practiceSessionKeys = {
  all: ["practice-sessions"] as const,
  list: (query: ListPracticeSessionsQuery) => [...practiceSessionKeys.all, "list", query] as const,
  detail: (id: number) => [...practiceSessionKeys.all, "detail", id] as const,
};

export function usePracticeSessions(query: ListPracticeSessionsQuery) {
  return useQuery({
    queryKey: practiceSessionKeys.list(query),
    queryFn: () => practiceSessionApi.list(query),
  });
}

export function usePracticeSessionDetails(id: number, enabled: boolean = false) {
  return useQuery({
    queryKey: practiceSessionKeys.detail(id),
    queryFn: () => practiceSessionApi.detail(id),
    enabled,
  });
}

export function useDeletePracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => practiceSessionApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: practiceSessionKeys.all });
    },
  });
}

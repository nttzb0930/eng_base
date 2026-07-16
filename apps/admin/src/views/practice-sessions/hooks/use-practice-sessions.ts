import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { practiceSessionsService } from "@/src/services/practice-sessions/practice-sessions.service";
import type { ListPracticeSessionsQuery } from "@/src/services/practice-sessions/create-practice-sessions.service";

export const practiceSessionQueryKeys = {
  all: ["practice-sessions"] as const,
  list: (query: ListPracticeSessionsQuery) => [...practiceSessionQueryKeys.all, "list", query] as const,
  detail: (id: number) => [...practiceSessionQueryKeys.all, "detail", id] as const,
};

export function usePracticeSessions(query: ListPracticeSessionsQuery) {
  return useQuery({
    queryKey: practiceSessionQueryKeys.list(query),
    queryFn: () => practiceSessionsService.getPracticeSessions(query),
  });
}

export function usePracticeSessionDetails(id: number, enabled: boolean = false) {
  return useQuery({
    queryKey: practiceSessionQueryKeys.detail(id),
    queryFn: () => practiceSessionsService.getPracticeSessionDetails(id),
    enabled,
  });
}

export function useDeletePracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => practiceSessionsService.deletePracticeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: practiceSessionQueryKeys.all });
    },
  });
}

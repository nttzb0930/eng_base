import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateLessonChallengePayload,
  LessonChallengeQueryParams,
  UpdateLessonChallengePayload,
} from "@repo/shared";

import { challengeApi, challengeKeys } from "../api/challenge.api";

export function useChallenges(query: LessonChallengeQueryParams) {
  return useQuery({
    queryKey: challengeKeys.list(query),
    queryFn: () => challengeApi.listPage(query),
  });
}

export function useAllChallenges() {
  return useQuery({
    queryKey: challengeKeys.allList(),
    queryFn: () => challengeApi.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonChallengePayload) =>
      challengeApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useUpdateChallenge(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonChallengePayload) =>
      challengeApi.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => challengeApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

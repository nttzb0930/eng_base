import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateLessonChallengeRequest,
  UpdateLessonChallengeRequest,
} from "@repo/shared/courses";

import { challengeApi, challengeKeys } from "../api/challenge.api";

export function useChallenges(query: CourseManagementPageQuery) {
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
    mutationFn: (body: CreateLessonChallengeRequest) =>
      challengeApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}

export function useUpdateChallenge(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonChallengeRequest) =>
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

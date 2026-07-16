import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateLessonChallengeRequest,
  UpdateLessonChallengeRequest,
} from "@repo/shared/courses";

import { courseManagementClient } from "../api/course-management.client";

export const challengeQueryKeys = {
  all: ["challenges"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...challengeQueryKeys.all, "list", query] as const,
  allList: () => [...challengeQueryKeys.all, "all"] as const,
};

export function useChallenges(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: challengeQueryKeys.list(query),
    queryFn: () => courseManagementClient.challenges.listPage(query),
  });
}

export function useAllChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.allList(),
    queryFn: () => courseManagementClient.challenges.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonChallengeRequest) =>
      courseManagementClient.challenges.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

export function useUpdateChallenge(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonChallengeRequest) =>
      courseManagementClient.challenges.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseManagementClient.challenges.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateLessonChallengeOptionRequest,
  UpdateLessonChallengeOptionRequest,
} from "@repo/shared/courses";

import { courseManagementClient } from "../api/course-management.client";

export const challengeOptionQueryKeys = {
  all: ["challenge-options"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...challengeOptionQueryKeys.all, "list", query] as const,
};

export function useChallengeOptions(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: challengeOptionQueryKeys.list(query),
    queryFn: () => courseManagementClient.challengeOptions.listPage(query),
  });
}

export function useCreateChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonChallengeOptionRequest) =>
      courseManagementClient.challengeOptions.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionQueryKeys.all,
      });
    },
  });
}

export function useUpdateChallengeOption(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonChallengeOptionRequest) =>
      courseManagementClient.challengeOptions.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionQueryKeys.all,
      });
    },
  });
}

export function useDeleteChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      courseManagementClient.challengeOptions.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionQueryKeys.all,
      });
    },
  });
}

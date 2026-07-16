import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateLessonChallengeOptionRequest,
  UpdateLessonChallengeOptionRequest,
} from "@repo/shared/courses";

import {
  challengeOptionApi,
  challengeOptionKeys,
} from "../api/challenge-option.api";

export function useChallengeOptions(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: challengeOptionKeys.list(query),
    queryFn: () => challengeOptionApi.listPage(query),
  });
}

export function useCreateChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonChallengeOptionRequest) =>
      challengeOptionApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionKeys.all,
      });
    },
  });
}

export function useUpdateChallengeOption(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonChallengeOptionRequest) =>
      challengeOptionApi.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionKeys.all,
      });
    },
  });
}

export function useDeleteChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => challengeOptionApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: challengeOptionKeys.all,
      });
    },
  });
}

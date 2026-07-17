import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateLessonChallengeOptionPayload,
  LessonChallengeOptionQueryParams,
  UpdateLessonChallengeOptionPayload,
} from "@repo/shared";

import {
  challengeOptionApi,
  challengeOptionKeys,
} from "../api/challenge-option.api";

export function useChallengeOptions(query: LessonChallengeOptionQueryParams) {
  return useQuery({
    queryKey: challengeOptionKeys.list(query),
    queryFn: () => challengeOptionApi.listPage(query),
  });
}

export function useCreateChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonChallengeOptionPayload) =>
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
    mutationFn: (body: UpdateLessonChallengeOptionPayload) =>
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { challengeOptionsService } from "@/src/services/challenge-options/challenge-options.service";
import type { CreateChallengeOptionBody, UpdateChallengeOptionBody, ListChallengeOptionsQuery } from "@/src/services/challenge-options/create-challenge-options.service";

export const challengeOptionQueryKeys = {
  all: ["challenge-options"] as const,
  list: (query: ListChallengeOptionsQuery) => [...challengeOptionQueryKeys.all, "list", query] as const,
};

export function useChallengeOptions(query: ListChallengeOptionsQuery) {
  return useQuery({
    queryKey: challengeOptionQueryKeys.list(query),
    queryFn: () => challengeOptionsService.getChallengeOptions(query),
  });
}

export function useCreateChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChallengeOptionBody) => challengeOptionsService.createChallengeOption(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeOptionQueryKeys.all });
    },
  });
}

export function useUpdateChallengeOption(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChallengeOptionBody) => challengeOptionsService.updateChallengeOption(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeOptionQueryKeys.all });
    },
  });
}

export function useDeleteChallengeOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => challengeOptionsService.deleteChallengeOption(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeOptionQueryKeys.all });
    },
  });
}

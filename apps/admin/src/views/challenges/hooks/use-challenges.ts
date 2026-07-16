import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { challengesService } from "@/src/services/challenges/challenges.service";
import type { CreateChallengeBody, UpdateChallengeBody, ListChallengesQuery } from "@/src/services/challenges/create-challenges.service";

export const challengeQueryKeys = {
  all: ["challenges"] as const,
  list: (query: ListChallengesQuery) => [...challengeQueryKeys.all, "list", query] as const,
  all_list: () => [...challengeQueryKeys.all, "all"] as const,
};

export function useChallenges(query: ListChallengesQuery) {
  return useQuery({
    queryKey: challengeQueryKeys.list(query),
    queryFn: () => challengesService.getChallenges(query),
  });
}

export function useAllChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.all_list(),
    queryFn: () => challengesService.getAllChallenges(),
    staleTime: 60 * 1000,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChallengeBody) => challengesService.createChallenge(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

export function useUpdateChallenge(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChallengeBody) => challengesService.updateChallenge(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => challengesService.deleteChallenge(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all });
    },
  });
}

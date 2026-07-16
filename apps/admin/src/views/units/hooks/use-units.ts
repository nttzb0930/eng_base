import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unitsService } from "@/src/services/units/units.service";
import type { CreateUnitBody, UpdateUnitBody, ListUnitsQuery } from "@/src/services/units/create-units.service";

export const unitQueryKeys = {
  all: ["units"] as const,
  list: (query: ListUnitsQuery) => [...unitQueryKeys.all, "list", query] as const,
  all_list: () => [...unitQueryKeys.all, "all"] as const,
};

export function useUnits(query: ListUnitsQuery) {
  return useQuery({
    queryKey: unitQueryKeys.list(query),
    queryFn: () => unitsService.getUnits(query),
  });
}

export function useAllUnits() {
  return useQuery({
    queryKey: unitQueryKeys.all_list(),
    queryFn: () => unitsService.getAllUnits(),
    staleTime: 60 * 1000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUnitBody) => unitsService.createUnit(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

export function useUpdateUnit(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUnitBody) => unitsService.updateUnit(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unitsService.deleteUnit(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

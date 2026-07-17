import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseUnitQueryParams,
  CreateCourseUnitPayload,
  UpdateCourseUnitPayload,
} from "@repo/shared";

import { unitApi, unitKeys } from "../api/unit.api";

export function useUnits(query: CourseUnitQueryParams) {
  return useQuery({
    queryKey: unitKeys.list(query),
    queryFn: () => unitApi.listPage(query),
  });
}

export function useAllUnits() {
  return useQuery({
    queryKey: unitKeys.allList(),
    queryFn: () => unitApi.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseUnitPayload) => unitApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useUpdateUnit(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseUnitPayload) =>
      unitApi.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unitApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

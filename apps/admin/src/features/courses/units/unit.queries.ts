import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateCourseUnitRequest,
  UpdateCourseUnitRequest,
} from "@repo/shared/courses";

import { courseManagementClient } from "../api/course-management.client";

export const unitQueryKeys = {
  all: ["units"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...unitQueryKeys.all, "list", query] as const,
  allList: () => [...unitQueryKeys.all, "all"] as const,
};

export function useUnits(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: unitQueryKeys.list(query),
    queryFn: () => courseManagementClient.units.listPage(query),
  });
}

export function useAllUnits() {
  return useQuery({
    queryKey: unitQueryKeys.allList(),
    queryFn: () => courseManagementClient.units.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseUnitRequest) =>
      courseManagementClient.units.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

export function useUpdateUnit(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseUnitRequest) =>
      courseManagementClient.units.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseManagementClient.units.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitQueryKeys.all });
    },
  });
}

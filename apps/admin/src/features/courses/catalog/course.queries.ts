import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@repo/shared/courses";

import { courseManagementClient } from "../api/course-management.client";

export const courseQueryKeys = {
  all: ["courses"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...courseQueryKeys.all, "list", query] as const,
  allList: () => [...courseQueryKeys.all, "all"] as const,
};

export function useCourses(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: courseQueryKeys.list(query),
    queryFn: () => courseManagementClient.courses.listPage(query),
  });
}

export function useAllCourses() {
  return useQuery({
    queryKey: courseQueryKeys.allList(),
    queryFn: () => courseManagementClient.courses.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseRequest) =>
      courseManagementClient.courses.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

export function useUpdateCourse(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseRequest) =>
      courseManagementClient.courses.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseManagementClient.courses.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

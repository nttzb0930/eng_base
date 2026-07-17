import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseQueryParams,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "@repo/shared";

import { courseApi, courseKeys } from "../api/course.api";

export function useCourses(query: CourseQueryParams) {
  return useQuery({
    queryKey: courseKeys.list(query),
    queryFn: () => courseApi.listPage(query),
  });
}

export function useAllCourses() {
  return useQuery({
    queryKey: courseKeys.allList(),
    queryFn: () => courseApi.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCoursePayload) => courseApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useUpdateCourse(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCoursePayload) => courseApi.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

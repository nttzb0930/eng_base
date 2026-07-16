import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@repo/shared/courses";

import { courseApi, courseKeys } from "../api/course.api";

export function useCourses(query: CourseManagementPageQuery) {
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
    mutationFn: (body: CreateCourseRequest) => courseApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useUpdateCourse(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseRequest) => courseApi.update(id ?? 0, body),
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

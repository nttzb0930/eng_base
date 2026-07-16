import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseManagementPageQuery,
  CreateCourseLessonRequest,
  UpdateCourseLessonRequest,
} from "@repo/shared/courses";

import { courseManagementClient } from "../api/course-management.client";

export const lessonQueryKeys = {
  all: ["lessons"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...lessonQueryKeys.all, "list", query] as const,
  allList: () => [...lessonQueryKeys.all, "all"] as const,
};

export function useLessons(query: CourseManagementPageQuery) {
  return useQuery({
    queryKey: lessonQueryKeys.list(query),
    queryFn: () => courseManagementClient.lessons.listPage(query),
  });
}

export function useAllLessons() {
  return useQuery({
    queryKey: lessonQueryKeys.allList(),
    queryFn: () => courseManagementClient.lessons.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseLessonRequest) =>
      courseManagementClient.lessons.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

export function useUpdateLesson(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseLessonRequest) =>
      courseManagementClient.lessons.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseManagementClient.lessons.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CourseLessonQueryParams,
  CreateCourseLessonPayload,
  UpdateCourseLessonPayload,
} from "@repo/shared";

import { lessonApi, lessonKeys } from "../api/lesson.api";

export function useLessons(query: CourseLessonQueryParams) {
  return useQuery({
    queryKey: lessonKeys.list(query),
    queryFn: () => lessonApi.listPage(query),
  });
}

export function useAllLessons() {
  return useQuery({
    queryKey: lessonKeys.allList(),
    queryFn: () => lessonApi.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseLessonPayload) => lessonApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
}

export function useUpdateLesson(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseLessonPayload) =>
      lessonApi.update(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lessonApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
}

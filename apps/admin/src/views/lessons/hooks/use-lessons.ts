import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonsService } from "@/src/services/lessons/lessons.service";
import type { CreateLessonBody, UpdateLessonBody, ListLessonsQuery } from "@/src/services/lessons/create-lessons.service";

export const lessonQueryKeys = {
  all: ["lessons"] as const,
  list: (query: ListLessonsQuery) => [...lessonQueryKeys.all, "list", query] as const,
  all_list: () => [...lessonQueryKeys.all, "all"] as const,
};

export function useLessons(query: ListLessonsQuery) {
  return useQuery({
    queryKey: lessonQueryKeys.list(query),
    queryFn: () => lessonsService.getLessons(query),
  });
}

export function useAllLessons() {
  return useQuery({
    queryKey: lessonQueryKeys.all_list(),
    queryFn: () => lessonsService.getAllLessons(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLessonBody) => lessonsService.createLesson(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

export function useUpdateLesson(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLessonBody) => lessonsService.updateLesson(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lessonsService.deleteLesson(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.all });
    },
  });
}

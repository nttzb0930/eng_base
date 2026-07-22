"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { courseKeys } from "@/app/features/courses/hooks/use-courses";

import { progressApi } from "../api/progress.api";

export const progressKeys = {
  all: ["progress"] as const,
  user: ["progress", "user"] as const,
  course: ["progress", "course"] as const,
  lessonPercentage: ["progress", "lesson-percentage"] as const,
};

export function useUserProgress(enabled = true) {
  return useQuery({
    queryKey: progressKeys.user,
    queryFn: progressApi.getUserProgress,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourseProgress(enabled = true) {
  return useQuery({
    queryKey: progressKeys.course,
    queryFn: progressApi.getCourseProgress,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLessonPercentage(enabled = true) {
  return useQuery({
    queryKey: progressKeys.lessonPercentage,
    queryFn: progressApi.getLessonPercentage,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSelectCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => progressApi.selectCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

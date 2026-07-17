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
  });
}

export function useCourseProgress(enabled = true) {
  return useQuery({
    queryKey: progressKeys.course,
    queryFn: progressApi.getCourseProgress,
    enabled,
  });
}

export function useLessonPercentage(enabled = true) {
  return useQuery({
    queryKey: progressKeys.lessonPercentage,
    queryFn: progressApi.getLessonPercentage,
    enabled,
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coursesService } from "@/src/services/courses/courses.service";
import type { CreateCourseBody, UpdateCourseBody, ListCoursesQuery } from "@/src/services/courses/create-courses.service";

export const courseQueryKeys = {
  all: ["courses"] as const,
  list: (query: ListCoursesQuery) => [...courseQueryKeys.all, "list", query] as const,
  all_list: () => [...courseQueryKeys.all, "all"] as const,
};

export function useCourses(query: ListCoursesQuery) {
  return useQuery({
    queryKey: courseQueryKeys.list(query),
    queryFn: () => coursesService.getCourses(query),
  });
}

export function useAllCourses() {
  return useQuery({
    queryKey: courseQueryKeys.all_list(),
    queryFn: () => coursesService.getAllCourses(),
    staleTime: 60 * 1000,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourseBody) => coursesService.createCourse(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

export function useUpdateCourse(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCourseBody) => coursesService.updateCourse(id ?? 0, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => coursesService.deleteCourse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKeys.all });
    },
  });
}

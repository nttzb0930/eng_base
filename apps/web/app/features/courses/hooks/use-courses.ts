"use client";

import { useQuery } from "@tanstack/react-query";

import { courseApi } from "../api/course.api";

export const courseKeys = {
  all: ["courses"] as const,
  detail: (id: number) => ["courses", id] as const,
};

export function useCourses() {
  return useQuery({
    queryKey: courseKeys.all,
    queryFn: courseApi.list,
  });
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => courseApi.detail(id),
  });
}

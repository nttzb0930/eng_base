"use client";

import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "../api/dashboard.api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: dashboardApi.get,
  });
}

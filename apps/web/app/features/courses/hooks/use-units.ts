"use client";

import { useQuery } from "@tanstack/react-query";

import { unitApi } from "../api/unit.api";

export const unitKeys = {
  all: ["units"] as const,
};

export function useUnits() {
  return useQuery({
    queryKey: unitKeys.all,
    queryFn: unitApi.list,
  });
}

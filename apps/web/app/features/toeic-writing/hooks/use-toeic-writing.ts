"use client";

import { useQuery } from "@tanstack/react-query";
import type { ToeicWritingPart } from "@repo/shared";

import { toeicWritingApi, toeicWritingKeys } from "../api/toeic-writing.api";

export function useToeicWritingOverview() {
  return useQuery({
    queryKey: toeicWritingKeys.overview(),
    queryFn: () => toeicWritingApi.overview(),
  });
}

export function useToeicWritingTasks(part: ToeicWritingPart) {
  return useQuery({
    queryKey: toeicWritingKeys.tasks(part),
    queryFn: () => toeicWritingApi.tasks(part),
    placeholderData: (previousData) => previousData,
  });
}

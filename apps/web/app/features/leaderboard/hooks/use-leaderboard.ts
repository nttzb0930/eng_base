"use client";

import { useQuery } from "@tanstack/react-query";

import { leaderboardApi } from "../api/leaderboard.api";

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
};

export function useLeaderboard() {
  return useQuery({
    queryKey: leaderboardKeys.all,
    queryFn: leaderboardApi.list,
  });
}

"use client";

import type { LeaderboardPeriod } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";

import { leaderboardApi } from "../api/leaderboard.api";

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  list: (period: LeaderboardPeriod) => ["leaderboard", period] as const,
};

export function useLeaderboard(period: LeaderboardPeriod = "weekly") {
  return useQuery({
    queryKey: leaderboardKeys.list(period),
    queryFn: () => leaderboardApi.list(period),
  });
}


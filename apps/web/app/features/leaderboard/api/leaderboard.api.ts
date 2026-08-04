import type { LeaderboardPeriod, LeaderboardResponse, LeaderboardUser } from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type LeaderboardHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createLeaderboardApi(http: LeaderboardHttp) {
  return {
    async list(period?: LeaderboardPeriod): Promise<LeaderboardResponse | LeaderboardUser[]> {
      const path = period ? `/leaderboard?period=${period}` : "/leaderboard";
      const res = await http.get<LeaderboardResponse | LeaderboardUser[]>(path);
      return res.data;
    },
  };
}

export const leaderboardApi = createLeaderboardApi(webHttpClient);


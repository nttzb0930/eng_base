import type { LeaderboardUser } from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type LeaderboardHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createLeaderboardApi(http: LeaderboardHttp) {
  return {
    async list() {
      return (await http.get<LeaderboardUser[]>("/leaderboard")).data;
    },
  };
}

export const leaderboardApi = createLeaderboardApi(webHttpClient);

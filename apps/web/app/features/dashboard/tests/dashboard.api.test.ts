import assert from "node:assert/strict";
import test from "node:test";

import { createDashboardApi } from "../api/dashboard.api";
import { createLeaderboardApi } from "@/app/features/leaderboard/api/leaderboard.api";

test("Dashboard and Leaderboard resources preserve read routes", async () => {
  const requests: unknown[] = [];
  const http = {
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      const data =
        path === "/leaderboard"
          ? [{ userId: "u1" }]
          : {
              overview: {},
              streak: {
                currentStreak: 3,
                longestStreak: 5,
                lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
                timeZone: "UTC",
              },
            };
      return { data: data as T };
    },
  };
  const dashboardApi = createDashboardApi(http);
  const leaderboardApi = createLeaderboardApi(http);

  const dashboard = await dashboardApi.get();
  const leaderboard = await leaderboardApi.list();

  assert.deepEqual(requests, [
    { method: "GET", path: "/dashboard" },
    { method: "GET", path: "/leaderboard" },
  ]);
  assert.deepEqual(dashboard, {
    overview: {},
    streak: {
      currentStreak: 3,
      longestStreak: 5,
      lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
      timeZone: "UTC",
    },
  });
  assert.deepEqual(leaderboard, [{ userId: "u1" }]);
});

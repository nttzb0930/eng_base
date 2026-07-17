import assert from "node:assert/strict";
import test from "node:test";

import { createReviewApi } from "../api/review.api";

test("Review resources preserve daily and saved routes", async () => {
  const requests: unknown[] = [];
  const api = createReviewApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
  });

  await api.getDailySummary();
  await api.listDailyChallenges();
  await api.getSavedSummary();
  await api.listSavedChallenges("due");

  assert.deepEqual(requests, [
    { method: "GET", path: "/review/daily/summary" },
    { method: "GET", path: "/review/daily/challenges" },
    { method: "GET", path: "/review/saved/summary" },
    { method: "GET", path: "/review/saved/challenges?mode=due" },
  ]);
});

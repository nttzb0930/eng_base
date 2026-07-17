import assert from "node:assert/strict";
import test from "node:test";

import { createReviewApi } from "../api/review.api";

test("Review summary resource preserves daily summary route", async () => {
  const requests: unknown[] = [];
  const api = createReviewApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: { total: 4, due: 3, weak: 2, saved: 1 } as T };
    },
  });

  const summary = await api.getDailySummary();

  assert.deepEqual(requests, [
    { method: "GET", path: "/review/daily/summary" },
  ]);
  assert.deepEqual(summary, { total: 4, due: 3, weak: 2, saved: 1 });
});

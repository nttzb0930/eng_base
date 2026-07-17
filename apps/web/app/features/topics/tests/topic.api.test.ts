import assert from "node:assert/strict";
import test from "node:test";

import { createTopicApi } from "../api/topic.api";

test("Topic resource preserves list and detail routes", async () => {
  const requests: unknown[] = [];
  const api = createTopicApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: null as T };
    },
  });

  await api.list();
  await api.detail("travel", "A1");

  assert.deepEqual(requests, [
    { method: "GET", path: "/topics" },
    { method: "GET", path: "/topics/travel?level=A1" },
  ]);
});

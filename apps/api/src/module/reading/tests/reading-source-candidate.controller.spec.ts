import assert from "node:assert/strict";
import test from "node:test";

import { AdminReadingSourceCandidatesController } from "../admin-reading-source-candidates.controller";

test("candidate controller delegates exact list, detail, convert, and reject inputs", async () => {
  const calls: unknown[] = [];
  const controller = new AdminReadingSourceCandidatesController(
    { execute: (query: unknown) => { calls.push(["list", query]); } } as never,
    { execute: (id: number) => { calls.push(["get", id]); } } as never,
    { execute: (id: number, body: unknown) => { calls.push(["convert", id, body]); } } as never,
    { execute: (id: number, body: unknown) => { calls.push(["reject", id, body]); } } as never,
  );
  const query = { page: 1, limit: 20, status: "PENDING" as const };
  const convert = {
    slug: "office",
    title: "Office",
    body: "Body",
    cefrLevel: "A1" as const,
    topicId: null,
    estimatedMinutes: 2,
    questions: [],
  };
  controller.list(query);
  controller.get(7);
  controller.convert(7, convert);
  controller.reject(7, { reason: "Duplicate" });
  assert.deepEqual(calls, [
    ["list", query],
    ["get", 7],
    ["convert", 7, convert],
    ["reject", 7, { reason: "Duplicate" }],
  ]);
});

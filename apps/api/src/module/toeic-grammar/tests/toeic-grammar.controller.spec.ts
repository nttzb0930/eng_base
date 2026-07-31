import assert from "node:assert/strict";
import test from "node:test";

import { ToeicGrammarController } from "../toeic-grammar.controller";

test("Grammar controller forwards authenticated learner goals", async () => {
  const calls: unknown[] = [];
  const catalog = {
    execute: (userId: string) => calls.push(["catalog", userId]),
  };
  const practice = {
    execute: (userId: string, mode: string, target: string) =>
      calls.push(["practice", userId, mode, target]),
  };
  const answer = {
    execute: (userId: string, body: unknown) =>
      calls.push(["answer", userId, body]),
  };
  const controller = new ToeicGrammarController(
    catalog as never,
    practice as never,
    answer as never
  );
  const body = {
    submissionKey: "00000000-0000-4000-8000-000000000001",
    snapshotVersion: "a".repeat(64),
    mode: "level" as const,
    target: "1",
    questionId: 1,
    selectedOptionId: 2,
  };

  await controller.catalog("user-1");
  await controller.practice("user-1", { mode: "level", target: "1" });
  await controller.submit("user-1", body);

  assert.deepEqual(calls, [
    ["catalog", "user-1"],
    ["practice", "user-1", "level", "1"],
    ["answer", "user-1", body],
  ]);
  assert.equal(
    Reflect.getMetadata("path", ToeicGrammarController),
    "toeic/grammar"
  );
});

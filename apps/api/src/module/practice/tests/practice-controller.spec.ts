import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";

import { PracticeController } from "../practice.controller";

test("Practice exposes and delegates Topic challenge delivery", async () => {
  const calls: unknown[][] = [];
  const unusedGoal = {} as never;
  const topicChallenges = {
    execute: async (...args: unknown[]) => {
      calls.push(args);
      return [];
    },
  };
  const controller = new PracticeController(
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    topicChallenges as never,
    unusedGoal,
  );

  const handler = (
    PracticeController.prototype as PracticeController & {
      getTopicChallenges: (
        userId: string,
        slug: string,
        query: { mode: "weak" },
      ) => Promise<unknown>;
    }
  ).getTopicChallenges;

  assert.equal(
    Reflect.getMetadata(PATH_METADATA, handler),
    "topics/:slug/challenges",
  );
  assert.equal(Reflect.getMetadata(METHOD_METADATA, handler), RequestMethod.GET);
  assert.deepEqual(
    await handler.call(controller, "user-1", "travel", { mode: "weak" }),
    [],
  );
  assert.deepEqual(calls, [["user-1", "travel", "weak"]]);
});

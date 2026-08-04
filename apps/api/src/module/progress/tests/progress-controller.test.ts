import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";

import { ProgressController } from "../progress.controller";

test("Progress exposes the authenticated CEFR level summary", async () => {
  const calls: string[] = [];
  const cefrGoal = {
    execute: async (userId: string) => {
      calls.push(userId);
      return { totalWords: 0, levels: [] };
    },
  };
  const unusedGoal = {} as never;
  const controller = new ProgressController(
    unusedGoal,
    unusedGoal,
    unusedGoal,
    cefrGoal as never,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal,
    unusedGoal
  );

  const handler = ProgressController.prototype.getCefrLevels;
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), "cefr-levels");
  assert.equal(
    Reflect.getMetadata(METHOD_METADATA, handler),
    RequestMethod.GET
  );
  assert.deepEqual(await controller.getCefrLevels("user-1"), {
    totalWords: 0,
    levels: [],
  });
  assert.deepEqual(calls, ["user-1"]);
});

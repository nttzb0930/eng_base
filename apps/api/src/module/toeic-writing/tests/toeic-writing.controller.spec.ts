import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";

import { UserJwtGuard } from "../../../common/guards/user-jwt.guard";
import { ToeicWritingController } from "../toeic-writing.controller";

test("TOEIC Writing controller exposes authenticated read routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, ToeicWritingController),
    "toeic/writing"
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ToeicWritingController
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));

  const routes = Object.getOwnPropertyNames(ToeicWritingController.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ToeicWritingController.prototype,
        property
      )?.value as unknown;
      if (typeof handler !== "function") return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        | string
        | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        | RequestMethod
        | undefined;
      if (path === undefined || method === undefined) return [];
      return [`${RequestMethod[method]} ${path}`];
    })
    .sort();

  assert.deepEqual(routes, ["GET overview", "GET tasks", "GET tasks/:taskId"]);
});

test("controller forwards current learner, selected part, and task id", async () => {
  const calls: unknown[][] = [];
  const controller = new ToeicWritingController(
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never
  );

  await controller.overview("learner-1");
  await controller.tasks("learner-1", { part: 2 });
  await controller.task("learner-1", 21);

  assert.deepEqual(calls, [
    ["learner-1"],
    ["learner-1", 2],
    ["learner-1", 21],
  ]);
});

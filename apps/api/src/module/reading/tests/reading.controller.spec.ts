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
import { ReadingController } from "../reading.controller";

test("Reading controller exposes guarded learner read routes", () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, ReadingController), "reading");
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ReadingController,
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));

  const routes = Object.getOwnPropertyNames(ReadingController.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ReadingController.prototype,
        property,
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

  assert.deepEqual(routes, [
    "GET attempts",
    "GET attempts/:attemptId",
    "GET passages",
    "GET passages/:slug",
    "POST passages/:passageId/attempts",
  ]);
});

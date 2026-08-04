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
import { ToeicDictationController } from "../toeic-dictation.controller";

test("TOEIC Dictation controller exposes authenticated learner routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, ToeicDictationController),
    "toeic/dictation",
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ToeicDictationController,
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));

  const routes = Object.getOwnPropertyNames(ToeicDictationController.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ToeicDictationController.prototype,
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
    "GET items/:itemId/check",
    "GET items/:itemId/full",
    "GET overview",
    "GET sets",
    "GET sets/:setId/items",
    "GET sets/:setId/progress",
    "POST items/:itemId/submit",
  ]);
});

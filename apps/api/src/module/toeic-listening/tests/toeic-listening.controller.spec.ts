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
import { ToeicListeningController } from "../toeic-listening.controller";

test("TOEIC Listening controller exposes guarded learner read routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, ToeicListeningController),
    "toeic/listening"
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ToeicListeningController
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));

  const routes = Object.getOwnPropertyNames(ToeicListeningController.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ToeicListeningController.prototype,
        property
      )?.value as unknown;
      if (typeof handler !== "function") return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];
      return [`${RequestMethod[method]} ${path}`];
    })
    .sort();

  assert.deepEqual(routes, [
    "DELETE tests/:testId/draft",
    "GET attempts",
    "GET attempts/:attemptId",
    "GET overview",
    "GET tests",
    "GET tests/:testId",
    "GET tests/:testId/draft",
    "POST attempts",
    "POST tests/:testId/check-answer",
    "PUT tests/:testId/draft",
  ]);
});

test("TOEIC Listening controller forwards selected Parts", async () => {
  const calls: unknown[][] = [];
  const controller = new ToeicListeningController(
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never
  );

  await controller.overview();
  await controller.tests("user-1", { part: 2 });
  await controller.test(11, { part: 4 });
  await controller.checkAnswer(11, {
    listeningSourceVersion: "a".repeat(64),
    practicePart: 4,
    questionId: 31,
    optionId: 42,
  });
  await controller.attempts("user-1", { part: 2 });
  await controller.attempt("user-1", 7);

  assert.deepEqual(calls, [
    [],
    ["user-1", 2],
    [11, 4],
    [
      11,
      {
        listeningSourceVersion: "a".repeat(64),
        practicePart: 4,
        questionId: 31,
        optionId: 42,
      },
    ],
    ["user-1", 2],
    ["user-1", 7],
  ]);
});

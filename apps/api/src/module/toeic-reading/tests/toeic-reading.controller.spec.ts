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
import { ToeicReadingController } from "../toeic-reading.controller";

test("TOEIC Reading controller exposes guarded learner routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, ToeicReadingController),
    "toeic/reading"
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ToeicReadingController
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));

  const routes = Object.getOwnPropertyNames(ToeicReadingController.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ToeicReadingController.prototype,
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
    "PUT tests/:testId/draft",
  ]);
});

test("TOEIC Reading controller forwards the selected Part to learner reads", async () => {
  const calls: unknown[][] = [];
  const controller = new ToeicReadingController(
    {} as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    {} as never,
    {} as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never
  );
  const scoped = controller as unknown as {
    tests(userId: string, query: { part?: 5 | 6 | 7 }): Promise<unknown>;
    test(testId: number, query: { part?: 5 | 6 | 7 }): Promise<unknown>;
    attempts(userId: string, query: { part?: 5 | 6 | 7 }): Promise<unknown>;
    draft(
      userId: string,
      testId: number,
      query: { part?: 5 | 6 | 7 }
    ): Promise<unknown>;
    saveDraft(
      userId: string,
      testId: number,
      body: { practicePart?: 5 | 6 | 7 }
    ): Promise<unknown>;
    deleteDraft(
      userId: string,
      testId: number,
      query: { part?: 5 | 6 | 7 }
    ): Promise<unknown>;
  };

  await scoped.tests("learner-1", { part: 5 });
  await scoped.test(11, { part: 6 });
  await scoped.attempts("learner-1", { part: 7 });
  await scoped.draft("learner-1", 11, { part: 5 });
  await scoped.saveDraft("learner-1", 11, { practicePart: 6 });
  await scoped.deleteDraft("learner-1", 11, { part: 7 });

  assert.deepEqual(calls, [
    ["learner-1", 5],
    [11, 6],
    ["learner-1", 7],
    ["learner-1", 11, 5],
    ["learner-1", 11, { practicePart: 6 }],
    ["learner-1", 11, 7],
  ]);
});

import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { AdminJwtGuard } from "../../../common/guards/admin-jwt.guard";
import { AdminReadingController } from "../admin-reading.controller";
import {
  ReadingPassageCreateDto,
  ReadingPassageUpdateDto,
} from "../dto/reading.dto";

const validBody = {
  slug: "a-day-in-hanoi",
  title: "A Day in Hanoi",
  body: "Mia lives in Hanoi.",
  cefrLevel: "A1",
  topicId: null,
  estimatedMinutes: 3,
  questions: [
    {
      prompt: "Where does Mia live?",
      order: 1,
      options: [
        { text: "In Hanoi", order: 1, correct: true },
        { text: "In London", order: 2, correct: false },
      ],
    },
  ],
};

test("Admin Reading DTO validates nested A1 content and immutable update slug", async () => {
  const valid = plainToInstance(ReadingPassageCreateDto, validBody);
  assert.deepEqual(await validate(valid), []);

  const invalid = plainToInstance(ReadingPassageCreateDto, {
    ...validBody,
    cefrLevel: "A2",
    questions: [{ ...validBody.questions[0], options: [{ text: "", order: 0 }] }],
  });
  assert.ok((await validate(invalid)).length > 0);

  const update = new ReadingPassageUpdateDto();
  assert.equal("slug" in update, false);
});

test("Admin Reading controller exposes guarded authoring routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, AdminReadingController),
    "admin/reading-passages",
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    AdminReadingController,
  ) as unknown[];
  assert.ok(guards.includes(AdminJwtGuard));

  const routes = Object.getOwnPropertyNames(
    AdminReadingController.prototype,
  )
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        AdminReadingController.prototype,
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
      return [`${RequestMethod[method]} ${path || "/"}`];
    })
    .sort();

  assert.deepEqual(routes, [
    "GET /",
    "GET :id",
    "GET topic-options",
    "POST /",
    "POST :id/publish",
    "POST :id/unpublish",
    "PUT :id",
  ]);
});

test("Admin Reading controller forwards exact arguments to goals", async () => {
  const calls: unknown[][] = [];
  const goal = {
    execute: (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve(args);
    },
  };
  const controller = new AdminReadingController(
    goal as never,
    goal as never,
    goal as never,
    goal as never,
    goal as never,
    goal as never,
    goal as never,
  );
  const createBody = plainToInstance(ReadingPassageCreateDto, validBody);
  const updateBody = plainToInstance(ReadingPassageUpdateDto, validBody);

  await controller.list();
  await controller.topicOptions();
  await controller.get(3);
  await controller.create(createBody);
  await controller.update(3, updateBody);
  await controller.publish(3);
  await controller.unpublish(3);

  assert.deepEqual(calls, [
    [],
    [],
    [3],
    [createBody],
    [3, updateBody],
    [3],
    [3],
  ]);
});

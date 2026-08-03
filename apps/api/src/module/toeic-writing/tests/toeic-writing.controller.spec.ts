import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";

import { UserJwtGuard } from "../../../common/guards/user-jwt.guard";
import {
  ToeicWritingAssistanceKind,
  ToeicWritingCoachingParamsDto,
  ToeicWritingCoachingQueryDto,
  ToeicWritingCommunityQueryDto,
} from "../dto/toeic-writing.dto";
import { ToeicWritingController } from "../toeic-writing.controller";

const version = "a".repeat(64);

test("coaching route accepts only Part 2 panel kinds and SHA-256 versions", () => {
  const params = plainToInstance(ToeicWritingCoachingParamsDto, {
    taskId: "22",
    kind: "OUTLINE",
  });
  const query = plainToInstance(ToeicWritingCoachingQueryDto, {
    contentVersion: version,
  });
  assert.equal(validateSync(params).length, 0);
  assert.equal(validateSync(query).length, 0);

  const restore = plainToInstance(ToeicWritingCoachingParamsDto, {
    taskId: "22",
    kind: "COMMUNITY_RESTORE",
  });
  const staleShape = plainToInstance(ToeicWritingCoachingQueryDto, {
    contentVersion: "not-a-sha",
  });
  assert.ok(validateSync(restore).length > 0);
  assert.ok(validateSync(staleShape).length > 0);
});

test("community pagination accepts positive cursors and caps pages at 20", () => {
  const valid = plainToInstance(ToeicWritingCommunityQueryDto, {
    cursor: "31",
    limit: "20",
  });
  const invalid = plainToInstance(ToeicWritingCommunityQueryDto, {
    cursor: "0",
    limit: "21",
  });

  assert.equal(validateSync(valid).length, 0);
  assert.ok(validateSync(invalid).length > 0);
});

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
        string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];
      return [`${RequestMethod[method]} ${path}`];
    })
    .sort();

  assert.deepEqual(routes, [
    "DELETE submissions/:submissionId/share",
    "DELETE tasks/:taskId/draft",
    "GET ai-quota",
    "GET grades/:gradeId",
    "GET overview",
    "GET submissions/:submissionId",
    "GET tasks",
    "GET tasks/:taskId",
    "GET tasks/:taskId/coaching/:kind",
    "GET tasks/:taskId/community",
    "GET tasks/:taskId/draft",
    "GET tasks/:taskId/grades",
    "POST tasks/:taskId/assistance/:kind",
    "POST tasks/:taskId/community/:submissionId/restore",
    "POST tasks/:taskId/grades/part-one",
    "POST tasks/:taskId/submissions",
    "PUT submissions/:submissionId/share",
    "PUT tasks/:taskId/draft",
  ]);
});

test("controller forwards current learner, selected part, and task id", async () => {
  const calls: unknown[][] = [];
  const controller = new ToeicWritingController(
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
    { execute: (...args: unknown[]) => calls.push(args) } as never,
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

  await controller.overview("learner-1");
  await controller.tasks("learner-1", { part: 2 });
  await controller.task("learner-1", 21);
  await controller.draft("learner-1", 21);
  await controller.saveDraft("learner-1", 21, {
    contentVersion: version,
    responseText: "answer",
  });
  await controller.deleteDraft("learner-1", 21);
  await controller.submit("learner-1", 21, {
    submissionKey: "00000000-0000-4000-8000-000000000001",
    contentVersion: version,
    responseText: "answer",
  });
  await controller.submission("learner-1", 31);
  await controller.gradeWritingPartOne("learner-1", 21, {
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    contentVersion: version,
    responseText: "The woman is preparing food.",
    locale: "en",
  });
  await controller.writingQuota("learner-1");
  await controller.grade("learner-1", 41);
  await controller.grades("learner-1", 21, { cursor: 40, limit: 10 });
  await controller.coaching(
    "learner-1",
    { taskId: 21, kind: "OUTLINE" },
    { contentVersion: version }
  );
  await controller.recordAssistance(
    "learner-1",
    21,
    ToeicWritingAssistanceKind.SAMPLE,
    {
      contentVersion: version,
    }
  );
  await controller.shareSubmission("learner-1", 31);
  await controller.unshareSubmission("learner-1", 31);
  await controller.community("learner-1", 21, { cursor: 30, limit: 10 });
  await controller.restoreCommunityResponse("learner-1", 21, 31, {
    contentVersion: version,
  });

  assert.deepEqual(calls, [
    ["learner-1"],
    ["learner-1", 2],
    ["learner-1", 21],
    ["learner-1", 21],
    ["learner-1", 21, { contentVersion: version, responseText: "answer" }],
    ["learner-1", 21],
    [
      "learner-1",
      21,
      {
        submissionKey: "00000000-0000-4000-8000-000000000001",
        contentVersion: version,
        responseText: "answer",
      },
    ],
    ["learner-1", 31],
    [
      "learner-1",
      21,
      {
        idempotencyKey: "00000000-0000-4000-8000-000000000002",
        contentVersion: version,
        responseText: "The woman is preparing food.",
        locale: "en",
      },
    ],
    ["learner-1"],
    ["learner-1", 41],
    ["learner-1", 21, 40, 10],
    ["learner-1", 21, "OUTLINE", version],
    ["learner-1", 21, version, "SAMPLE"],
    ["learner-1", 31],
    ["learner-1", 31],
    [21, 30, 10],
    ["learner-1", 21, 31, version],
  ]);
});

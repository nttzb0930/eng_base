import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicWritingOverviewUseCase } from "../use-cases/get-toeic-writing-overview.use-case";
import { GetToeicWritingTaskUseCase } from "../use-cases/get-toeic-writing-task.use-case";
import { ListToeicWritingTasksUseCase } from "../use-cases/list-toeic-writing-tasks.use-case";

const version = "a".repeat(64);
const contentChecksum = "c".repeat(64);

function partOneTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    part: 1,
    order_index: 1,
    title: "Write a sentence about the picture",
    difficulty: "EASY",
    source_version: version,
    content_sha256: contentChecksum,
    instructions_en: "Use both required words.",
    instructions_vi: "Sử dụng cả hai từ bắt buộc.",
    payload: {
      requiredWords: [
        { en: "woman", vi: "người phụ nữ" },
        { en: "phone", vi: "điện thoại" },
      ],
      pattern: "The woman is holding a phone.",
      structureSuggestions: ["Subject + be + verb-ing"],
      ideas: ["Describe the main action"],
      samplesEn: ["A woman is holding a phone."],
      samplesVi: ["Một người phụ nữ đang cầm điện thoại."],
    },
    image_storage_path: "writing/task-11/image.jpg",
    image_sha256: "b".repeat(64),
    image_bytes: 10,
    image_content_type: "image/jpeg",
    drafts: [],
    submissions: [],
    ...overrides,
  };
}

function partTwoTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 21,
    part: 2,
    order_index: 1,
    title: "Printer paper jam complaint",
    difficulty: "MEDIUM",
    source_version: version,
    content_sha256: contentChecksum,
    instructions_en: "Read the email and write a response.",
    instructions_vi: null,
    payload: {
      titleVi: "Khiếu nại máy in bị kẹt giấy",
      promptEn: "The printer is not working.",
      promptVi: "Máy in không hoạt động.",
      requirements: [
        { order: 1, textEn: "Explain the problem.", textVi: null },
      ],
      outlineLevel1: [],
      outlineLevel2: [],
      chunksLevel1: [],
      chunksLevel2: [],
      sampleEn: "I am writing about the printer.",
      sampleVi: null,
    },
    image_storage_path: null,
    image_sha256: null,
    image_bytes: null,
    image_content_type: null,
    drafts: [],
    submissions: [],
    ...overrides,
  };
}

test("overview counts only published tasks and current learner submissions", async () => {
  let taskQuery: unknown;
  let submissionQuery: unknown;
  const prisma = {
    toeic_writing_tasks: {
      findMany: (query: unknown) => {
        taskQuery = query;
        return Promise.resolve([
          { id: 11, part: 1 },
          { id: 12, part: 1 },
          { id: 21, part: 2 },
        ]);
      },
    },
    toeic_writing_submissions: {
      findMany: (query: unknown) => {
        submissionQuery = query;
        return Promise.resolve([{ task_id: 11 }, { task_id: 21 }]);
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicWritingOverviewUseCase(prisma).execute(
    "learner-1"
  );

  assert.deepEqual(result, {
    publishedTaskCount: 3,
    submittedTaskCount: 2,
    parts: [
      { part: 1, publishedTaskCount: 2, submittedTaskCount: 1 },
      { part: 2, publishedTaskCount: 1, submittedTaskCount: 1 },
    ],
  });
  assert.deepEqual((taskQuery as { where: unknown }).where, {
    status: "PUBLISHED",
  });
  assert.deepEqual((submissionQuery as { where: unknown }).where, {
    user_id: "learner-1",
    task: { status: "PUBLISHED" },
  });
});

test("Part 1 task list exposes preview words and pattern without a display title", async () => {
  let query: unknown;
  const prisma = {
    toeic_writing_tasks: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve([
          partOneTask({
            drafts: [{ id: 301 }],
            submissions: [{ id: 401 }],
          }),
        ]);
      },
    },
  } as unknown as PrismaService;

  const result = await new ListToeicWritingTasksUseCase(prisma).execute(
    "learner-1",
    1
  );

  assert.deepEqual(result, [
    {
      id: 11,
      part: 1,
      order: 1,
      difficulty: "EASY",
      contentVersion: version,
      submitted: true,
      hasDraft: true,
      requiredWords: [
        { en: "woman", vi: "người phụ nữ" },
        { en: "phone", vi: "điện thoại" },
      ],
      pattern: "The woman is holding a phone.",
    },
  ]);
  assert.deepEqual((query as { where: unknown }).where, {
    status: "PUBLISHED",
    part: 1,
  });
  assert.deepEqual(
    (
      query as {
        select: {
          drafts: { where: unknown };
          submissions: { where: unknown };
        };
      }
    ).select.drafts.where,
    { user_id: "learner-1" }
  );
  assert.equal(
    (query as { select: { payload?: boolean } }).select.payload,
    true
  );
  assert.equal(
    "image_storage_path" in (query as { select: object }).select,
    false
  );
});

test("Part 2 task list exposes English and Vietnamese email titles", async () => {
  const prisma = {
    toeic_writing_tasks: {
      findMany: () => Promise.resolve([partTwoTask()]),
    },
  } as unknown as PrismaService;

  const result = await new ListToeicWritingTasksUseCase(prisma).execute(
    "learner-1",
    2
  );

  assert.deepEqual(result, [
    {
      id: 21,
      part: 2,
      order: 1,
      title: "Printer paper jam complaint",
      titleVi: "Khiếu nại máy in bị kẹt giấy",
      difficulty: "MEDIUM",
      contentVersion: version,
      submitted: false,
      hasDraft: false,
    },
  ]);
});

test("task detail exposes the source version used by draft conflict checks", async () => {
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve(partOneTask()),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicWritingTaskUseCase(prisma).execute(
    "learner-1",
    11
  );

  assert.equal(result.contentVersion, version);
  assert.notEqual(result.contentVersion, contentChecksum);
});

test("task detail omits Part 1 reference fields before submission", async () => {
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve(partOneTask()),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicWritingTaskUseCase(prisma).execute(
    "learner-1",
    11
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.part, 1);
  assert.equal("reference" in result, false);
  assert.equal(serialized.includes("samplesEn"), false);
  assert.equal(serialized.includes("structureSuggestions"), false);
  assert.equal(serialized.includes("ideas"), false);
  assert.deepEqual(result.exercise, {
    imageUrl: "/api/toeic/writing/tasks/11/image",
    instructionsEn: "Use both required words.",
    instructionsVi: "Sử dụng cả hai từ bắt buộc.",
    requiredWords: [
      { en: "woman", vi: "người phụ nữ" },
      { en: "phone", vi: "điện thoại" },
    ],
  });
});

test("unpublished task returns WRITING_TASK_NOT_FOUND", async () => {
  let query: unknown;
  const prisma = {
    toeic_writing_tasks: {
      findFirst: (args: unknown) => {
        query = args;
        return Promise.resolve(null);
      },
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new GetToeicWritingTaskUseCase(prisma).execute("learner-1", 99),
    (error: unknown) => {
      const response = (
        error as { getResponse(): { statusCode: number; code: string } }
      ).getResponse();
      return response.statusCode === 404 && response.code === "WRITING_TASK_NOT_FOUND";
    }
  );
  assert.deepEqual((query as { where: unknown }).where, {
    id: 99,
    status: "PUBLISHED",
  });
});

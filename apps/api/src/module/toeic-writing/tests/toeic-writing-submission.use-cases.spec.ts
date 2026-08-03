import assert from "node:assert/strict";
import test from "node:test";

import type { ToeicWritingSubmissionPayload } from "@repo/shared";
import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicWritingSubmissionUseCase } from "../use-cases/get-toeic-writing-submission.use-case";
import { SubmitToeicWritingTaskUseCase } from "../use-cases/submit-toeic-writing-task.use-case";

const version = "a".repeat(64);
const payload: ToeicWritingSubmissionPayload = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  contentVersion: version,
  responseText: "The worker is checking a report.",
};

const task = {
  id: 11,
  part: 1,
  title: "Write a sentence",
  source_version: version,
  payload: {
    requiredWords: [
      { en: "worker", vi: "nhân viên" },
      { en: "report", vi: "báo cáo" },
    ],
    structureSuggestions: ["Subject + be + verb-ing"],
    ideas: ["Describe the action"],
    samplesEn: ["A synthetic reference."],
    samplesVi: ["Một câu tham khảo tổng hợp."],
  },
};

function submissionRecord(responseText = payload.responseText) {
  return {
    id: 31,
    user_id: "learner-1",
    task_id: 11,
    submission_key: payload.submissionKey,
    content_version: version,
    response_text: responseText,
    submitted_at: new Date("2026-08-03T03:04:05.000Z"),
    task_title: task.title,
    task_part: task.part,
    reference_snapshot: {
      samplesEn: ["A synthetic reference."],
      samplesVi: ["Má»™t cÃ¢u tham kháº£o tá»•ng há»£p."],
      structureSuggestions: ["Subject + be + verb-ing"],
      ideas: ["Describe the action"],
    },
  };
}

function submissionPrisma() {
  let stored: ReturnType<typeof submissionRecord> | null = null;
  let createCount = 0;
  const draftDeletes: unknown[] = [];
  const submissions = {
    findUnique: () => Promise.resolve(stored),
    create: ({
      data,
    }: {
      data: {
        response_text: string;
        task_title: string;
        task_part: number;
        reference_snapshot: unknown;
      };
    }) => {
      createCount += 1;
      stored = {
        ...submissionRecord(data.response_text),
        task_title: data.task_title,
        task_part: data.task_part,
        reference_snapshot: data.reference_snapshot as ReturnType<
          typeof submissionRecord
        >["reference_snapshot"],
      };
      return Promise.resolve(stored);
    },
  };
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve(task),
    },
    toeic_writing_submissions: submissions,
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>
    ) =>
      callback({
        toeic_writing_submissions: submissions,
        toeic_writing_drafts: {
          deleteMany: (args: unknown) => {
            draftDeletes.push(args);
            return Promise.resolve({ count: 1 });
          },
        },
      }),
  } as unknown as PrismaService;
  return {
    prisma,
    draftDeletes,
    createCount: () => createCount,
  };
}

function responseCode(error: unknown) {
  return (
    error as { getResponse(): { statusCode: number; code: string } }
  ).getResponse();
}

test("retrying an identical submission returns the stored row", async () => {
  const fixture = submissionPrisma();
  const submit = new SubmitToeicWritingTaskUseCase(fixture.prisma);

  const first = await submit.execute("learner-1", 11, payload);
  const retry = await submit.execute("learner-1", 11, payload);

  assert.equal(retry.id, first.id);
  assert.equal(fixture.createCount(), 1);
  assert.deepEqual(fixture.draftDeletes, [
    { where: { user_id: "learner-1", task_id: 11 } },
  ]);
});

test("reusing a key for another response conflicts", async () => {
  const fixture = submissionPrisma();
  const submit = new SubmitToeicWritingTaskUseCase(fixture.prisma);
  await submit.execute("learner-1", 11, payload);

  await assert.rejects(
    () =>
      submit.execute("learner-1", 11, {
        ...payload,
        responseText: "different",
      }),
    (error: unknown) => {
      const response = responseCode(error);
      return (
        response.statusCode === 409 &&
        response.code === "WRITING_SUBMISSION_KEY_CONFLICT"
      );
    }
  );
  assert.equal(fixture.createCount(), 1);
});

test("submission result maps reference only after owned lookup", async () => {
  const queries: unknown[] = [];
  const prisma = {
    toeic_writing_submissions: {
      findFirst: (args: { where: { user_id: string } }) => {
        queries.push(args);
        return Promise.resolve(
          args.where.user_id === "learner-1" ? submissionRecord() : null
        );
      },
    },
  } as unknown as PrismaService;
  const get = new GetToeicWritingSubmissionUseCase(prisma);

  const result = await get.execute("learner-1", 31);
  assert.equal(result.part, 1);
  if (result.part !== 1) throw new Error("Expected Part 1 result");
  assert.deepEqual(result.reference.samplesEn, ["A synthetic reference."]);
  await assert.rejects(
    () => get.execute("learner-2", 31),
    (error: unknown) =>
      responseCode(error).code === "WRITING_SUBMISSION_NOT_FOUND"
  );
  assert.deepEqual((queries[1] as { where: unknown }).where, {
    id: 31,
    user_id: "learner-2",
  });
});

test("submission result remains unchanged after the source task changes", async () => {
  const stored = submissionRecord();
  task.title = "Changed task title";
  task.payload.samplesEn = ["A changed reference."];
  const prisma = {
    toeic_writing_submissions: {
      findFirst: () => Promise.resolve(stored),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicWritingSubmissionUseCase(prisma).execute(
    "learner-1",
    31
  );

  assert.equal(result.taskTitle, "Write a sentence");
  assert.equal(result.part, 1);
  if (result.part !== 1) throw new Error("Expected Part 1 result");
  assert.deepEqual(result.reference.samplesEn, ["A synthetic reference."]);
});

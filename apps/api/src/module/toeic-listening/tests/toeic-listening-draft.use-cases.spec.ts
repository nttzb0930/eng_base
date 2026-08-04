import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PrismaService } from "../../../database/prisma/prisma.service";
import { DeleteToeicListeningDraftUseCase } from "../use-cases/delete-toeic-listening-draft.use-case";
import { GetToeicListeningDraftUseCase } from "../use-cases/get-toeic-listening-draft.use-case";
import { SaveToeicListeningDraftUseCase } from "../use-cases/save-toeic-listening-draft.use-case";

const version = "a".repeat(64);
const testRow = {
  id: 9,
  listening_source_version: version,
  toeic_questions: [
    {
      id: 11,
      part: 1,
      toeic_question_options: [{ id: 111 }, { id: 112 }],
      toeic_media_bindings: [{ media_asset_id: 801 }],
    },
    {
      id: 12,
      part: 1,
      toeic_question_options: [{ id: 121 }],
      toeic_media_bindings: [],
    },
  ],
  toeic_stimuli: [
    { id: 31, part: 1, toeic_media_bindings: [{ media_asset_id: 802 }] },
  ],
};
const payload = {
  listeningSourceVersion: version,
  practicePart: 1 as const,
  activeQuestionId: 12,
  answers: [{ questionId: 11, optionId: 111 }],
  reviewQuestionIds: [12],
  completedMediaIds: [801],
  activeMediaId: 802,
  playbackPositionMs: 1200,
};
const stored = {
  id: 1,
  user_id: "user-1",
  test_id: 9,
  scope: "PART_1",
  listening_source_version: version,
  active_question_id: 12,
  answers: payload.answers,
  review_question_ids: [12],
  completed_media_ids: [801],
  active_media_id: 802,
  playback_position_ms: 1200,
  created_at: new Date(),
  updated_at: new Date(),
  expires_at: new Date(Date.now() + 100000),
};

test("validates question, option, media and atomically upserts a 30-day draft", async () => {
  const writes: unknown[] = [];
  const prisma = {
    toeic_tests: { findFirst: () => Promise.resolve(testRow) },
    toeic_listening_drafts: {
      upsert: (args: unknown) => {
        writes.push(args);
        return Promise.resolve(stored);
      },
    },
  } as unknown as PrismaService;
  const result = await new SaveToeicListeningDraftUseCase(prisma).execute(
    "user-1",
    9,
    payload
  );
  assert.equal(result.practicePart, 1);
  assert.equal(result.playbackPositionMs, 1200);
  assert.deepEqual((writes[0] as { where: unknown }).where, {
    user_id_test_id_scope: { user_id: "user-1", test_id: 9, scope: "PART_1" },
  });
});

test("rejects foreign media, duplicate answers and negative playback", async () => {
  let writes = 0;
  const prisma = {
    toeic_tests: { findFirst: () => Promise.resolve(testRow) },
    toeic_listening_drafts: {
      upsert: () => {
        writes++;
        return Promise.resolve(stored);
      },
    },
  } as unknown as PrismaService;
  const useCase = new SaveToeicListeningDraftUseCase(prisma);
  await assert.rejects(
    () =>
      useCase.execute("user-1", 9, { ...payload, completedMediaIds: [999] }),
    BadRequestException
  );
  await assert.rejects(
    () =>
      useCase.execute("user-1", 9, {
        ...payload,
        answers: [payload.answers[0]!, payload.answers[0]!],
      }),
    BadRequestException
  );
  await assert.rejects(
    () => useCase.execute("user-1", 9, { ...payload, playbackPositionMs: -1 }),
    BadRequestException
  );
  assert.equal(writes, 0);
});

test("rejects stale version and removes expired reads", async () => {
  const stale = {
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          ...testRow,
          listening_source_version: "b".repeat(64),
        }),
    },
  } as unknown as PrismaService;
  await assert.rejects(
    () =>
      new SaveToeicListeningDraftUseCase(stale).execute("user-1", 9, payload),
    ConflictException
  );
  let deleted = 0;
  const prisma = {
    toeic_listening_drafts: {
      findUnique: () =>
        Promise.resolve({
          ...stored,
          expires_at: new Date(0),
          toeic_tests: {
            listening_source_version: version,
            listening_status: "PUBLISHED",
          },
        }),
      deleteMany: () => {
        deleted++;
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;
  assert.equal(
    await new GetToeicListeningDraftUseCase(prisma).execute("user-1", 9, 1),
    null
  );
  assert.equal(deleted, 1);
});

test("deletes only the authenticated account scope", async () => {
  let where: unknown;
  const prisma = {
    toeic_listening_drafts: {
      deleteMany: (args: { where: unknown }) => {
        where = args.where;
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;
  assert.deepEqual(
    await new DeleteToeicListeningDraftUseCase(prisma).execute("user-1", 9),
    { deleted: true }
  );
  assert.deepEqual(where, { user_id: "user-1", test_id: 9, scope: "FULL" });
});

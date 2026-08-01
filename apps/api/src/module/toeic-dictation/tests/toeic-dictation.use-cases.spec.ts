import assert from "node:assert/strict";
import test from "node:test";

import { ConflictException } from "@nestjs/common";

import { GetToeicDictationSetUseCase } from "../use-cases/get-toeic-dictation-set.use-case";
import { GetToeicDictationCheckItemUseCase } from "../use-cases/get-toeic-dictation-check-item.use-case";
import { GetToeicDictationFullItemUseCase } from "../use-cases/get-toeic-dictation-full-item.use-case";
import { ListToeicDictationSetsUseCase } from "../use-cases/list-toeic-dictation-sets.use-case";
import { SubmitToeicDictationUseCase } from "../use-cases/submit-toeic-dictation.use-case";

const version = "a".repeat(64);

test("dictation list returns progress summary without answer content", async () => {
  const useCase = new ListToeicDictationSetsUseCase({
    toeic_dictation_sets: {
      findMany: async () => [
        {
          id: 10,
          collection_name: "Đề 2026",
          display_name: "TEST 1 2026",
          test_number: 1,
          part: 1,
          source_version: version,
          toeic_dictation_items: [
            {
              id: 20,
              toeic_dictation_progress: [
                {
                  id: 30,
                  latest_accuracy: 90,
                  words_correct: 9,
                  total_words: 10,
                  attempts_count: 1,
                  mastered: true,
                  last_typed_text: "ready",
                  last_attempted_at: new Date("2026-08-01T00:00:00.000Z"),
                  completed_at: new Date("2026-08-01T00:00:00.000Z"),
                },
              ],
            },
          ],
        },
      ],
    },
  } as never);

  const [summary] = await useCase.execute("user-1", {});
  assert.equal(summary?.progress.masteredCount, 1);
  assert.equal(summary?.progress.accuracy, 90);
  assert.equal("transcript" in (summary ?? {}), false);
});

test("dictation list maps the public collection key to the stored collection name", async () => {
  let where: Record<string, unknown> | undefined;
  const useCase = new ListToeicDictationSetsUseCase({
    toeic_dictation_sets: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        where = args.where;
        return [];
      },
    },
  } as never);

  await useCase.execute("user-1", { collection: "2026" });

  assert.equal(where?.collection_name, "Đề 2026");
});

test("dictation set detail exposes opaque media ids but no transcript", async () => {
  const useCase = new GetToeicDictationSetUseCase({
    toeic_dictation_sets: {
      findFirst: async () => ({
        id: 10,
        collection_name: "Đề 2026",
        display_name: "TEST 1 2026",
        test_number: 1,
        part: 1,
        source_version: version,
        toeic_dictation_items: [
          {
            id: 20,
            order_index: 1,
            source_group: null,
            audio_duration_ms: 2500,
            toeic_dictation_progress: [],
          },
        ],
      }),
    },
  } as never);

  const detail = await useCase.execute("user-1", 10);
  assert.deepEqual(detail.items, [
    { id: 20, order: 1, groupId: null, durationSeconds: 2.5, mediaId: 20 },
  ]);
  assert.equal("transcript" in detail.items[0]!, false);
});

test("dictation check returns masked segments without hidden text", async () => {
  const useCase = new GetToeicDictationCheckItemUseCase({
    toeic_dictation_items: {
      findFirst: async () => ({
        id: 20,
        order_index: 1,
        transcript: "The quick brown fox jumps.",
      }),
    },
  } as never);

  const result = await useCase.execute(20, 50);
  assert.equal(result.hidePercent, 50);
  assert.equal(result.segments.some((segment) => segment.hidden && segment.text === null), true);
});

test("dictation full returns transcript and translation on demand", async () => {
  const useCase = new GetToeicDictationFullItemUseCase({
    toeic_dictation_items: {
      findFirst: async () => ({
        id: 20,
        transcript: "A sentence",
        translation_vi: "Một câu",
      }),
    },
  } as never);

  assert.deepEqual(await useCase.execute(20), {
    itemId: 20,
    transcript: "A sentence",
    translationVi: "Một câu",
  });
});

test("dictation submit rejects stale content versions", async () => {
  const useCase = new SubmitToeicDictationUseCase({
    toeic_dictation_items: {
      findFirst: async () => ({
        id: 20,
        source_version: "b".repeat(64),
        transcript: "A sentence",
        translation_vi: null,
      }),
    },
  } as never);

  await assert.rejects(
    () =>
      useCase.execute("user-1", {
        itemId: 20,
        sourceVersion: version,
        typedText: "A sentence",
        submissionKey: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      }),
    (error: unknown) => error instanceof ConflictException,
  );
});

test("dictation duplicate submission returns the original attempt", async () => {
  const useCase = new SubmitToeicDictationUseCase({
    toeic_dictation_items: {
      findFirst: async () => ({
        id: 20,
        source_version: version,
        transcript: "A sentence",
        translation_vi: "Một câu",
      }),
    },
    toeic_dictation_attempts: {
      findUnique: async () => ({
        id: 99,
        item_id: 20,
        source_version_snapshot: version,
        typed_text: "A sentence",
        words_correct: 2,
        total_words: 2,
        accuracy: 100,
        word_results: [{ status: "CORRECT", expected: "a", actual: "a" }],
        submitted_at: new Date("2026-08-01T00:00:00.000Z"),
      }),
    },
  } as never);

  const result = await useCase.execute("user-1", {
    itemId: 20,
    sourceVersion: version,
    typedText: "A sentence",
    submissionKey: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  });
  assert.equal(result.attemptId, 99);
  assert.equal(result.mastered, true);
  assert.equal(result.transcript, "A sentence");
});

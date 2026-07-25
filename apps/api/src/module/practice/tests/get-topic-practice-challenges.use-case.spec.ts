import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import { GetTopicPracticeChallengesUseCase } from "../use-cases/get-topic-practice-challenges.use-case";

const createdAt = new Date("2026-07-24T00:00:00.000Z");

const createProgress = (
  vocabularyItemId: number,
  overrides: Record<string, unknown> = {},
) => ({
  id: vocabularyItemId,
  user_id: "user-1",
  vocabulary_item_id: vocabularyItemId,
  correct_count: 1,
  wrong_count: 0,
  review_count: 1,
  mastery_level: "learning",
  ease_factor: 2.5,
  interval_days: 1,
  repetition_count: 1,
  last_reviewed_at: createdAt,
  next_review_at: new Date("2099-01-01T00:00:00.000Z"),
  created_at: createdAt,
  updated_at: createdAt,
  ...overrides,
});

const createVocabularyItem = (
  id: number,
  progress: Record<string, unknown> | null = null,
) => ({
  id,
  word: `word-${id}`,
  normalized_word: `word-${id}`,
  pos: id % 2 === 0 ? "verb" : "noun",
  pos_vi: id % 2 === 0 ? "động từ" : "danh từ",
  cefr_level: id % 2 === 0 ? "A2" : "A1",
  phonetic: null,
  phonetic_source: null,
  audio_url: null,
  audio_source: null,
  example_en: null,
  example_vi: null,
  example_source: null,
  meaning_vi: `nghĩa riêng ${id}`,
  primary_meaning_vi: `nghĩa ${id}`,
  source: "fixture",
  created_at: createdAt,
  updated_at: createdAt,
  user_saved_words: [],
  user_vocabulary_progress: progress ? [progress] : [],
  vocabulary_examples: [],
});

const topicItems = [
  createVocabularyItem(1),
  createVocabularyItem(2, createProgress(2, { wrong_count: 2 })),
  createVocabularyItem(3, createProgress(3)),
  createVocabularyItem(4),
  createVocabularyItem(
    5,
    createProgress(5, { mastery_level: "mastered" }),
  ),
];

function createPrismaFake(items = topicItems) {
  const calls: unknown[] = [];

  return {
    calls,
    vocabulary_topics: {
      findUnique: async (query: unknown) => {
        calls.push(query);
        return {
          id: 1,
          slug: "travel",
          vocabulary_item_topics: items.map((item) => ({
            vocabulary_items: item,
          })),
        };
      },
    },
  };
}

test("weak mode selects only reviewed items with wrong answers", async () => {
  const prisma = createPrismaFake();
  const useCase = new GetTopicPracticeChallengesUseCase(prisma as never);

  const challenges = await useCase.execute(
    "user-1",
    " Travel ",
    "weak",
    () => 0,
  );

  assert.deepEqual(
    challenges.map((challenge) => challenge.vocabularyItem.id),
    [2],
  );
  assert.equal(prisma.calls.length, 1);
  assert.deepEqual(prisma.calls[0], {
    where: { slug: "travel" },
    include: {
      vocabulary_item_topics: {
        include: {
          vocabulary_items: {
            include: {
              user_saved_words: { where: { user_id: "user-1" } },
              user_vocabulary_progress: { where: { user_id: "user-1" } },
              vocabulary_examples: {
                orderBy: [{ order: "asc" }, { id: "asc" }],
              },
            },
          },
        },
      },
    },
  });
});

test("new mode selects only items without reviewed progress", async () => {
  const useCase = new GetTopicPracticeChallengesUseCase(
    createPrismaFake() as never,
  );

  const challenges = await useCase.execute(
    "user-1",
    "travel",
    "new",
    () => 0,
  );

  assert.deepEqual(
    challenges.map((challenge) => challenge.vocabularyItem.id),
    [4, 1],
  );
});

test("all mode selects every eligible Topic item up to 20", async () => {
  const items = Array.from({ length: 25 }, (_, index) =>
    createVocabularyItem(index + 1),
  );
  const useCase = new GetTopicPracticeChallengesUseCase(
    createPrismaFake(items) as never,
  );

  const challenges = await useCase.execute(
    "user-1",
    "travel",
    "all",
    () => 0,
  );

  assert.equal(challenges.length, 20);
  assert.equal(
    new Set(challenges.map((challenge) => challenge.vocabularyItem.id)).size,
    20,
  );
});

test("unknown Topic throws NotFoundException", async () => {
  const useCase = new GetTopicPracticeChallengesUseCase({
    vocabulary_topics: {
      findUnique: async () => null,
    },
  } as never);

  await assert.rejects(
    useCase.execute("user-1", "missing", "all", () => 0),
    NotFoundException,
  );
});

test("each challenge has one correct option and no duplicate text", async () => {
  const useCase = new GetTopicPracticeChallengesUseCase(
    createPrismaFake() as never,
  );

  const challenges = await useCase.execute(
    "user-1",
    "travel",
    "all",
    () => 0,
  );

  for (const challenge of challenges) {
    assert.equal(
      challenge.challengeOptions.filter((option) => option.correct).length,
      1,
    );
    const optionTexts = challenge.challengeOptions.map((option) => option.text);
    assert.equal(new Set(optionTexts).size, optionTexts.length);
  }
});

test("same random source produces the same challenge order", async () => {
  const useCase = new GetTopicPracticeChallengesUseCase(
    createPrismaFake() as never,
  );

  const first = await useCase.execute("user-1", "travel", "all", () => 0);
  const second = await useCase.execute("user-1", "travel", "all", () => 0);

  assert.deepEqual(first, second);
});

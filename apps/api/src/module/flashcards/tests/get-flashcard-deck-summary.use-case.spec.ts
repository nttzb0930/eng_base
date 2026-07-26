import assert from "node:assert/strict";
import test from "node:test";

import { GetFlashcardDeckSummaryUseCase } from "../use-cases/get-flashcard-deck-summary.use-case";

const NOW = new Date("2026-07-24T00:00:00.000Z");

function createProgress(
  vocabularyItemId: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: vocabularyItemId,
    user_id: "user-1",
    vocabulary_item_id: vocabularyItemId,
    correct_count: 3,
    wrong_count: 1,
    review_count: 4,
    mastery_level: "learning",
    ease_factor: 2.5,
    interval_days: 1,
    repetition_count: 1,
    last_reviewed_at: new Date("2026-07-23T00:00:00.000Z"),
    next_review_at: new Date("2026-07-23T00:00:00.000Z"),
    created_at: new Date("2026-07-20T00:00:00.000Z"),
    updated_at: new Date("2026-07-23T00:00:00.000Z"),
    ...overrides,
  };
}

function createItem(
  id: number,
  cefrLevel: string,
  options: {
    progress?: ReturnType<typeof createProgress>;
    saved?: boolean;
    topics?: Array<{ slug: string; order: number }>;
  } = {},
) {
  return {
    id,
    word: `word-${id}`,
    normalized_word: `word-${id}`,
    pos: "noun",
    pos_vi: null,
    cefr_level: cefrLevel,
    phonetic: null,
    phonetic_source: null,
    audio_url: null,
    audio_source: null,
    example_en: null,
    example_vi: null,
    example_source: null,
    meaning_vi: `meaning-${id}`,
    primary_meaning_vi: `meaning-${id}`,
    source: "test",
    created_at: new Date("2026-07-01T00:00:00.000Z"),
    updated_at: new Date("2026-07-01T00:00:00.000Z"),
    user_saved_words: options.saved
      ? [
          {
            id,
            user_id: "user-1",
            vocabulary_item_id: id,
            created_at: new Date("2026-07-22T00:00:00.000Z"),
          },
        ]
      : [],
    user_vocabulary_progress: options.progress ? [options.progress] : [],
    vocabulary_examples: [],
    vocabulary_item_topics: (options.topics ?? []).map((topic) => ({
      vocabulary_topics: topic,
    })),
  };
}

function createPrismaFake(items: unknown[]) {
  const calls: unknown[] = [];

  return {
    calls,
    vocabulary_items: {
      findMany: async (query: unknown) => {
        calls.push(query);
        return items;
      },
    },
  };
}

test("Flashcard summary composes system, CEFR, Topic, and overview metrics", async () => {
  const prisma = createPrismaFake([
    createItem(1, "A1", {
      saved: true,
      progress: createProgress(1),
      topics: [{ slug: "travel", order: 2 }],
    }),
    createItem(2, "A1", {
      progress: createProgress(2, {
        mastery_level: "mastered",
        next_review_at: new Date("2026-07-25T00:00:00.000Z"),
      }),
      topics: [{ slug: "travel", order: 2 }],
    }),
    createItem(3, "A2"),
  ]);
  const useCase = new GetFlashcardDeckSummaryUseCase(prisma as never);

  const result = await useCase.execute("user-1", NOW);

  assert.deepEqual(
    result.cefrDecks.map((deck) => deck.key),
    ["A1", "A2", "B1", "B2"],
  );
  assert.equal(result.topicDecks[0]?.key, "travel");
  assert.equal(result.topicDecks[0]?.accuracy, 75);
  assert.equal(result.overview.due, 1);
  assert.equal(result.overview.saved, 1);
  assert.equal(result.overview.weak, 2);
  assert.equal(result.overview.learned, 2);
  assert.equal(result.overview.mastered, 1);
  assert.equal(result.overview.accuracy, 75);
  assert.equal(prisma.calls.length, 1);
  assert.deepEqual(prisma.calls[0], {
    orderBy: { id: "asc" },
    include: {
      user_saved_words: { where: { user_id: "user-1" } },
      user_vocabulary_progress: { where: { user_id: "user-1" } },
      vocabulary_examples: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
      },
      vocabulary_item_topics: {
        include: {
          vocabulary_topics: {
            select: { slug: true, order: true },
          },
        },
      },
    },
  });
});

test("empty catalog returns zero overview and unavailable CEFR decks", async () => {
  const useCase = new GetFlashcardDeckSummaryUseCase(
    createPrismaFake([]) as never,
  );

  const result = await useCase.execute("user-empty", NOW);

  assert.deepEqual(result.overview, {
    due: 0,
    saved: 0,
    weak: 0,
    learned: 0,
    mastered: 0,
    accuracy: null,
    lastReviewedAt: null,
  });
  assert.equal(result.cefrDecks.length, 4);
  assert.equal(result.cefrDecks.every((deck) => !deck.available), true);
  assert.deepEqual(result.topicDecks, []);
});

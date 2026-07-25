import assert from "node:assert/strict";
import test from "node:test";

import { GetVocabularyTopicUseCase } from "./use-cases/get-vocabulary-topic.use-case";
import { ListVocabularyTopicsUseCase } from "./use-cases/list-vocabulary-topics.use-case";
import type { RawVocabularyTopic } from "./use-cases/topic-source";

const createdAt = new Date("2026-07-19T00:00:00.000Z");

const rawTopic: RawVocabularyTopic = {
  id: 1,
  slug: "airport",
  title: "Airport",
  title_vi: "Sân bay",
  description: "Airport vocabulary.",
  description_vi: "Từ vựng dùng tại sân bay.",
  group_name: "Travel",
  group_name_vi: "Du lịch",
  order: 55,
  created_at: createdAt,
};

const createVocabularyItem = (
  id: number,
  cefrLevel = "A1",
  progress: Record<string, unknown> | null = null
) => ({
  id,
  word: `word-${id}`,
  normalized_word: `word-${id}`,
  pos: "noun",
  pos_vi: "danh từ",
  cefr_level: cefrLevel,
  phonetic: null,
  phonetic_source: null,
  audio_url: null,
  audio_source: null,
  example_en: null,
  example_vi: null,
  example_source: null,
  meaning_vi: `nghĩa-${id}`,
  primary_meaning_vi: `nghĩa-${id}`,
  source: "fixture",
  created_at: createdAt,
  updated_at: createdAt,
  user_saved_words: [],
  user_vocabulary_progress: progress ? [progress] : [],
  vocabulary_examples: [],
});

const createProgress = (
  vocabularyItemId: number,
  overrides: Record<string, unknown> = {}
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

const vocabularyItem = {
  ...createVocabularyItem(10),
  word: "airport",
  normalized_word: "airport",
  meaning_vi: "sân bay",
  primary_meaning_vi: "sân bay",
};

function createPrismaFake(
  topic = rawTopic,
  vocabularyItems = [vocabularyItem]
) {
  const queryResults: unknown[] = [
    [topic],
    vocabularyItems.map((item) => ({
      topic_id: topic.id,
      vocabulary_item_id: item.id,
    })),
  ];

  return {
    $queryRaw: async () => queryResults.shift(),
    vocabulary_items: {
      findMany: async () => vocabularyItems,
    },
  };
}

const progressVocabularyItems = [
  createVocabularyItem(1, "A1"),
  createVocabularyItem(2, "A1", createProgress(2, { wrong_count: 1 })),
  createVocabularyItem(
    3,
    "A2",
    createProgress(3, {
      mastery_level: "mastered",
      next_review_at: new Date("2020-01-01T00:00:00.000Z"),
    })
  ),
  createVocabularyItem(4, "B1", createProgress(4, { next_review_at: null })),
];

test("topic list defaults to English without changing progress identity", async () => {
  const useCase = new ListVocabularyTopicsUseCase(createPrismaFake() as never);

  const result = await useCase.execute("user-1");

  assert.deepEqual(
    result.map(({ id, slug, title, description, group, order, total }) => ({
      id,
      slug,
      title,
      description,
      group,
      order,
      total,
    })),
    [
      {
        id: 1,
        slug: "airport",
        title: "Airport",
        description: "Airport vocabulary.",
        group: "Travel",
        order: 55,
        total: 1,
      },
    ]
  );
});

test("topic list projects Vietnamese presentation fields", async () => {
  const useCase = new ListVocabularyTopicsUseCase(createPrismaFake() as never);
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    locale: "vi"
  ) => ReturnType<typeof useCase.execute>;

  const [topic] = await execute("user-1", "vi");

  assert.deepEqual(
    {
      title: topic?.title,
      description: topic?.description,
      group: topic?.group,
    },
    {
      title: "Sân bay",
      description: "Từ vựng dùng tại sân bay.",
      group: "Du lịch",
    }
  );
});

test("topic list projects every learner progress aggregate", async () => {
  const useCase = new ListVocabularyTopicsUseCase(
    createPrismaFake(rawTopic, progressVocabularyItems) as never
  );

  const [topic] = await useCase.execute("user-1");

  assert.deepEqual(topic, {
    id: 1,
    slug: "airport",
    title: "Airport",
    description: "Airport vocabulary.",
    group: "Travel",
    order: 55,
    total: 4,
    learned: 3,
    learning: 2,
    unlearned: 1,
    mastered: 1,
    weak: 1,
    due: 2,
  });
});

test("Vietnamese topic projection falls back field by field to English", async () => {
  const useCase = new ListVocabularyTopicsUseCase(
    createPrismaFake({
      ...rawTopic,
      title_vi: " ",
      description_vi: null,
      group_name_vi: "",
    }) as never
  );
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    locale: "vi"
  ) => ReturnType<typeof useCase.execute>;

  const [topic] = await execute("user-1", "vi");

  assert.deepEqual(
    {
      title: topic?.title,
      description: topic?.description,
      group: topic?.group,
    },
    {
      title: "Airport",
      description: "Airport vocabulary.",
      group: "Travel",
    }
  );
});

test("topic detail uses the same locale while preserving level membership", async () => {
  const useCase = new GetVocabularyTopicUseCase(createPrismaFake() as never);
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    slug: string,
    level: string | undefined,
    locale: "vi"
  ) => ReturnType<typeof useCase.execute>;

  const result = await execute("user-1", "airport", "A1", "vi");

  assert.deepEqual(
    {
      slug: result?.slug,
      title: result?.title,
      description: result?.description,
      group: result?.group,
      selectedLevel: result?.selectedLevel,
      total: result?.stats.total,
      filteredTotal: result?.filteredStats.total,
      words: result?.items.map((item) => item.word),
    },
    {
      slug: "airport",
      title: "Sân bay",
      description: "Từ vựng dùng tại sân bay.",
      group: "Du lịch",
      selectedLevel: "A1",
      total: 1,
      filteredTotal: 1,
      words: ["airport"],
    }
  );
});

test("topic detail projects item state and level-filtered progress", async () => {
  const useCase = new GetVocabularyTopicUseCase(
    createPrismaFake(rawTopic, progressVocabularyItems) as never
  );

  const result = await useCase.execute("user-1", "airport", "A1");

  assert.deepEqual(result?.stats, {
    total: 4,
    learned: 3,
    learning: 2,
    unlearned: 1,
    mastered: 1,
    weak: 1,
    due: 2,
  });
  assert.deepEqual(result?.filteredStats, {
    total: 2,
    learned: 1,
    learning: 1,
    unlearned: 1,
    mastered: 0,
    weak: 1,
    due: 0,
  });
  assert.deepEqual(
    result?.items.map(({ id, learnerState }) => ({ id, learnerState })),
    [
      {
        id: 1,
        learnerState: {
          learned: false,
          learning: false,
          unlearned: true,
          mastered: false,
          weak: false,
          due: false,
          masteryLevel: null,
        },
      },
      {
        id: 2,
        learnerState: {
          learned: true,
          learning: true,
          unlearned: false,
          mastered: false,
          weak: true,
          due: false,
          masteryLevel: "learning",
        },
      },
    ]
  );
});

test("missing English topic group uses a stable fallback", async () => {
  const useCase = new ListVocabularyTopicsUseCase(
    createPrismaFake({
      ...rawTopic,
      group_name: null,
      group_name_vi: null,
    }) as never
  );

  const [topic] = await useCase.execute("user-1");

  assert.equal(topic?.group, "Other");
});

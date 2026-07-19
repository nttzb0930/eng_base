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

const vocabularyItem = {
  id: 10,
  word: "airport",
  normalized_word: "airport",
  pos: "noun",
  pos_vi: "danh từ",
  cefr_level: "A1",
  phonetic: null,
  phonetic_source: null,
  audio_url: null,
  audio_source: null,
  example_en: null,
  example_vi: null,
  example_source: null,
  meaning_vi: "sân bay",
  primary_meaning_vi: "sân bay",
  source: "fixture",
  created_at: createdAt,
  updated_at: createdAt,
  user_saved_words: [],
  user_vocabulary_progress: [],
  vocabulary_examples: [],
};

function createPrismaFake(topic = rawTopic) {
  const queryResults: unknown[] = [
    [topic],
    [{ topic_id: topic.id, vocabulary_item_id: vocabularyItem.id }],
  ];

  return {
    $queryRaw: async () => queryResults.shift(),
    vocabulary_items: {
      findMany: async () => [vocabularyItem],
    },
  };
}

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
    ],
  );
});

test("topic list projects Vietnamese presentation fields", async () => {
  const useCase = new ListVocabularyTopicsUseCase(createPrismaFake() as never);
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    locale: "vi",
  ) => ReturnType<typeof useCase.execute>;

  const [topic] = await execute("user-1", "vi");

  assert.deepEqual(
    { title: topic?.title, description: topic?.description, group: topic?.group },
    {
      title: "Sân bay",
      description: "Từ vựng dùng tại sân bay.",
      group: "Du lịch",
    },
  );
});

test("Vietnamese topic projection falls back field by field to English", async () => {
  const useCase = new ListVocabularyTopicsUseCase(
    createPrismaFake({
      ...rawTopic,
      title_vi: " ",
      description_vi: null,
      group_name_vi: "",
    }) as never,
  );
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    locale: "vi",
  ) => ReturnType<typeof useCase.execute>;

  const [topic] = await execute("user-1", "vi");

  assert.deepEqual(
    { title: topic?.title, description: topic?.description, group: topic?.group },
    {
      title: "Airport",
      description: "Airport vocabulary.",
      group: "Travel",
    },
  );
});

test("topic detail uses the same locale while preserving level membership", async () => {
  const useCase = new GetVocabularyTopicUseCase(createPrismaFake() as never);
  const execute = useCase.execute.bind(useCase) as (
    userId: string,
    slug: string,
    level: string | undefined,
    locale: "vi",
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
    },
  );
});

test("missing English topic group uses a stable fallback", async () => {
  const useCase = new ListVocabularyTopicsUseCase(
    createPrismaFake({ ...rawTopic, group_name: null, group_name_vi: null }) as never,
  );

  const [topic] = await useCase.execute("user-1");

  assert.equal(topic?.group, "Other");
});

import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { GetFlashcardSessionItemsUseCase } from "../use-cases/get-flashcard-session-items.use-case";

function createRawItem(id: number) {
  const createdAt = new Date("2026-07-01T00:00:00.000Z");

  return {
    id,
    word: `word-${id}`,
    normalized_word: `word-${id}`,
    pos: "noun",
    pos_vi: null,
    cefr_level: "A1",
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
    created_at: createdAt,
    updated_at: createdAt,
    user_saved_words: [],
    user_vocabulary_progress: [],
    vocabulary_examples: [],
  };
}

test("legacy due saved weak and CEFR decks remain valid", async () => {
  const calls: unknown[] = [];
  const useCase = new GetFlashcardSessionItemsUseCase({
    vocabulary_items: {
      findMany: async (query: unknown) => {
        calls.push(query);
        return [];
      },
    },
  } as never);

  for (const deck of ["due", "saved", "weak", "A1", "A2", "B1", "B2"]) {
    assert.deepEqual(await useCase.execute("user-1", { deck }), []);
  }

  assert.equal(calls.length, 7);
});

test("invalid legacy deck throws BadRequestException", async () => {
  const useCase = new GetFlashcardSessionItemsUseCase({} as never);

  await assert.rejects(
    useCase.execute("user-1", { deck: "certificate" }),
    BadRequestException,
  );
  await assert.rejects(
    useCase.execute("user-1", {
      deck: "due",
      source: "topic",
      slug: "travel",
    }),
    BadRequestException,
  );
});

test("Topic source requires a slug", async () => {
  const useCase = new GetFlashcardSessionItemsUseCase({} as never);

  await assert.rejects(
    useCase.execute("user-1", { source: "topic" }),
    BadRequestException,
  );
  await assert.rejects(
    useCase.execute("user-1", { slug: "travel" }),
    BadRequestException,
  );
});

test("unknown Topic throws NotFoundException", async () => {
  const useCase = new GetFlashcardSessionItemsUseCase({
    vocabulary_topics: {
      findUnique: async () => null,
    },
  } as never);

  await assert.rejects(
    useCase.execute("user-1", { source: "topic", slug: "missing" }),
    NotFoundException,
  );
});

test("Topic session contains only members of that Topic", async () => {
  const calls: unknown[] = [];
  const useCase = new GetFlashcardSessionItemsUseCase({
    vocabulary_topics: {
      findUnique: async (query: unknown) => {
        calls.push(query);
        return {
          vocabulary_item_topics: [
            { vocabulary_items: createRawItem(2) },
            { vocabulary_items: createRawItem(4) },
          ],
        };
      },
    },
  } as never);

  const result = await useCase.execute(
    "user-1",
    { source: "topic", slug: " Travel " },
    () => 0,
  );

  assert.deepEqual(
    result.map((item) => item.id),
    [4, 2],
  );
  assert.deepEqual(calls[0], {
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

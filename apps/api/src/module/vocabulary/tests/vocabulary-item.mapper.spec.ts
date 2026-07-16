import assert from "node:assert/strict";
import test from "node:test";

import { mapVocabularyItem } from "../mappers/vocabulary-item.mapper";

test("vocabulary mapper converts database fields and nested relations", () => {
  const now = new Date("2026-07-14T00:00:00.000Z");

  const item = mapVocabularyItem({
    id: 7,
    word: "bear",
    normalized_word: "bear",
    pos: "noun",
    pos_vi: "danh từ",
    cefr_level: "A1",
    phonetic: "/beə/",
    phonetic_source: "dictionary",
    audio_url: null,
    audio_source: null,
    example_en: "A bear lives in the forest.",
    example_vi: "Một con gấu sống trong rừng.",
    example_source: "manual",
    meaning_vi: "con gấu",
    primary_meaning_vi: "con gấu",
    source: "seed",
    created_at: now,
    updated_at: now,
    user_saved_words: [
      { id: 1, user_id: "user-1", vocabulary_item_id: 7, created_at: now },
    ],
    user_vocabulary_progress: [],
    vocabulary_examples: [
      {
        id: 2,
        vocabulary_item_id: 7,
        example_en: "The bear is sleeping.",
        example_vi: "Con gấu đang ngủ.",
        source: "manual",
        order: 1,
        created_at: now,
      },
    ],
  });

  assert.equal(item.normalizedWord, "bear");
  assert.equal(item.userSavedWords[0]?.userId, "user-1");
  assert.equal(item.vocabularyExamples[0]?.exampleEn, "The bear is sleeping.");
});

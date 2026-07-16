import assert from "node:assert/strict";
import test from "node:test";

import { mapPracticeSessionDetail } from "./practice-session.mapper";

test("practice session detail mapper exposes nested vocabulary context", () => {
  const now = new Date("2026-07-14T00:00:00.000Z");
  const result = mapPracticeSessionDetail({
    id: 1,
    user_id: "user-1",
    mode: "review",
    correct_count: 1,
    wrong_count: 0,
    accuracy: 100,
    created_at: now,
    items: [
      {
        id: 2,
        practice_session_id: 1,
        vocabulary_item_id: 7,
        challenge_type: "SELECT",
        correct: true,
        answer: "con gấu",
        created_at: now,
        vocabulary_items: {
          id: 7,
          word: "bear",
          normalized_word: "bear",
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
          meaning_vi: "con gấu",
          primary_meaning_vi: "con gấu",
          source: "seed",
          created_at: now,
          updated_at: now,
        },
      },
    ],
  });

  assert.equal(result.items[0]?.vocabularyItem?.word, "bear");
});

import assert from "node:assert/strict";
import test from "node:test";

import { importToeicVocabularyCache } from "./toeic-vocabulary-cache.import.js";

const inventory = {
  schemaVersion: 1 as const,
  source: "dautoeic" as const,
  inventorySha256: "a".repeat(64),
  sourceTestIds: ["test-1"],
  entries: {
    "source-question-1": [
      {
        word: "lift",
        pos: "v",
        cefr: "B1",
        ipa_us: "lÉªft",
        ipa_uk: "lÉªft",
        meaning_vi: "nÃ¢ng lÃªn",
        example_en: "They lift the monitor.",
        example_vi: "Há» nÃ¢ng mÃ n hÃ¬nh lÃªn.",
        collocations: [{ en: "lift a monitor", vi: "nÃ¢ng mÃ n hÃ¬nh" }],
        synonym: { en: "raise", vi: "nÃ¢ng" },
      },
    ],
  },
};

test("imports ready vocabulary by source question within selected tests", async () => {
  let received: unknown;
  const result = await importToeicVocabularyCache(inventory, {
    replace: (input) => {
      received = input;
      return Promise.resolve("UPDATED");
    },
  });

  assert.equal(result, "UPDATED");
  assert.deepEqual(received, {
    source: "dautoeic",
    sourceTestIds: ["test-1"],
    inventorySha256: "a".repeat(64),
    entries: inventory.entries,
  });
});

test("rejects malformed vocabulary before persistence", async () => {
  await assert.rejects(
    () =>
      importToeicVocabularyCache(
        {
          ...inventory,
          entries: { "source-question-1": [{ word: "" }] },
        },
        { replace: () => Promise.resolve("UPDATED") }
      ),
    /word/u
  );
});

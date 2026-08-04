import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { FindVocabularyInTextUseCase } from "../use-cases/find-vocabulary-in-text.use-case";

test("finds catalog vocabulary in source order without inventing meanings", async () => {
  let query: unknown;
  const prisma = {
    vocabulary_items: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve([
          {
            id: 2,
            word: "reception",
            normalized_word: "reception",
            phonetic: null,
            pos: "noun",
            meaning_vi: "quầy lễ tân",
            cefr_level: "B1",
          },
          {
            id: 1,
            word: "revised",
            normalized_word: "revised",
            phonetic: "/rɪˈvaɪzd/",
            pos: "adjective",
            meaning_vi: "đã chỉnh sửa",
            cefr_level: "B1",
          },
        ]);
      },
    },
  } as unknown as PrismaService;

  const result = await new FindVocabularyInTextUseCase(prisma).execute(
    "Please leave the revised document at reception."
  );

  assert.deepEqual(
    result.map((item) => item.word),
    ["revised", "reception"]
  );
  const candidates = (query as { where: { normalized_word: { in: string[] } } })
    .where.normalized_word.in;
  assert.ok(candidates.includes("revised"));
  assert.ok(candidates.includes("reception"));
});

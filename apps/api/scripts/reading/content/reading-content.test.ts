import assert from "node:assert/strict";
import test from "node:test";

import {
  auditReadingVocabulary,
  validateReadingContentPack,
  type ReadingContentPassage,
} from "./reading-content.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../../vocabulary/catalog/vocabulary-catalog.js";

const topics: VocabularyTopicDefinition[] = [
  {
    slug: "personal-information",
    title: "Personal information",
    titleVi: "Thông tin cá nhân",
    description: "Words for personal information.",
    descriptionVi: "Từ vựng về thông tin cá nhân.",
    order: 1,
    group: "People",
    groupVi: "Con người",
  },
];

const option = (text: string, correct = false) => ({ text, correct });

const question = (
  index: number,
  overrides: Partial<ReadingContentPassage["questions"][number]> = {},
) => ({
  prompt: `What happens in part ${index}?`,
  options: [
    option(`Answer ${index}`, true),
    option(`Choice ${index}B`),
    option(`Choice ${index}C`),
  ],
  ...overrides,
});

const bodyWithWords = (count = 80) =>
  Array.from({ length: count }, (_, index) => `word${index + 1}`).join(" ");

const passage = (
  index: number,
  overrides: Partial<ReadingContentPassage> = {},
): ReadingContentPassage => ({
  slug: `reading-passage-${index}`,
  title: `Reading passage ${index}`,
  cefrLevel: "A1",
  topicSlug: "personal-information",
  estimatedMinutes: 3,
  body: bodyWithWords(),
  questions: [question(1), question(2), question(3), question(4)],
  ...overrides,
});

const validPack = (
  firstOverrides: Partial<ReadingContentPassage> = {},
): ReadingContentPassage[] => [
  passage(1, firstOverrides),
  ...Array.from({ length: 11 }, (_, index) => passage(index + 2)),
];

test("accepts a strict pack of twelve valid A1 passages", () => {
  assert.equal(validateReadingContentPack(validPack(), topics).length, 12);
});

test("rejects packs that do not contain exactly twelve passages", () => {
  assert.throws(
    () => validateReadingContentPack(validPack().slice(0, 11), topics),
    /exactly 12 passages/u,
  );
});

test("rejects a body outside the 80 to 120 word range", () => {
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ body: bodyWithWords(79) }),
        topics,
      ),
    /80 to 120 words/u,
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ body: bodyWithWords(121) }),
        topics,
      ),
    /80 to 120 words/u,
  );
});

test("rejects duplicate slugs and normalized question prompts", () => {
  const duplicateSlugPack = validPack();
  duplicateSlugPack[1] = passage(2, {
    slug: duplicateSlugPack[0]!.slug,
  });
  assert.throws(
    () => validateReadingContentPack(duplicateSlugPack, topics),
    /duplicate slug/u,
  );

  const duplicatePrompt = question(1, {
    prompt: "  WHAT HAPPENS IN PART 2? ",
  });
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({
          questions: [
            question(1),
            question(2),
            duplicatePrompt,
            question(4),
          ],
        }),
        topics,
      ),
    /duplicate question prompt/u,
  );
});

test("rejects duplicate options and requires exactly one correct option", () => {
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({
          questions: [
            question(1, {
              options: [
                option("Same", true),
                option(" same "),
                option("Other"),
              ],
            }),
            question(2),
            question(3),
            question(4),
          ],
        }),
        topics,
      ),
    /duplicate option/u,
  );

  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({
          questions: [
            question(1, {
              options: [option("A", true), option("B", true), option("C")],
            }),
            question(2),
            question(3),
            question(4),
          ],
        }),
        topics,
      ),
    /exactly one correct option/u,
  );
});

test("rejects unknown topics, invalid CEFR, minutes, and nested cardinality", () => {
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ topicSlug: "missing" }),
        topics,
      ),
    /unknown Topic/u,
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ cefrLevel: "A2" as "A1" }),
        topics,
      ),
    /cefrLevel/u,
  );
  assert.throws(
    () =>
      validateReadingContentPack(validPack({ estimatedMinutes: 0 }), topics),
    /estimatedMinutes/u,
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ questions: [question(1), question(2), question(3)] }),
        topics,
      ),
    /questions/u,
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({
          questions: [
            question(1, { options: [option("A", true), option("B")] }),
            question(2),
            question(3),
            question(4),
          ],
        }),
        topics,
      ),
    /options/u,
  );
});

test("strict schemas reject unknown keys at every level", () => {
  const input = validPack() as Array<
    ReadingContentPassage & { unexpected?: boolean }
  >;
  input[0]!.unexpected = true;

  assert.throws(
    () => validateReadingContentPack(input, topics),
    /unexpected|unrecognized/i,
  );
});

test("vocabulary audit normalizes punctuation and returns sorted unique findings", () => {
  const passages = [
    passage(1, {
      body: "Journey, EMMA! journey; Apple apple.",
    }),
  ];
  const catalog: VocabularyCatalogItem[] = [
    {
      word: "apple",
      normalizedWord: "apple",
      pos: "noun",
      posVi: null,
      cefrLevel: "A1",
      meaningVi: "quả táo",
      primaryMeaningVi: "quả táo",
      source: "test",
    },
    {
      word: "journey",
      normalizedWord: "journey",
      pos: "noun",
      posVi: null,
      cefrLevel: "B1",
      meaningVi: "hành trình",
      primaryMeaningVi: "hành trình",
      source: "test",
    },
    {
      word: "journey",
      normalizedWord: "journey",
      pos: "noun",
      posVi: null,
      cefrLevel: "A2",
      meaningVi: "hành trình",
      primaryMeaningVi: "hành trình",
      source: "test",
    },
  ];

  assert.deepEqual(auditReadingVocabulary(passages, catalog), {
    unknownWords: ["emma"],
    aboveA1Words: [{ word: "journey", cefrLevels: ["A2", "B1"] }],
  });
});

test("vocabulary audit does not flag a word when any catalog entry is A1", () => {
  const passages = [passage(1, { body: "Open open." })];
  const catalog = [
    {
      word: "open",
      normalizedWord: "open",
      pos: "verb",
      posVi: null,
      cefrLevel: "A1",
      meaningVi: "mở",
      primaryMeaningVi: "mở",
      source: "test",
    },
    {
      word: "open",
      normalizedWord: "open",
      pos: "adjective",
      posVi: null,
      cefrLevel: "A2",
      meaningVi: "mở",
      primaryMeaningVi: "mở",
      source: "test",
    },
  ] satisfies VocabularyCatalogItem[];

  assert.deepEqual(auditReadingVocabulary(passages, catalog), {
    unknownWords: [],
    aboveA1Words: [],
  });
});

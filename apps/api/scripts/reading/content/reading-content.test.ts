import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  auditReadingVocabulary,
  loadCanonicalReadingContent,
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
  overrides: Partial<ReadingContentPassage["questions"][number]> = {}
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
  overrides: Partial<ReadingContentPassage> = {}
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
  firstOverrides: Partial<ReadingContentPassage> = {}
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
    /exactly 12 passages/u
  );
});

test("rejects a body outside the 80 to 120 word range", () => {
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ body: bodyWithWords(79) }),
        topics
      ),
    /80 to 120 words/u
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ body: bodyWithWords(121) }),
        topics
      ),
    /80 to 120 words/u
  );
});

test("rejects duplicate slugs and normalized question prompts", () => {
  const duplicateSlugPack = validPack();
  duplicateSlugPack[1] = passage(2, {
    slug: duplicateSlugPack[0]!.slug,
  });
  assert.throws(
    () => validateReadingContentPack(duplicateSlugPack, topics),
    /duplicate slug/u
  );

  const duplicatePrompt = question(1, {
    prompt: "  WHAT HAPPENS IN PART 2? ",
  });
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({
          questions: [question(1), question(2), duplicatePrompt, question(4)],
        }),
        topics
      ),
    /duplicate question prompt/u
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
        topics
      ),
    /duplicate option/u
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
        topics
      ),
    /exactly one correct option/u
  );
});

test("rejects unknown topics, invalid CEFR, minutes, and nested cardinality", () => {
  assert.throws(
    () =>
      validateReadingContentPack(validPack({ topicSlug: "missing" }), topics),
    /unknown Topic/u
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ cefrLevel: "A2" as "A1" }),
        topics
      ),
    /cefrLevel/u
  );
  assert.throws(
    () =>
      validateReadingContentPack(validPack({ estimatedMinutes: 0 }), topics),
    /estimatedMinutes/u
  );
  assert.throws(
    () =>
      validateReadingContentPack(
        validPack({ questions: [question(1), question(2), question(3)] }),
        topics
      ),
    /questions/u
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
        topics
      ),
    /options/u
  );
});

test("strict schemas reject unknown keys at every level", () => {
  const input = validPack() as Array<
    ReadingContentPassage & { unexpected?: boolean }
  >;
  input[0]!.unexpected = true;

  assert.throws(
    () => validateReadingContentPack(input, topics),
    /unexpected|unrecognized/i
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

test("canonical Reading A1 pack keeps the reviewed topics and answer key", () => {
  const repositoryRoot = resolve(process.cwd(), "../..");
  const canonicalTopics = JSON.parse(
    readFileSync(join(repositoryRoot, "data/vocabulary/topics.json"), "utf8")
  ) as VocabularyTopicDefinition[];
  const passages = validateReadingContentPack(
    loadCanonicalReadingContent(),
    canonicalTopics
  );

  assert.deepEqual(
    passages.map(({ slug, topicSlug }) => ({ slug, topicSlug })),
    [
      {
        slug: "meeting-a-new-neighbor",
        topicSlug: "personal-information",
      },
      { slug: "sunday-with-my-family", topicSlug: "family" },
      { slug: "marias-busy-morning", topicSlug: "daily-routine" },
      { slug: "our-small-apartment", topicSlug: "home" },
      { slug: "lunch-at-the-cafe", topicSlug: "restaurant" },
      { slug: "shopping-for-a-birthday", topicSlug: "shopping" },
      { slug: "the-first-day-at-school", topicSlug: "school" },
      { slug: "a-new-part-time-job", topicSlug: "job" },
      { slug: "plans-for-a-rainy-day", topicSlug: "weather" },
      { slug: "taking-the-bus-downtown", topicSlug: "transportation" },
      { slug: "a-visit-to-the-doctor", topicSlug: "health" },
      { slug: "a-weekend-by-the-sea", topicSlug: "travel" },
    ]
  );

  assert.deepEqual(
    passages.map((passage) =>
      passage.questions.map(
        (item) =>
          item.options.find((answerOption) => answerOption.correct)!.text
      )
    ),
    [
      [
        "In the hall",
        "At a hotel",
        "Football",
        "He does not know many people in the city",
      ],
      [
        "At eight o'clock",
        "Bread and fruit",
        "They play a ball game",
        "The children's uncle",
      ],
      ["At half past six", "She drinks tea", "By bus", "At nine o'clock"],
      ["On the third floor", "Two", "Near the kitchen", "In a small garden"],
      ["At twelve thirty", "Tomato soup", "Water", "Nine euros"],
      ["A blue backpack", "Fifteen euros", "A birthday card", "By bus"],
      ["Room 12", "Ms. Lee", "Art", "Nina"],
      [
        "In a bookshop",
        "On Tuesday and Thursday",
        "Put books on shelves",
        "A black shirt",
      ],
      ["It rains", "At home", "They make soup", "The sun comes out"],
      ["At the library", "Number 6", "In front of the bank", "A map"],
      [
        "Her throat hurts",
        "At ten fifteen",
        "Drink warm water",
        "At the pharmacy",
      ],
      ["By train", "Near the beach", "They swim", "Sunday afternoon"],
    ]
  );

  assert.deepEqual(
    passages.map((item) => ({
      slug: item.slug,
      wordCount: item.body.trim().split(/\s+/u).filter(Boolean).length,
    })),
    [
      { slug: "meeting-a-new-neighbor", wordCount: 89 },
      { slug: "sunday-with-my-family", wordCount: 88 },
      { slug: "marias-busy-morning", wordCount: 91 },
      { slug: "our-small-apartment", wordCount: 96 },
      { slug: "lunch-at-the-cafe", wordCount: 99 },
      { slug: "shopping-for-a-birthday", wordCount: 100 },
      { slug: "the-first-day-at-school", wordCount: 96 },
      { slug: "a-new-part-time-job", wordCount: 100 },
      { slug: "plans-for-a-rainy-day", wordCount: 98 },
      { slug: "taking-the-bus-downtown", wordCount: 101 },
      { slug: "a-visit-to-the-doctor", wordCount: 98 },
      { slug: "a-weekend-by-the-sea", wordCount: 99 },
    ]
  );

  const catalog = JSON.parse(
    readFileSync(
      join(repositoryRoot, "data/vocabulary/vocabulary-catalog.json"),
      "utf8"
    )
  ) as VocabularyCatalogItem[];
  const audit = auditReadingVocabulary(passages, catalog);
  assert.equal(audit.unknownWords.length, 199);
  assert.deepEqual(
    audit.aboveA1Words.map(({ word }) => word),
    [
      "across",
      "after",
      "all",
      "backpack",
      "bookshop",
      "center",
      "comfortable",
      "cooking",
      "feel",
      "for",
      "go",
      "half",
      "help",
      "home",
      "in",
      "instead",
      "it",
      "journey",
      "looks",
      "manager",
      "menu",
      "minutes",
      "most",
      "ms",
      "museum",
      "next",
      "on",
      "park",
      "part",
      "pasta",
      "proud",
      "temperature",
      "throat",
    ]
  );
});

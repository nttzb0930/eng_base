import "dotenv/config";
import path from "node:path";

import * as bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";

import { createPrismaAdapter } from "../src/database/prisma/prisma.config.js";
import { ENGLISH_VOCABULARY_COURSE_CODE } from "../src/module/courses/course.constants.js";
import { vocabularyIdentity } from "./vocabulary/catalog/vocabulary-catalog.js";
import {
  loadVocabularySeedData,
  mapVocabularyTopicPersistenceData,
} from "./vocabulary/database/vocabulary-seed-data.js";
import { assertDevelopmentSeedAllowed } from "./vocabulary/database/development-seed-guard.js";

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type CurriculumCefrLevel = "A1" | "A2" | "B1" | "B2";

type VocabularySeedItem = {
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: CefrLevel;
  phonetic: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  audioUrl?: string | null;
  audioSource?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  exampleSource?: string | null;
  examples?: Array<{ exampleEn: string; exampleVi: string }> | string[];
  topics?: string[];
};

type SeedReport = {
  loadedVocabularyItems: number;
  seeded: {
    vocabularyItems: number;
    courses: number;
    units: number;
    lessons: number;
    challenges: number;
    challengeOptions: number;
  };
  byLevel: Record<CurriculumCefrLevel, { words: number; lessons: number }>;
};

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CURRICULUM_LEVELS: CurriculumCefrLevel[] = ["A1", "A2", "B1", "B2"];
const WORDS_PER_LESSON = 15;
const VOCABULARY_DATA_DIRECTORY = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary"
);

assertDevelopmentSeedAllowed(process.env);

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

const shuffle = <T>(items: T[]) => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

const isNearLevel = (level: CefrLevel, target: CefrLevel) => {
  return Math.abs(LEVELS.indexOf(level) - LEVELS.indexOf(target)) === 1;
};

const hasOverlappingMeaning = (
  target: VocabularySeedItem,
  candidate: VocabularySeedItem
) => {
  const targetPrimary = target.primaryMeaningVi.toLowerCase();
  const candidatePrimary = candidate.primaryMeaningVi.toLowerCase();
  const targetMeaning = target.meaningVi.toLowerCase();
  const candidateMeaning = candidate.meaningVi.toLowerCase();

  return (
    targetPrimary === candidatePrimary ||
    targetMeaning.includes(candidatePrimary) ||
    candidateMeaning.includes(targetPrimary)
  );
};

const getDistractors = (
  target: VocabularySeedItem,
  pool: VocabularySeedItem[],
  count = 3
) => {
  const cleanPool = pool.filter((item) => {
    if (item.normalizedWord === target.normalizedWord) return false;
    if (!item.primaryMeaningVi || !item.word) return false;
    if (hasOverlappingMeaning(target, item)) return false;
    return true;
  });

  const strategies = [
    (item: VocabularySeedItem) =>
      item.cefrLevel === target.cefrLevel && item.pos === target.pos,
    (item: VocabularySeedItem) => item.cefrLevel === target.cefrLevel,
    (item: VocabularySeedItem) => isNearLevel(item.cefrLevel, target.cefrLevel),
    () => true,
  ];

  const selected: VocabularySeedItem[] = [];

  for (const strategy of strategies) {
    const candidates = shuffle(
      cleanPool
        .filter(strategy)
        .filter(
          (item) =>
            !selected.some(
              (selectedItem) =>
                selectedItem.normalizedWord === item.normalizedWord ||
                selectedItem.primaryMeaningVi === item.primaryMeaningVi
            )
        )
    );

    for (const candidate of candidates) {
      selected.push(candidate);
      if (selected.length === count) return selected;
    }
  }

  return selected;
};

const resetDevData = async () => {
  // TOEIC Writing submissions use RESTRICT on task deletion, so remove the
  // dependent records before resetting the shared course catalog.
  await prisma.toeic_writing_assistance_events.deleteMany();
  await prisma.toeic_writing_ai_grades.deleteMany();
  await prisma.toeic_writing_image_contexts.deleteMany();
  await prisma.toeic_writing_submissions.deleteMany();
  await prisma.toeic_writing_drafts.deleteMany();
  await prisma.toeic_writing_tasks.deleteMany();
  await prisma.toeic_writing_sets.deleteMany();
  // TOEIC practice records also keep RESTRICT references to TOEIC tests,
  // which in turn belong to the course catalog being reset below.
  await prisma.toeic_reading_practice_answers.deleteMany();
  await prisma.toeic_reading_practice_sessions.deleteMany();
  await prisma.toeic_reading_attempt_answers.deleteMany();
  await prisma.toeic_reading_attempts.deleteMany();
  await prisma.toeic_reading_drafts.deleteMany();
  await prisma.toeic_listening_attempt_answers.deleteMany();
  await prisma.toeic_listening_attempts.deleteMany();
  await prisma.toeic_listening_drafts.deleteMany();
  await prisma.challenge_progress.deleteMany();
  await prisma.user_progress.deleteMany();
  await prisma.user_saved_words.deleteMany();
  await prisma.user_vocabulary_progress.deleteMany();
  await prisma.challenge_options.deleteMany();
  await prisma.challenges.deleteMany();
  await prisma.lessons.deleteMany();
  await prisma.units.deleteMany();
  await prisma.courses.deleteMany();
  await prisma.vocabulary_items.deleteMany();
  await prisma.vocabulary_topics.deleteMany();
};

const main = async () => {
  const seedData = await loadVocabularySeedData(VOCABULARY_DATA_DIRECTORY);
  const unsupportedLevels = seedData.catalog.filter(
    (item) => !LEVELS.includes(item.cefrLevel as CefrLevel)
  );
  if (unsupportedLevels.length > 0) {
    throw new Error(
      `Vocabulary seed supports ${LEVELS.join(", ")}; found ${unsupportedLevels[0]?.cefrLevel}`
    );
  }
  const vocabulary = seedData.catalog as VocabularySeedItem[];
  const report: SeedReport = {
    loadedVocabularyItems: vocabulary.length,
    seeded: {
      vocabularyItems: 0,
      courses: 0,
      units: 0,
      lessons: 0,
      challenges: 0,
      challengeOptions: 0,
    },
    byLevel: {
      A1: { words: 0, lessons: 0 },
      A2: { words: 0, lessons: 0 },
      B1: { words: 0, lessons: 0 },
      B2: { words: 0, lessons: 0 },
    },
  };

  console.log("Resetting development content and progress");
  await resetDevData();

  console.log("Seeding admin user");
  const hashedPassword = await bcrypt.hash("password123", 12);
  await prisma.users.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      username: "admin",
      full_name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("\uD83D\uDD11 Admin login: admin@example.com / password123");

  console.log("Seeding vocabulary items");
  for (const rows of chunk(vocabulary, 500)) {
    await prisma.vocabulary_items.createMany({
      data: rows.map((item) => ({
        word: item.word,
        normalized_word: item.normalizedWord,
        pos: item.pos,
        pos_vi: item.posVi,
        cefr_level: item.cefrLevel,
        phonetic: item.phonetic,
        phonetic_source: item.phonetic ? "english-vietnamese-dictionary" : null,
        audio_url: item.audioUrl ?? null,
        audio_source: item.audioSource ?? null,
        example_en: item.exampleEn ?? null,
        example_vi: item.exampleVi ?? null,
        example_source: item.exampleSource ?? null,
        meaning_vi: item.meaningVi,
        primary_meaning_vi: item.primaryMeaningVi,
        source: item.source,
      })),
    });
  }

  const insertedVocabulary = await prisma.vocabulary_items.findMany();
  report.seeded.vocabularyItems = insertedVocabulary.length;

  const vocabularyByWord = new Map(
    insertedVocabulary.map((item) => [
      `${item.normalized_word.trim().toLowerCase()}|${item.pos.trim().toLowerCase()}|${item.cefr_level.trim().toLowerCase()}`,
      item,
    ])
  );

  console.log("Seeding vocabulary examples");
  const exampleRowsToInsert: Prisma.vocabulary_examplesCreateManyInput[] = [];
  for (const item of vocabulary) {
    const key = vocabularyIdentity(item);
    const vocabItem = vocabularyByWord.get(key);
    if (!vocabItem || !item.examples) continue;

    item.examples.forEach((example, index) => {
      const exampleEn =
        typeof example === "string" ? example : example.exampleEn;
      const exampleVi =
        typeof example === "string" ? item.exampleVi : example.exampleVi;
      exampleRowsToInsert.push({
        vocabulary_item_id: vocabItem.id,
        example_en: exampleEn,
        example_vi: exampleVi ?? null,
        source: item.exampleSource ?? "free-dictionary-api",
        order: index + 1,
      });
    });
  }

  console.log("Seeding canonical vocabulary topics and relations");
  for (const topic of seedData.topics) {
    const persistenceData = mapVocabularyTopicPersistenceData(topic);
    await prisma.vocabulary_topics.upsert({
      where: { slug: topic.slug },
      update: persistenceData,
      create: {
        slug: topic.slug,
        ...persistenceData,
      },
    });
  }
  const insertedTopics = await prisma.vocabulary_topics.findMany();
  const topicIdBySlug = new Map(
    insertedTopics.map((topic) => [topic.slug, topic.id])
  );
  const relationRows = seedData.relations.map((relation) => {
    const vocabularyItem = vocabularyByWord.get(relation.vocabularyIdentity);
    const topicId = topicIdBySlug.get(relation.topicSlug);
    if (!vocabularyItem || topicId === undefined) {
      throw new Error(
        `Cannot resolve vocabulary topic relation ${relation.vocabularyIdentity} -> ${relation.topicSlug}`
      );
    }
    return {
      vocabulary_item_id: vocabularyItem.id,
      topic_id: topicId,
    };
  });
  for (const rows of chunk(relationRows, 500)) {
    await prisma.vocabulary_item_topics.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  if (exampleRowsToInsert.length > 0) {
    for (const rows of chunk(exampleRowsToInsert, 500)) {
      await prisma.vocabulary_examples.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  }

  const course = await prisma.courses.create({
    data: {
      code: ENGLISH_VOCABULARY_COURSE_CODE,
      title: "English Vocabulary",
      image_src: "/mascot.svg",
    },
  });

  report.seeded.courses = 1;

  for (const [levelIndex, level] of CURRICULUM_LEVELS.entries()) {
    const unit = await prisma.units.create({
      data: {
        course_id: course.id,
        title: `${level} Vocabulary`,
        description: `Practice core ${level} English vocabulary`,
        order: levelIndex + 1,
        cefr_level: level,
      },
    });

    report.seeded.units += 1;

    const levelWords = vocabulary.filter((item) => item.cefrLevel === level);
    report.byLevel[level].words = levelWords.length;

    for (const [lessonIndex, lessonWords] of chunk(
      levelWords,
      WORDS_PER_LESSON
    ).entries()) {
      const lessonNumber = lessonIndex + 1;
      const lesson = await prisma.lessons.create({
        data: {
          unit_id: unit.id,
          title: `${level} Words ${lessonNumber}`,
          order: lessonNumber,
        },
      });

      report.seeded.lessons += 1;
      report.byLevel[level].lessons += 1;

      const challengeRows = lessonWords.flatMap((word, wordIndex) => {
        const key = vocabularyIdentity(word);
        const vocabularyItem = vocabularyByWord.get(key);
        if (!vocabularyItem) return [];

        return [
          {
            lesson_id: lesson.id,
            vocabulary_item_id: vocabularyItem.id,
            type: "SELECT" as const,
            direction: "EN_TO_VI" as const,
            question: `What does "${word.word}" mean?`,
            order: wordIndex * 2 + 1,
          },
          {
            lesson_id: lesson.id,
            vocabulary_item_id: vocabularyItem.id,
            type: "ASSIST" as const,
            direction: "VI_TO_EN" as const,
            question: `Which word means "${word.primaryMeaningVi}"?`,
            order: wordIndex * 2 + 2,
          },
        ];
      });

      await prisma.challenges.createMany({ data: challengeRows });

      const insertedChallenges = await prisma.challenges.findMany({
        where: { lesson_id: lesson.id },
      });

      report.seeded.challenges += insertedChallenges.length;

      const optionRows = insertedChallenges.flatMap((challenge) => {
        const vocabularyItem = insertedVocabulary.find(
          (item) => item.id === challenge.vocabulary_item_id
        );
        if (!vocabularyItem) return [];

        const seedItem = vocabulary.find(
          (item) => item.normalizedWord === vocabularyItem.normalized_word
        );
        if (!seedItem) return [];

        const distractors = getDistractors(seedItem, vocabulary, 3);

        if (challenge.direction === "EN_TO_VI") {
          return shuffle([
            {
              challenge_id: challenge.id,
              text: seedItem.primaryMeaningVi,
              correct: true,
            },
            ...distractors.map((item) => ({
              challenge_id: challenge.id,
              text: item.primaryMeaningVi,
              correct: false,
            })),
          ]);
        }

        if (challenge.direction === "VI_TO_EN") {
          return shuffle([
            {
              challenge_id: challenge.id,
              text: seedItem.word,
              correct: true,
            },
            ...distractors.map((item) => ({
              challenge_id: challenge.id,
              text: item.word,
              correct: false,
            })),
          ]);
        }

        return [];
      });

      for (const rows of chunk(optionRows, 500)) {
        await prisma.challenge_options.createMany({ data: rows });
      }

      report.seeded.challengeOptions += optionRows.length;
    }
  }

  console.log("English vocabulary seed completed");
  console.log(report);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

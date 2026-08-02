import { createHash } from "node:crypto";

import { vocabularyIdentity } from "../catalog/vocabulary-catalog.js";
import type { VocabularySeedData } from "./vocabulary-seed-data.js";

const CURRICULUM_LEVELS = ["A1", "A2", "B1", "B2"] as const;
const WORDS_PER_LESSON = 15;

export type VocabularyValue = {
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic: string | null;
  phoneticSource: string | null;
  audioUrl: string | null;
  audioSource: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  exampleSource: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
};

export type ExampleValue = {
  vocabularyKey: string;
  exampleEn: string;
  exampleVi: string | null;
  source: string;
  order: number;
};

export type TopicValue = {
  slug: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  group: string;
  groupVi: string;
  order: number;
};

export type RelationValue = {
  vocabularyKey: string;
  topicSlug: string;
};

export type CourseValue = {
  code: string;
  title: string;
  imageSrc: string;
};

export type UnitValue = {
  courseCode: string;
  cefrLevel: string;
  title: string;
  description: string;
  order: number;
};

export type LessonValue = {
  unitKey: string;
  title: string;
  order: number;
};

export type ChallengeValue = {
  lessonKey: string;
  vocabularyKey: string;
  type: "SELECT" | "ASSIST";
  direction: "EN_TO_VI" | "VI_TO_EN";
  question: string;
  order: number;
};

export type OptionValue = {
  challengeKey: string;
  slot: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type DesiredRecord<T> = { key: string; value: T };
export type LiveRecord<T> = { id: number; key: string } & T;

export type VocabularyBootstrapDesiredState = {
  vocabularyItems: Array<DesiredRecord<VocabularyValue>>;
  examples: Array<DesiredRecord<ExampleValue>>;
  topics: Array<DesiredRecord<TopicValue>>;
  relations: Array<DesiredRecord<RelationValue>>;
  courses: Array<DesiredRecord<CourseValue>>;
  units: Array<DesiredRecord<UnitValue>>;
  lessons: Array<DesiredRecord<LessonValue>>;
  challenges: Array<DesiredRecord<ChallengeValue>>;
  options: Array<DesiredRecord<OptionValue>>;
};

export type VocabularyBootstrapLiveState = {
  databaseTarget: string;
  vocabularyItems: Array<LiveRecord<VocabularyValue>>;
  examples: Array<LiveRecord<ExampleValue>>;
  topics: Array<LiveRecord<TopicValue>>;
  relations: Array<LiveRecord<RelationValue>>;
  courses: Array<LiveRecord<CourseValue>>;
  units: Array<LiveRecord<UnitValue>>;
  lessons: Array<LiveRecord<LessonValue>>;
  challenges: Array<LiveRecord<ChallengeValue>>;
  options: Array<LiveRecord<OptionValue>>;
  protectedExternalRecords: number;
};

export type BootstrapAction<T> = {
  operation: "create" | "update" | "reuse";
  key: string;
  existingId?: number;
  value: T;
};

export type VocabularyBootstrapActions = {
  vocabularyItems: Array<BootstrapAction<VocabularyValue>>;
  examples: Array<BootstrapAction<ExampleValue>>;
  topics: Array<BootstrapAction<TopicValue>>;
  relations: Array<BootstrapAction<RelationValue>>;
  courses: Array<BootstrapAction<CourseValue>>;
  units: Array<BootstrapAction<UnitValue>>;
  lessons: Array<BootstrapAction<LessonValue>>;
  challenges: Array<BootstrapAction<ChallengeValue>>;
  options: Array<BootstrapAction<OptionValue>>;
};

export type BootstrapOperationCounts = {
  create: number;
  update: number;
  reuse: number;
};

export type VocabularyBootstrapSummary = {
  vocabularyItems: BootstrapOperationCounts;
  examples: BootstrapOperationCounts;
  topics: BootstrapOperationCounts;
  relations: BootstrapOperationCounts;
  courses: BootstrapOperationCounts;
  units: BootstrapOperationCounts;
  lessons: BootstrapOperationCounts;
  challenges: BootstrapOperationCounts;
  options: BootstrapOperationCounts;
  totals: BootstrapOperationCounts;
  destructiveOperations: 0;
  retainedExternalRecords: number;
};

export type VocabularyBootstrapPlan = {
  version: 1;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  desired: VocabularyBootstrapDesiredState;
  actions: VocabularyBootstrapActions;
  summary: VocabularyBootstrapSummary;
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)])
    );
  }
  return value;
};

export const sha256 = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)), "utf8")
    .digest("hex");

export const buildBootstrapConfirmation = (input: {
  databaseTarget: string;
  sourceSha256: string;
  planSha256: string;
}) => `APPLY_VOCABULARY_BOOTSTRAP_${sha256(input).slice(0, 24).toUpperCase()}`;

const chunk = <T>(values: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const desiredVocabulary = (
  source: VocabularySeedData
): Array<DesiredRecord<VocabularyValue>> =>
  source.catalog.map((item) => ({
    key: vocabularyIdentity(item),
    value: {
      word: item.word,
      normalizedWord: item.normalizedWord,
      pos: item.pos,
      posVi: item.posVi,
      cefrLevel: item.cefrLevel.toUpperCase(),
      phonetic: item.phonetic ?? null,
      phoneticSource: item.phonetic ? "english-vietnamese-dictionary" : null,
      audioUrl: item.audioUrl ?? null,
      audioSource: item.audioSource ?? null,
      exampleEn: item.exampleEn ?? null,
      exampleVi: item.exampleVi ?? null,
      exampleSource: item.exampleSource ?? null,
      meaningVi: item.meaningVi,
      primaryMeaningVi: item.primaryMeaningVi,
      source: item.source,
    },
  }));

const desiredExamples = (
  source: VocabularySeedData
): Array<DesiredRecord<ExampleValue>> =>
  source.catalog.flatMap((item) => {
    const vocabularyKey = vocabularyIdentity(item);
    return (item.examples ?? []).map((example, index) => {
      const exampleEn =
        typeof example === "string" ? example : example.exampleEn;
      const exampleVi =
        typeof example === "string"
          ? (item.exampleVi ?? null)
          : example.exampleVi;
      const order = index + 1;
      return {
        key: `${vocabularyKey}|${order}`,
        value: {
          vocabularyKey,
          exampleEn,
          exampleVi,
          source: item.exampleSource ?? "free-dictionary-api",
          order,
        },
      };
    });
  });

const desiredTopics = (
  source: VocabularySeedData
): Array<DesiredRecord<TopicValue>> =>
  [...source.topics]
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
    .map((topic) => ({
      key: topic.slug,
      value: {
        slug: topic.slug,
        title: topic.title,
        titleVi: topic.titleVi,
        description: topic.description,
        descriptionVi: topic.descriptionVi,
        group: topic.group,
        groupVi: topic.groupVi,
        order: topic.order,
      },
    }));

const desiredRelations = (
  source: VocabularySeedData
): Array<DesiredRecord<RelationValue>> =>
  [...source.relations]
    .sort((left, right) =>
      `${left.vocabularyIdentity}|${left.topicSlug}`.localeCompare(
        `${right.vocabularyIdentity}|${right.topicSlug}`
      )
    )
    .map((relation) => ({
      key: `${relation.vocabularyIdentity}|${relation.topicSlug}`,
      value: {
        vocabularyKey: relation.vocabularyIdentity,
        topicSlug: relation.topicSlug,
      },
    }));

const distractorsFor = (targetKey: string, source: VocabularySeedData) => {
  const target = source.catalog.find(
    (item) => vocabularyIdentity(item) === targetKey
  );
  if (!target) throw new Error(`Missing canonical Vocabulary ${targetKey}`);

  const sameLevel = source.catalog.filter(
    (item) => item.cefrLevel.toUpperCase() === target.cefrLevel.toUpperCase()
  );
  const pools = [sameLevel, source.catalog];
  const selected: typeof source.catalog = [];
  const meanings = new Set([target.primaryMeaningVi.trim().toLowerCase()]);
  const words = new Set([target.word.trim().toLowerCase()]);

  for (const pool of pools) {
    if (pool.length === 0) continue;
    const offset =
      Number.parseInt(sha256(`${targetKey}|${pool.length}`).slice(0, 8), 16) %
      pool.length;
    for (let step = 0; step < pool.length && selected.length < 3; step += 1) {
      const candidate = pool[(offset + step) % pool.length];
      if (!candidate || vocabularyIdentity(candidate) === targetKey) continue;
      const meaning = candidate.primaryMeaningVi.trim().toLowerCase();
      const word = candidate.word.trim().toLowerCase();
      if (meanings.has(meaning) || words.has(word)) continue;
      meanings.add(meaning);
      words.add(word);
      selected.push(candidate);
    }
  }

  if (selected.length < 3) {
    throw new Error(`Cannot build three unique distractors for ${targetKey}`);
  }
  return selected;
};

const desiredCurriculum = (source: VocabularySeedData) => {
  const courses: Array<DesiredRecord<CourseValue>> = [
    {
      key: "english-vocabulary",
      value: {
        code: "english-vocabulary",
        title: "English Vocabulary",
        imageSrc: "/mascot.svg",
      },
    },
  ];
  const units: Array<DesiredRecord<UnitValue>> = [];
  const lessons: Array<DesiredRecord<LessonValue>> = [];
  const challenges: Array<DesiredRecord<ChallengeValue>> = [];
  const options: Array<DesiredRecord<OptionValue>> = [];

  for (const [levelIndex, level] of CURRICULUM_LEVELS.entries()) {
    const unitKey = `english-vocabulary|${level}`;
    units.push({
      key: unitKey,
      value: {
        courseCode: "english-vocabulary",
        cefrLevel: level,
        title: `${level} Vocabulary`,
        description: `Practice core ${level} English vocabulary`,
        order: levelIndex + 1,
      },
    });

    const levelWords = source.catalog.filter(
      (item) => item.cefrLevel.toUpperCase() === level
    );
    for (const [lessonIndex, lessonWords] of chunk(
      levelWords,
      WORDS_PER_LESSON
    ).entries()) {
      const lessonOrder = lessonIndex + 1;
      const lessonKey = `${unitKey}|${lessonOrder}`;
      lessons.push({
        key: lessonKey,
        value: {
          unitKey,
          title: `${level} Words ${lessonOrder}`,
          order: lessonOrder,
        },
      });

      for (const [wordIndex, word] of lessonWords.entries()) {
        const vocabularyKey = vocabularyIdentity(word);
        const distractors = distractorsFor(vocabularyKey, source);
        const challengeValues: ChallengeValue[] = [
          {
            lessonKey,
            vocabularyKey,
            type: "SELECT",
            direction: "EN_TO_VI",
            question: `What does "${word.word}" mean?`,
            order: wordIndex * 2 + 1,
          },
          {
            lessonKey,
            vocabularyKey,
            type: "ASSIST",
            direction: "VI_TO_EN",
            question: `Which word means "${word.primaryMeaningVi}"?`,
            order: wordIndex * 2 + 2,
          },
        ];

        for (const challengeValue of challengeValues) {
          const challengeKey = [
            lessonKey,
            vocabularyKey,
            challengeValue.type,
            challengeValue.direction,
            challengeValue.order,
          ].join("|");
          challenges.push({ key: challengeKey, value: challengeValue });

          const answerValues = [
            {
              text:
                challengeValue.direction === "EN_TO_VI"
                  ? word.primaryMeaningVi
                  : word.word,
              correct: true,
            },
            ...distractors.map((item) => ({
              text:
                challengeValue.direction === "EN_TO_VI"
                  ? item.primaryMeaningVi
                  : item.word,
              correct: false,
            })),
          ].sort((left, right) =>
            sha256(`${challengeKey}|${left.text}`).localeCompare(
              sha256(`${challengeKey}|${right.text}`)
            )
          );

          answerValues.forEach((answer, optionIndex) => {
            const slot = optionIndex + 1;
            options.push({
              key: `${challengeKey}|${slot}`,
              value: {
                challengeKey,
                slot,
                text: answer.text,
                correct: answer.correct,
                imageSrc: null,
                audioSrc: null,
              },
            });
          });
        }
      }
    }
  }

  return { courses, units, lessons, challenges, options };
};

const buildDesiredState = (
  source: VocabularySeedData
): VocabularyBootstrapDesiredState => ({
  vocabularyItems: desiredVocabulary(source),
  examples: desiredExamples(source),
  topics: desiredTopics(source),
  relations: desiredRelations(source),
  ...desiredCurriculum(source),
});

const comparableLiveValue = <T>(record: LiveRecord<T>) => {
  const value = { ...record } as Record<string, unknown>;
  delete value.id;
  delete value.key;
  return value as T;
};

const buildActions = <T>(
  label: string,
  desired: Array<DesiredRecord<T>>,
  live: Array<LiveRecord<T>>
): Array<BootstrapAction<T>> => {
  const liveByKey = new Map<string, LiveRecord<T>>();
  for (const record of live) {
    if (liveByKey.has(record.key)) {
      throw new Error(`Ambiguous ${label} key ${record.key}`);
    }
    liveByKey.set(record.key, record);
  }

  return desired.map((record) => {
    const existing = liveByKey.get(record.key);
    if (!existing) {
      return { operation: "create", key: record.key, value: record.value };
    }
    const operation =
      sha256(comparableLiveValue(existing)) === sha256(record.value)
        ? "reuse"
        : "update";
    return {
      operation,
      key: record.key,
      existingId: existing.id,
      value: record.value,
    };
  });
};

const countsFor = <T>(actions: Array<BootstrapAction<T>>) => ({
  create: actions.filter((action) => action.operation === "create").length,
  update: actions.filter((action) => action.operation === "update").length,
  reuse: actions.filter((action) => action.operation === "reuse").length,
});

const sortedLiveState = (live: VocabularyBootstrapLiveState) =>
  Object.fromEntries(
    Object.entries(live).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? [...value].sort((left, right) =>
            String((left as { key?: unknown }).key).localeCompare(
              String((right as { key?: unknown }).key)
            )
          )
        : value,
    ])
  );

export const fingerprintVocabularyBootstrapLiveState = (
  live: VocabularyBootstrapLiveState
) => sha256(sortedLiveState(live));

export function buildVocabularyBootstrapPlan(
  source: VocabularySeedData,
  live: VocabularyBootstrapLiveState
): VocabularyBootstrapPlan {
  const desired = buildDesiredState(source);
  const actions: VocabularyBootstrapActions = {
    vocabularyItems: buildActions(
      "Vocabulary",
      desired.vocabularyItems,
      live.vocabularyItems
    ),
    examples: buildActions("example", desired.examples, live.examples),
    topics: buildActions("Topic", desired.topics, live.topics),
    relations: buildActions("relation", desired.relations, live.relations),
    courses: buildActions("Course", desired.courses, live.courses),
    units: buildActions("Unit", desired.units, live.units),
    lessons: buildActions("Lesson", desired.lessons, live.lessons),
    challenges: buildActions("Challenge", desired.challenges, live.challenges),
    options: buildActions("Option", desired.options, live.options),
  };
  const resourceCounts = {
    vocabularyItems: countsFor(actions.vocabularyItems),
    examples: countsFor(actions.examples),
    topics: countsFor(actions.topics),
    relations: countsFor(actions.relations),
    courses: countsFor(actions.courses),
    units: countsFor(actions.units),
    lessons: countsFor(actions.lessons),
    challenges: countsFor(actions.challenges),
    options: countsFor(actions.options),
  };
  const totals = Object.values(resourceCounts).reduce<BootstrapOperationCounts>(
    (sum, counts) => ({
      create: sum.create + counts.create,
      update: sum.update + counts.update,
      reuse: sum.reuse + counts.reuse,
    }),
    { create: 0, update: 0, reuse: 0 }
  );
  const summary: VocabularyBootstrapSummary = {
    ...resourceCounts,
    totals,
    destructiveOperations: 0,
    retainedExternalRecords: live.protectedExternalRecords,
  };
  const sourceSha256 = sha256(source);
  const liveSha256 = fingerprintVocabularyBootstrapLiveState(live);
  const core = {
    version: 1 as const,
    databaseTarget: live.databaseTarget,
    sourceSha256,
    liveSha256,
    desired,
    actions,
    summary,
  };
  const planSha256 = sha256(core);

  return {
    ...core,
    planSha256,
    confirmation: buildBootstrapConfirmation({
      databaseTarget: live.databaseTarget,
      sourceSha256,
      planSha256,
    }),
  };
}

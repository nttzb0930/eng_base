import { Prisma, type PrismaClient } from "@prisma/client";

import { vocabularyIdentity } from "../catalog/vocabulary-catalog.js";
import {
  fingerprintVocabularyBootstrapLiveState,
  sha256,
  type BootstrapAction,
  type ChallengeValue,
  type CourseValue,
  type ExampleValue,
  type LessonValue,
  type LiveRecord,
  type OptionValue,
  type RelationValue,
  type TopicValue,
  type UnitValue,
  type VocabularyBootstrapLiveState,
  type VocabularyBootstrapPlan,
  type VocabularyBootstrapSummary,
  type VocabularyValue,
} from "./vocabulary-bootstrap-plan.js";

const ADVISORY_LOCK_ID = 1_162_758_234;
const WRITE_CHUNK_SIZE = 500;

type PrismaReadClient = Prisma.TransactionClient;

export type VocabularyBootstrapExecutionReport = {
  mode: "dry-run" | "apply";
  committed: boolean;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  summary: VocabularyBootstrapSummary;
};

export type VocabularyBootstrapTransactionHost<TTransaction> = {
  $transaction<T>(
    callback: (transaction: TTransaction) => Promise<T>,
    options?: {
      isolationLevel?: "Serializable";
      maxWait?: number;
      timeout?: number;
    }
  ): Promise<T>;
};

export type VocabularyBootstrapStoreDependencies<TTransaction = unknown> = {
  acquireLock(transaction: TTransaction): Promise<void>;
  loadLiveState(
    transaction: TTransaction,
    databaseTarget: string
  ): Promise<VocabularyBootstrapLiveState>;
  applyPlan(
    transaction: TTransaction,
    plan: VocabularyBootstrapPlan
  ): Promise<VocabularyBootstrapSummary>;
};

class DryRunRollback extends Error {
  constructor(readonly report: VocabularyBootstrapExecutionReport) {
    super("ROLLBACK_VOCABULARY_BOOTSTRAP_DRY_RUN");
  }
}

const chunks = <T>(values: T[], size = WRITE_CHUNK_SIZE) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const createActions = <T>(actions: Array<BootstrapAction<T>>) =>
  actions.filter((action) => action.operation === "create");

const updateActions = <T>(actions: Array<BootstrapAction<T>>) =>
  actions.filter(
    (action): action is BootstrapAction<T> & { existingId: number } =>
      action.operation === "update" && action.existingId !== undefined
  );

const vocabularyPersistence = (value: VocabularyValue) => ({
  word: value.word,
  normalized_word: value.normalizedWord,
  pos: value.pos,
  pos_vi: value.posVi,
  cefr_level: value.cefrLevel,
  phonetic: value.phonetic,
  phonetic_source: value.phoneticSource,
  audio_url: value.audioUrl,
  audio_source: value.audioSource,
  example_en: value.exampleEn,
  example_vi: value.exampleVi,
  example_source: value.exampleSource,
  meaning_vi: value.meaningVi,
  primary_meaning_vi: value.primaryMeaningVi,
  source: value.source,
});

const topicPersistence = (value: TopicValue) => ({
  slug: value.slug,
  title: value.title,
  title_vi: value.titleVi,
  description: value.description,
  description_vi: value.descriptionVi,
  group_name: value.group,
  group_name_vi: value.groupVi,
  order: value.order,
});

const executeUpdates = async <T>(
  actions: Array<BootstrapAction<T> & { existingId: number }>,
  update: (
    action: BootstrapAction<T> & { existingId: number }
  ) => Promise<unknown>
) => {
  for (const actionChunk of chunks(actions, 50)) {
    await Promise.all(actionChunk.map(update));
  }
};

const mappedVocabularyValue = (row: {
  word: string;
  normalized_word: string;
  pos: string;
  pos_vi: string | null;
  cefr_level: string;
  phonetic: string | null;
  phonetic_source: string | null;
  audio_url: string | null;
  audio_source: string | null;
  example_en: string | null;
  example_vi: string | null;
  example_source: string | null;
  meaning_vi: string;
  primary_meaning_vi: string;
  source: string;
}): VocabularyValue => ({
  word: row.word,
  normalizedWord: row.normalized_word,
  pos: row.pos,
  posVi: row.pos_vi,
  cefrLevel: row.cefr_level,
  phonetic: row.phonetic,
  phoneticSource: row.phonetic_source,
  audioUrl: row.audio_url,
  audioSource: row.audio_source,
  exampleEn: row.example_en,
  exampleVi: row.example_vi,
  exampleSource: row.example_source,
  meaningVi: row.meaning_vi,
  primaryMeaningVi: row.primary_meaning_vi,
  source: row.source,
});

export async function loadVocabularyBootstrapState(
  client: PrismaReadClient,
  databaseTarget: string
): Promise<VocabularyBootstrapLiveState> {
  const [
    vocabularyRows,
    topicRows,
    relationRows,
    courseRows,
    externalCourseCount,
    toeicTestCount,
    readingPassageCount,
    grammarSnapshotCount,
    userCount,
    practiceSessionCount,
  ] = await Promise.all([
    client.vocabulary_items.findMany({
      include: { vocabulary_examples: true },
      orderBy: { id: "asc" },
    }),
    client.vocabulary_topics.findMany({ orderBy: { id: "asc" } }),
    client.vocabulary_item_topics.findMany({ orderBy: { id: "asc" } }),
    client.courses.findMany({
      where: { code: "english-vocabulary" },
      include: {
        units: {
          include: {
            lessons: {
              include: {
                challenges: { include: { challenge_options: true } },
              },
            },
          },
        },
      },
    }),
    client.courses.count({ where: { code: { not: "english-vocabulary" } } }),
    client.toeic_tests.count(),
    client.reading_passages.count(),
    client.grammar_content_snapshots.count(),
    client.users.count(),
    client.practice_sessions.count(),
  ]);

  const vocabularyItems: Array<LiveRecord<VocabularyValue>> = [];
  const examples: Array<LiveRecord<ExampleValue>> = [];
  const vocabularyKeyById = new Map<number, string>();
  for (const row of vocabularyRows) {
    const key = vocabularyIdentity({
      normalizedWord: row.normalized_word,
      pos: row.pos,
      cefrLevel: row.cefr_level,
      word: row.word,
      posVi: row.pos_vi,
      meaningVi: row.meaning_vi,
      primaryMeaningVi: row.primary_meaning_vi,
      source: row.source,
    });
    vocabularyKeyById.set(row.id, key);
    vocabularyItems.push({ id: row.id, key, ...mappedVocabularyValue(row) });
    for (const example of row.vocabulary_examples) {
      examples.push({
        id: example.id,
        key: `${key}|${example.example_en}`,
        vocabularyKey: key,
        exampleEn: example.example_en,
        exampleVi: example.example_vi,
        source: example.source,
        order: example.order,
      });
    }
  }

  const topics: Array<LiveRecord<TopicValue>> = topicRows.map((row) => ({
    id: row.id,
    key: row.slug,
    slug: row.slug,
    title: row.title,
    titleVi: row.title_vi ?? "",
    description: row.description,
    descriptionVi: row.description_vi ?? "",
    group: row.group_name ?? "",
    groupVi: row.group_name_vi ?? "",
    order: row.order,
  }));
  const topicSlugById = new Map(topicRows.map((row) => [row.id, row.slug]));
  const relations: Array<LiveRecord<RelationValue>> = relationRows.flatMap(
    (row) => {
      const vocabularyKey = vocabularyKeyById.get(row.vocabulary_item_id);
      const topicSlug = topicSlugById.get(row.topic_id);
      if (!vocabularyKey || !topicSlug) return [];
      return [
        {
          id: row.id,
          key: `${vocabularyKey}|${topicSlug}`,
          vocabularyKey,
          topicSlug,
        },
      ];
    }
  );

  const courses: Array<LiveRecord<CourseValue>> = [];
  const units: Array<LiveRecord<UnitValue>> = [];
  const lessons: Array<LiveRecord<LessonValue>> = [];
  const challenges: Array<LiveRecord<ChallengeValue>> = [];
  const options: Array<LiveRecord<OptionValue>> = [];
  let retainedOwnedRecords = 0;

  for (const course of courseRows) {
    courses.push({
      id: course.id,
      key: course.code,
      code: course.code,
      title: course.title,
      imageSrc: course.image_src,
    });
    for (const unit of course.units) {
      if (!unit.cefr_level) {
        retainedOwnedRecords += 1;
        continue;
      }
      const unitKey = `${course.code}|${unit.cefr_level}`;
      units.push({
        id: unit.id,
        key: unitKey,
        courseCode: course.code,
        cefrLevel: unit.cefr_level,
        title: unit.title,
        description: unit.description,
        order: unit.order,
      });
      for (const lesson of unit.lessons) {
        const lessonKey = `${unitKey}|${lesson.order}`;
        lessons.push({
          id: lesson.id,
          key: lessonKey,
          unitKey,
          title: lesson.title,
          order: lesson.order,
        });
        for (const challenge of lesson.challenges) {
          const vocabularyKey =
            challenge.vocabulary_item_id === null
              ? undefined
              : vocabularyKeyById.get(challenge.vocabulary_item_id);
          if (
            !vocabularyKey ||
            !challenge.direction ||
            (challenge.type !== "SELECT" && challenge.type !== "ASSIST")
          ) {
            retainedOwnedRecords += 1;
            continue;
          }
          const challengeKey = [
            lessonKey,
            vocabularyKey,
            challenge.type,
            challenge.direction,
            challenge.order,
          ].join("|");
          challenges.push({
            id: challenge.id,
            key: challengeKey,
            lessonKey,
            vocabularyKey,
            type: challenge.type,
            direction: challenge.direction,
            question: challenge.question,
            order: challenge.order,
          });
          const challengeOptions = [...challenge.challenge_options].sort(
            (left, right) => left.id - right.id
          );
          if (challengeOptions.length > 4) {
            throw new Error(`Ambiguous Option slots for ${challengeKey}`);
          }
          challengeOptions.forEach((option, optionIndex) => {
            const slot = optionIndex + 1;
            options.push({
              id: option.id,
              key: `${challengeKey}|${slot}`,
              challengeKey,
              slot,
              text: option.text,
              correct: option.correct,
              imageSrc: option.image_src,
              audioSrc: option.audio_src,
            });
          });
        }
      }
    }
  }

  return {
    databaseTarget,
    vocabularyItems,
    examples,
    topics,
    relations,
    courses,
    units,
    lessons,
    challenges,
    options,
    protectedExternalRecords:
      externalCourseCount +
      toeicTestCount +
      readingPassageCount +
      grammarSnapshotCount +
      userCount +
      practiceSessionCount +
      retainedOwnedRecords,
  };
}

const assertDesiredStateApplied = (
  plan: VocabularyBootstrapPlan,
  live: VocabularyBootstrapLiveState
) => {
  for (const resource of Object.keys(plan.desired) as Array<
    keyof typeof plan.desired
  >) {
    const liveByKey = new Map(
      live[resource].map((record) => [record.key, record])
    );
    for (const desired of plan.desired[resource]) {
      const record = liveByKey.get(desired.key);
      if (!record) {
        throw new Error(
          `Bootstrap invariant failed: missing ${resource} ${desired.key}`
        );
      }
      const value = { ...record } as Record<string, unknown>;
      delete value.id;
      delete value.key;
      if (sha256(value) !== sha256(desired.value)) {
        throw new Error(
          `Bootstrap invariant failed: drifted ${resource} ${desired.key}`
        );
      }
    }
  }
};

export async function applyVocabularyBootstrapPlan(
  client: PrismaReadClient,
  plan: VocabularyBootstrapPlan
): Promise<VocabularyBootstrapSummary> {
  const vocabularyCreates = createActions(plan.actions.vocabularyItems);
  for (const actionChunk of chunks(vocabularyCreates)) {
    await client.vocabulary_items.createMany({
      data: actionChunk.map((action) => vocabularyPersistence(action.value)),
    });
  }
  await executeUpdates(updateActions(plan.actions.vocabularyItems), (action) =>
    client.vocabulary_items.update({
      where: { id: action.existingId },
      data: vocabularyPersistence(action.value),
    })
  );
  const vocabularyRows = await client.vocabulary_items.findMany();
  const vocabularyIdByKey = new Map(
    vocabularyRows.map((row) => [
      vocabularyIdentity({
        normalizedWord: row.normalized_word,
        pos: row.pos,
        cefrLevel: row.cefr_level,
        word: row.word,
        posVi: row.pos_vi,
        meaningVi: row.meaning_vi,
        primaryMeaningVi: row.primary_meaning_vi,
        source: row.source,
      }),
      row.id,
    ])
  );

  const topicCreates = createActions(plan.actions.topics);
  for (const actionChunk of chunks(topicCreates)) {
    await client.vocabulary_topics.createMany({
      data: actionChunk.map((action) => topicPersistence(action.value)),
    });
  }
  await executeUpdates(updateActions(plan.actions.topics), (action) =>
    client.vocabulary_topics.update({
      where: { id: action.existingId },
      data: topicPersistence(action.value),
    })
  );
  const topicRows = await client.vocabulary_topics.findMany();
  const topicIdBySlug = new Map(topicRows.map((row) => [row.slug, row.id]));

  const exampleCreates = createActions(plan.actions.examples).map((action) => ({
    vocabulary_item_id: requiredId(
      vocabularyIdByKey,
      action.value.vocabularyKey,
      "Vocabulary"
    ),
    example_en: action.value.exampleEn,
    example_vi: action.value.exampleVi,
    source: action.value.source,
    order: action.value.order,
  }));
  for (const rowChunk of chunks(exampleCreates)) {
    await client.vocabulary_examples.createMany({ data: rowChunk });
  }
  await executeUpdates(updateActions(plan.actions.examples), (action) =>
    client.vocabulary_examples.update({
      where: { id: action.existingId },
      data: {
        example_en: action.value.exampleEn,
        example_vi: action.value.exampleVi,
        source: action.value.source,
        order: action.value.order,
      },
    })
  );

  const relationCreates = createActions(plan.actions.relations).map(
    (action) => ({
      vocabulary_item_id: requiredId(
        vocabularyIdByKey,
        action.value.vocabularyKey,
        "Vocabulary"
      ),
      topic_id: requiredId(topicIdBySlug, action.value.topicSlug, "Topic"),
    })
  );
  for (const rowChunk of chunks(relationCreates)) {
    await client.vocabulary_item_topics.createMany({ data: rowChunk });
  }

  for (const action of createActions(plan.actions.courses)) {
    await client.courses.create({
      data: {
        code: action.value.code,
        title: action.value.title,
        image_src: action.value.imageSrc,
      },
    });
  }
  await executeUpdates(updateActions(plan.actions.courses), (action) =>
    client.courses.update({
      where: { id: action.existingId },
      data: { title: action.value.title, image_src: action.value.imageSrc },
    })
  );
  const course = await client.courses.findUniqueOrThrow({
    where: { code: "english-vocabulary" },
  });

  const unitCreates = createActions(plan.actions.units).map((action) => ({
    course_id: course.id,
    title: action.value.title,
    description: action.value.description,
    order: action.value.order,
    cefr_level: action.value.cefrLevel,
  }));
  if (unitCreates.length > 0) {
    await client.units.createMany({ data: unitCreates });
  }
  await executeUpdates(updateActions(plan.actions.units), (action) =>
    client.units.update({
      where: { id: action.existingId },
      data: {
        title: action.value.title,
        description: action.value.description,
        order: action.value.order,
        cefr_level: action.value.cefrLevel,
      },
    })
  );
  const unitRows = await client.units.findMany({
    where: { course_id: course.id },
  });
  const unitIdByKey = new Map(
    unitRows.flatMap((row) =>
      row.cefr_level
        ? [[`english-vocabulary|${row.cefr_level}`, row.id] as const]
        : []
    )
  );

  const lessonCreates = createActions(plan.actions.lessons).map((action) => ({
    unit_id: requiredId(unitIdByKey, action.value.unitKey, "Unit"),
    title: action.value.title,
    order: action.value.order,
  }));
  for (const rowChunk of chunks(lessonCreates)) {
    await client.lessons.createMany({ data: rowChunk });
  }
  await executeUpdates(updateActions(plan.actions.lessons), (action) =>
    client.lessons.update({
      where: { id: action.existingId },
      data: { title: action.value.title, order: action.value.order },
    })
  );
  const lessonRows = await client.lessons.findMany({
    where: { unit_id: { in: [...unitIdByKey.values()] } },
  });
  const unitKeyById = new Map(
    [...unitIdByKey.entries()].map(([key, id]) => [id, key])
  );
  const lessonIdByKey = new Map(
    lessonRows.flatMap((row) => {
      const unitKey = unitKeyById.get(row.unit_id);
      return unitKey ? [[`${unitKey}|${row.order}`, row.id] as const] : [];
    })
  );

  const challengeCreates = createActions(plan.actions.challenges).map(
    (action) => ({
      lesson_id: requiredId(lessonIdByKey, action.value.lessonKey, "Lesson"),
      vocabulary_item_id: requiredId(
        vocabularyIdByKey,
        action.value.vocabularyKey,
        "Vocabulary"
      ),
      type: action.value.type,
      direction: action.value.direction,
      question: action.value.question,
      order: action.value.order,
    })
  );
  for (const rowChunk of chunks(challengeCreates)) {
    await client.challenges.createMany({ data: rowChunk });
  }
  await executeUpdates(updateActions(plan.actions.challenges), (action) =>
    client.challenges.update({
      where: { id: action.existingId },
      data: {
        lesson_id: requiredId(lessonIdByKey, action.value.lessonKey, "Lesson"),
        vocabulary_item_id: requiredId(
          vocabularyIdByKey,
          action.value.vocabularyKey,
          "Vocabulary"
        ),
        type: action.value.type,
        direction: action.value.direction,
        question: action.value.question,
        order: action.value.order,
      },
    })
  );
  const challengeRows = await client.challenges.findMany({
    where: { lesson_id: { in: [...lessonIdByKey.values()] } },
  });
  const lessonKeyById = new Map(
    [...lessonIdByKey.entries()].map(([key, id]) => [id, key])
  );
  const vocabularyKeyById = new Map(
    [...vocabularyIdByKey.entries()].map(([key, id]) => [id, key])
  );
  const challengeIdByKey = new Map(
    challengeRows.flatMap((row) => {
      const lessonKey = lessonKeyById.get(row.lesson_id);
      const vocabularyKey = row.vocabulary_item_id
        ? vocabularyKeyById.get(row.vocabulary_item_id)
        : undefined;
      if (!lessonKey || !vocabularyKey || !row.direction) return [];
      return [
        [
          [lessonKey, vocabularyKey, row.type, row.direction, row.order].join(
            "|"
          ),
          row.id,
        ] as const,
      ];
    })
  );

  const optionCreates = createActions(plan.actions.options).map((action) => ({
    challenge_id: requiredId(
      challengeIdByKey,
      action.value.challengeKey,
      "Challenge"
    ),
    text: action.value.text,
    correct: action.value.correct,
    image_src: action.value.imageSrc,
    audio_src: action.value.audioSrc,
  }));
  for (const rowChunk of chunks(optionCreates)) {
    await client.challenge_options.createMany({ data: rowChunk });
  }
  await executeUpdates(updateActions(plan.actions.options), (action) =>
    client.challenge_options.update({
      where: { id: action.existingId },
      data: {
        text: action.value.text,
        correct: action.value.correct,
        image_src: action.value.imageSrc,
        audio_src: action.value.audioSrc,
      },
    })
  );

  const after = await loadVocabularyBootstrapState(client, plan.databaseTarget);
  assertDesiredStateApplied(plan, after);
  if (after.protectedExternalRecords !== plan.summary.retainedExternalRecords) {
    throw new Error("Bootstrap invariant failed: protected records changed");
  }
  return plan.summary;
}

const requiredId = (
  values: Map<string, number>,
  key: string,
  label: string
) => {
  const id = values.get(key);
  if (id === undefined) throw new Error(`Missing ${label} ID for ${key}`);
  return id;
};

export const prismaVocabularyBootstrapDependencies: VocabularyBootstrapStoreDependencies<Prisma.TransactionClient> =
  {
    async acquireLock(transaction) {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`
      );
    },
    loadLiveState: loadVocabularyBootstrapState,
    applyPlan: applyVocabularyBootstrapPlan,
  };

export async function executeVocabularyBootstrap<TTransaction>(
  client: VocabularyBootstrapTransactionHost<TTransaction>,
  plan: VocabularyBootstrapPlan,
  mode: "dry-run" | "apply",
  dependencies: VocabularyBootstrapStoreDependencies<TTransaction>
): Promise<VocabularyBootstrapExecutionReport> {
  try {
    return await client.$transaction(
      async (transaction) => {
        await dependencies.acquireLock(transaction);
        const current = await dependencies.loadLiveState(
          transaction,
          plan.databaseTarget
        );
        if (
          fingerprintVocabularyBootstrapLiveState(current) !== plan.liveSha256
        ) {
          throw new Error(
            "Live database changed after planning; create a new Vocabulary bootstrap plan"
          );
        }
        const summary = await dependencies.applyPlan(transaction, plan);
        const report: VocabularyBootstrapExecutionReport = {
          mode,
          committed: mode === "apply",
          databaseTarget: plan.databaseTarget,
          sourceSha256: plan.sourceSha256,
          liveSha256: plan.liveSha256,
          planSha256: plan.planSha256,
          summary,
        };
        if (mode === "dry-run") throw new DryRunRollback(report);
        return report;
      },
      {
        isolationLevel: "Serializable",
        maxWait: 30_000,
        timeout: 900_000,
      }
    );
  } catch (error) {
    if (error instanceof DryRunRollback) {
      return { ...error.report, committed: false };
    }
    throw error;
  }
}

export const executePrismaVocabularyBootstrap = (
  client: PrismaClient,
  plan: VocabularyBootstrapPlan,
  mode: "dry-run" | "apply"
) =>
  executeVocabularyBootstrap(
    client,
    plan,
    mode,
    prismaVocabularyBootstrapDependencies
  );

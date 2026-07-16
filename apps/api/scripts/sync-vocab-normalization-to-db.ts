import "dotenv/config";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  sha256,
  type NormalizationOutputRecord,
} from "./lib/vocab-normalization.js";

type DbExample = {
  id: number;
  example_en: string;
  example_vi: string | null;
  source: string;
  order: number;
};

type DbOption = {
  id: number;
  text: string;
  correct: boolean;
  image_src: string | null;
  audio_src: string | null;
};

type DbChallenge = {
  id: number;
  lesson_id: number;
  type: string;
  direction: string | null;
  question: string;
  order: number;
  challenge_options: DbOption[];
};

type DbItem = {
  id: number;
  word: string;
  normalized_word: string;
  pos: string;
  pos_vi: string | null;
  cefr_level: string;
  example_en: string | null;
  example_vi: string | null;
  example_source: string | null;
  meaning_vi: string;
  primary_meaning_vi: string;
  vocabulary_examples: DbExample[];
  challenges: DbChallenge[];
};

type Snapshot = {
  exportedAt: string;
  counts: { vocabularyItems: number };
  records: DbItem[];
};

type ProposalRecord = {
  id: number;
  word: string;
  normalized_word: string;
  cefr_level: string;
  pos: string;
  after: NormalizationOutputRecord;
  changed_fields: string[];
  status: "proposed" | "needs_review" | "unchanged";
};

type Proposal = {
  generatedAt: string;
  sourceSnapshotSha256: string;
  totalRecords: number;
  needsReviewRecords: number;
  databaseUpdated: boolean;
  records: ProposalRecord[];
};

type Validation = {
  expectedRecords: number;
  validRecords: number;
  missingBatches: string[];
  issueCount: number;
  readyForReview: boolean;
};

type DryRunReport = {
  action: "live-dry-run-passed";
  sourceSnapshotSha256: string;
  readyToApply: boolean;
  databaseUpdated: false;
  driftErrors: string[];
};

type VocabularyRow = {
  id: number;
  pos_vi: string;
  primary_meaning_vi: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
  example_source: string;
};

type ExampleRow = {
  vocabulary_item_id: number;
  example_en: string;
  example_vi: string;
  source: string;
  order: number;
};

type ChallengeRow = { id: number; question: string };
type OptionRow = { id: number; text: string };

const RECORD_COUNT = 3_000;
const EXAMPLE_COUNT = 10;
const CONFIRMATION = "APPLY_3000_VOCABULARY_RECORDS";
const NORMALIZATION_SOURCE = "ai-normalization:gemini-3.1-flash-lite-reviewed";
const repositoryRoot = path.resolve(process.cwd(), "../..");
const dataDirectory = path.join(repositoryRoot, "data/vocabulary");
const snapshotPath = path.join(dataDirectory, "vocab-db-snapshot.json");
const proposalPath = path.join(dataDirectory, "vocab-normalized-proposal.json");
const validationPath = path.join(
  dataDirectory,
  "vocab-normalization-validation.json"
);
const planPath = path.join(dataDirectory, "vocab-db-update-plan.json");
const dryRunPath = path.join(dataDirectory, "vocab-db-dry-run.json");
const previewPath = path.join(dataDirectory, "vocab-db-normalized-preview.json");
const auditPath = path.join(dataDirectory, "vocab-db-update-audit.json");
const backupDirectory = path.join(dataDirectory, "backups");

const readJson = async <T>(filePath: string) => {
  const text = await readFile(filePath, "utf8");
  return { text, value: JSON.parse(text) as T };
};

const writeJson = async (filePath: string, value: unknown) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
};

const chunks = <T>(values: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const normalizeExamples = (examples: DbExample[]) =>
  [...examples]
    .sort((left, right) => left.order - right.order || left.id - right.id)
    .map(({ id, example_en, example_vi, source, order }) => ({
      id,
      example_en,
      example_vi,
      source,
      order,
    }));

const normalizeChallenges = (challenges: DbChallenge[]) =>
  [...challenges]
    .sort((left, right) => left.id - right.id)
    .map((challenge) => ({
      ...challenge,
      challenge_options: [...challenge.challenge_options].sort(
        (left, right) => left.id - right.id
      ),
    }));

const questionFor = (
  challenge: DbChallenge,
  word: string,
  meaning: string
) => {
  if (challenge.direction === "EN_TO_VI") {
    return `What does "${word}" mean?`;
  }
  if (challenge.direction === "VI_TO_EN") {
    return `Which word means "${meaning}"?`;
  }
  return challenge.question;
};

const validateArtifacts = (
  snapshotText: string,
  snapshot: Snapshot,
  proposal: Proposal,
  validation: Validation
) => {
  const errors: string[] = [];
  if (sha256(snapshotText) !== proposal.sourceSnapshotSha256) {
    errors.push("Hash snapshot không khớp proposal.");
  }
  if (
    snapshot.records.length !== RECORD_COUNT ||
    snapshot.counts.vocabularyItems !== RECORD_COUNT
  ) {
    errors.push(`Snapshot không có đủ ${RECORD_COUNT} từ.`);
  }
  if (
    proposal.totalRecords !== RECORD_COUNT ||
    proposal.records.length !== RECORD_COUNT
  ) {
    errors.push(`Proposal không có đủ ${RECORD_COUNT} từ.`);
  }
  if (proposal.needsReviewRecords !== 0 || proposal.databaseUpdated) {
    errors.push("Proposal chưa ở trạng thái sẵn sàng apply.");
  }
  if (
    validation.expectedRecords !== RECORD_COUNT ||
    validation.validRecords !== RECORD_COUNT ||
    validation.issueCount !== 0 ||
    validation.missingBatches.length !== 0 ||
    !validation.readyForReview
  ) {
    errors.push("Validation tổng chưa đạt.");
  }

  const sourceById = new Map(snapshot.records.map((record) => [record.id, record]));
  const ids = new Set<number>();
  for (const record of proposal.records) {
    const source = sourceById.get(record.id);
    if (ids.has(record.id)) errors.push(`Proposal trùng id=${record.id}.`);
    ids.add(record.id);
    if (!source) {
      errors.push(`Proposal có id=${record.id} không thuộc snapshot.`);
      continue;
    }
    if (
      source.word !== record.word ||
      source.normalized_word !== record.normalized_word ||
      source.pos !== record.pos ||
      source.cefr_level !== record.cefr_level
    ) {
      errors.push(`id=${record.id}: field bất biến không khớp snapshot.`);
    }
    if (record.status !== "proposed" || record.after.review_required) {
      errors.push(`id=${record.id}: chưa hoàn tất review.`);
    }
    if (record.after.examples_clean.length !== EXAMPLE_COUNT) {
      errors.push(`id=${record.id}: không có đúng ${EXAMPLE_COUNT} ví dụ.`);
    }
  }
  if (ids.size !== RECORD_COUNT) errors.push("Proposal có id thiếu hoặc trùng.");
  if (errors.length > 0) throw new Error(errors.join("\n"));
};

const buildRows = (snapshot: Snapshot, proposal: Proposal) => {
  const snapshotById = new Map(snapshot.records.map((record) => [record.id, record]));
  const vocabulary: VocabularyRow[] = [];
  const examples: ExampleRow[] = [];
  const challenges: ChallengeRow[] = [];
  const options: OptionRow[] = [];

  for (const record of proposal.records) {
    const after = record.after;
    vocabulary.push({
      id: record.id,
      pos_vi: after.pos_vi_clean,
      primary_meaning_vi: after.quiz_meaning_vi,
      meaning_vi: after.meaning_vi_clean,
      example_en: after.example_en_clean,
      example_vi: after.example_vi_clean,
      example_source: NORMALIZATION_SOURCE,
    });
    after.examples_clean.forEach((example, index) => {
      examples.push({
        vocabulary_item_id: record.id,
        example_en: example.example_en,
        example_vi: example.example_vi,
        source: NORMALIZATION_SOURCE,
        order: index + 1,
      });
    });
    for (const challenge of snapshotById.get(record.id)!.challenges) {
      const question = questionFor(challenge, record.word, after.quiz_meaning_vi);
      if (question !== challenge.question) challenges.push({ id: challenge.id, question });
      const correctText =
        challenge.direction === "EN_TO_VI"
          ? after.quiz_meaning_vi
          : challenge.direction === "VI_TO_EN"
            ? record.word
            : null;
      if (correctText !== null) {
        for (const option of challenge.challenge_options.filter(
          (item) => item.correct && item.text !== correctText
        )) {
          options.push({ id: option.id, text: correctText });
        }
      }
    }
  }
  return { vocabulary, examples, challenges, options };
};

const buildFullPreview = (snapshot: Snapshot, proposal: Proposal) => {
  const generatedAt = new Date().toISOString();
  const proposalById = new Map(
    proposal.records.map((record) => [record.id, record])
  );
  const records = snapshot.records.map((source) => {
    const proposalRecord = proposalById.get(source.id);
    if (!proposalRecord) {
      throw new Error(`Preview thiếu proposal cho id=${source.id}.`);
    }
    const after = proposalRecord.after;
    const challenges = source.challenges.map((challenge) => {
      const correctText =
        challenge.direction === "EN_TO_VI"
          ? after.quiz_meaning_vi
          : challenge.direction === "VI_TO_EN"
            ? proposalRecord.word
            : null;
      return {
        ...challenge,
        question: questionFor(
          challenge,
          proposalRecord.word,
          after.quiz_meaning_vi
        ),
        challenge_options: challenge.challenge_options.map((option) => ({
          ...option,
          text:
            option.correct && correctText !== null ? correctText : option.text,
        })),
      };
    });
    return {
      ...source,
      pos_vi: after.pos_vi_clean,
      primary_meaning_vi: after.quiz_meaning_vi,
      meaning_vi: after.meaning_vi_clean,
      example_en: after.example_en_clean,
      example_vi: after.example_vi_clean,
      example_source: NORMALIZATION_SOURCE,
      updated_at: generatedAt,
      vocabulary_examples: after.examples_clean.map((example, index) => ({
        id: null,
        example_en: example.example_en,
        example_vi: example.example_vi,
        source: NORMALIZATION_SOURCE,
        order: index + 1,
        created_at: generatedAt,
      })),
      challenges,
    };
  });
  return {
    exportedAt: generatedAt,
    source: "vocabulary_normalization_preview",
    scope: snapshot.records.length === RECORD_COUNT ? "all_vocabulary" : "partial",
    excludedUserData: true,
    databaseUpdated: false,
    previewOnly: true,
    sourceSnapshotExportedAt: snapshot.exportedAt,
    sourceSnapshotSha256: proposal.sourceSnapshotSha256,
    proposalGeneratedAt: proposal.generatedAt,
    generatedDatabaseFields: [
      "records[].vocabulary_examples[].id",
      "records[].vocabulary_examples[].created_at",
      "records[].updated_at",
    ],
    notes: [
      "Example id là null vì database chỉ cấp ID mới khi apply.",
      "created_at và updated_at là thời điểm tạo preview; database sẽ cấp thời điểm thật khi apply.",
      "challenges[].question là fallback tương thích; web hiển thị câu hỏi SELECT/ASSIST qua i18n từ direction và vocabulary item.",
    ],
    challengeQuestionI18n: {
      namespace: "lesson",
      EN_TO_VI: "questionEnToVi",
      VI_TO_EN: "questionViToEn",
      fallbackField: "challenges[].question",
    },
    counts: {
      ...snapshot.counts,
      vocabularyItems: records.length,
      examples: records.reduce(
        (sum, record) => sum + record.vocabulary_examples.length,
        0
      ),
    },
    records,
  };
};

const compareLiveWithSnapshot = (live: DbItem[], snapshot: Snapshot) => {
  const errors: string[] = [];
  const liveById = new Map(live.map((record) => [record.id, record]));
  for (const source of snapshot.records) {
    const current = liveById.get(source.id);
    if (!current) {
      errors.push(`DB thiếu id=${source.id}.`);
      continue;
    }
    for (const field of [
      "word",
      "normalized_word",
      "pos",
      "pos_vi",
      "cefr_level",
      "example_en",
      "example_vi",
      "example_source",
      "meaning_vi",
      "primary_meaning_vi",
    ] as const) {
      if (current[field] !== source[field]) {
        errors.push(`id=${source.id}: DB lệch snapshot ở ${field}.`);
      }
    }
    if (
      JSON.stringify(normalizeExamples(current.vocabulary_examples)) !==
      JSON.stringify(normalizeExamples(source.vocabulary_examples))
    ) {
      errors.push(`id=${source.id}: examples đã thay đổi.`);
    }
    if (
      JSON.stringify(normalizeChallenges(current.challenges)) !==
      JSON.stringify(normalizeChallenges(source.challenges))
    ) {
      errors.push(`id=${source.id}: challenges đã thay đổi.`);
    }
  }
  return errors;
};

const compareLiveWithTarget = (live: DbItem[], proposal: Proposal) => {
  const errors: string[] = [];
  const liveById = new Map(live.map((record) => [record.id, record]));
  for (const record of proposal.records) {
    const current = liveById.get(record.id);
    if (!current) {
      errors.push(`DB thiếu id=${record.id} sau apply.`);
      continue;
    }
    const after = record.after;
    const fields = {
      pos_vi: after.pos_vi_clean,
      primary_meaning_vi: after.quiz_meaning_vi,
      meaning_vi: after.meaning_vi_clean,
      example_en: after.example_en_clean,
      example_vi: after.example_vi_clean,
      example_source: NORMALIZATION_SOURCE,
    };
    for (const [field, expected] of Object.entries(fields)) {
      if (current[field as keyof DbItem] !== expected) {
        errors.push(`id=${record.id}: ${field} không khớp sau apply.`);
      }
    }
    const actualExamples = [...current.vocabulary_examples]
      .sort((left, right) => left.order - right.order || left.id - right.id)
      .map(({ example_en, example_vi, source, order }) => ({
        example_en,
        example_vi,
        source,
        order,
      }));
    const expectedExamples = after.examples_clean.map((example, index) => ({
      example_en: example.example_en,
      example_vi: example.example_vi,
      source: NORMALIZATION_SOURCE,
      order: index + 1,
    }));
    if (JSON.stringify(actualExamples) !== JSON.stringify(expectedExamples)) {
      errors.push(`id=${record.id}: examples không khớp sau apply.`);
    }
    for (const challenge of current.challenges) {
      const expectedQuestion = questionFor(
        challenge,
        record.word,
        after.quiz_meaning_vi
      );
      if (challenge.question !== expectedQuestion) {
        errors.push(`challenge=${challenge.id}: question không khớp.`);
      }
      const correctText =
        challenge.direction === "EN_TO_VI"
          ? after.quiz_meaning_vi
          : challenge.direction === "VI_TO_EN"
            ? record.word
            : null;
      if (correctText !== null) {
        for (const option of challenge.challenge_options.filter(
          (item) => item.correct
        )) {
          if (option.text !== correctText) {
            errors.push(`option=${option.id}: text không khớp.`);
          }
        }
      }
    }
  }
  return errors;
};

const makePlan = (
  mode: string,
  snapshot: Snapshot,
  proposal: Proposal,
  rows: ReturnType<typeof buildRows>,
  driftErrors: string[]
) => {
  const changedFieldCounts: Record<string, number> = {};
  for (const record of proposal.records) {
    for (const field of record.changed_fields) {
      changedFieldCounts[field] = (changedFieldCounts[field] ?? 0) + 1;
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    mode,
    sourceSnapshotExportedAt: snapshot.exportedAt,
    sourceSnapshotSha256: proposal.sourceSnapshotSha256,
    proposalGeneratedAt: proposal.generatedAt,
    readyToApply: driftErrors.length === 0,
    databaseUpdated: false,
    counts: {
      vocabularyItems: rows.vocabulary.length,
      existingExamplesToDelete: snapshot.records.reduce(
        (sum, record) => sum + record.vocabulary_examples.length,
        0
      ),
      normalizedExamplesToInsert: rows.examples.length,
      challengeQuestionsToUpdate: rows.challenges.length,
      correctChallengeOptionsToUpdate: rows.options.length,
    },
    changedFieldCounts,
    driftErrors,
    confirmationRequired: CONFIRMATION,
  };
};

const loadPrisma = async (): Promise<PrismaClient> => {
  const prismaModule = await import("./support/script-prisma.js");
  return prismaModule.default as unknown as PrismaClient;
};

const loadLive = async (
  prisma: PrismaClient,
  ids: number[]
) =>
  (await prisma.vocabulary_items.findMany({
    where: { id: { in: ids } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      word: true,
      normalized_word: true,
      pos: true,
      pos_vi: true,
      cefr_level: true,
      example_en: true,
      example_vi: true,
      example_source: true,
      meaning_vi: true,
      primary_meaning_vi: true,
      vocabulary_examples: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          example_en: true,
          example_vi: true,
          source: true,
          order: true,
        },
      },
      challenges: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          lesson_id: true,
          type: true,
          direction: true,
          question: true,
          order: true,
          challenge_options: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              text: true,
              correct: true,
              image_src: true,
              audio_src: true,
            },
          },
        },
      },
    },
  })) as DbItem[];

const parseArguments = () => {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const mode = args[0] ?? "plan";
  if (!["plan", "preview", "dry-run", "apply"].includes(mode)) {
    throw new Error("Mode hợp lệ: plan, preview, dry-run hoặc apply.");
  }
  const confirmationIndex = args.indexOf("--confirm");
  return {
    mode,
    confirmation:
      confirmationIndex >= 0 ? args[confirmationIndex + 1] : undefined,
  };
};

const main = async () => {
  const { mode, confirmation } = parseArguments();
  const [snapshotResult, proposalResult, validationResult] = await Promise.all([
    readJson<Snapshot>(snapshotPath),
    readJson<Proposal>(proposalPath),
    readJson<Validation>(validationPath),
  ]);
  const snapshot = snapshotResult.value;
  const proposal = proposalResult.value;
  validateArtifacts(
    snapshotResult.text,
    snapshot,
    proposal,
    validationResult.value
  );
  const rows = buildRows(snapshot, proposal);

  if (mode === "preview") {
    const dryRun = (await readJson<DryRunReport>(dryRunPath)).value;
    if (
      dryRun.action !== "live-dry-run-passed" ||
      !dryRun.readyToApply ||
      dryRun.databaseUpdated ||
      dryRun.driftErrors.length > 0 ||
      dryRun.sourceSnapshotSha256 !== proposal.sourceSnapshotSha256
    ) {
      throw new Error("Báo cáo dry-run không hợp lệ hoặc không khớp proposal.");
    }
    const preview = buildFullPreview(snapshot, proposal);
    await writeJson(previewPath, preview);
    console.log(
      JSON.stringify(
        {
          action: "full-db-preview-created",
          previewPath,
          databaseUpdated: false,
          counts: preview.counts,
        },
        null,
        2
      )
    );
    return;
  }

  if (mode === "plan") {
    const plan = makePlan(mode, snapshot, proposal, rows, []);
    await writeJson(planPath, plan);
    console.log(
      JSON.stringify({ action: "offline-plan-created", planPath, ...plan }, null, 2)
    );
    return;
  }

  const prisma = await loadPrisma();
  try {
    const databaseCount = await prisma.vocabulary_items.count();
    if (databaseCount !== RECORD_COUNT) {
      throw new Error(`DB có ${databaseCount}/${RECORD_COUNT} từ; snapshot đã cũ.`);
    }
    const ids = proposal.records.map((record) => record.id);
    const liveBefore = await loadLive(prisma, ids);
    const driftErrors = compareLiveWithSnapshot(liveBefore, snapshot);
    const plan = makePlan(mode, snapshot, proposal, rows, driftErrors);
    await writeJson(planPath, plan);
    if (driftErrors.length > 0) {
      throw new Error(`DB lệch snapshot; xem ${planPath}.`);
    }
    if (mode === "dry-run") {
      const dryRunReport = {
        action: "live-dry-run-passed",
        ...plan,
      };
      await writeJson(dryRunPath, dryRunReport);
      await writeJson(previewPath, buildFullPreview(snapshot, proposal));
      console.log(
        JSON.stringify(
          { ...dryRunReport, planPath, dryRunPath, previewPath },
          null,
          2
        )
      );
      return;
    }
    if (confirmation !== CONFIRMATION) {
      throw new Error(`Apply bị chặn. Cần --confirm ${CONFIRMATION}.`);
    }

    await mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
    const backupPath = path.join(
      backupDirectory,
      `vocab-db-pre-normalization-${timestamp}.json`
    );
    await writeJson(backupPath, {
      backedUpAt: new Date().toISOString(),
      sourceSnapshotSha256: proposal.sourceSnapshotSha256,
      vocabularyItems: liveBefore,
    });

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(
          `UPDATE vocabulary_items AS target
           SET pos_vi = source.pos_vi,
               primary_meaning_vi = source.primary_meaning_vi,
               meaning_vi = source.meaning_vi,
               example_en = source.example_en,
               example_vi = source.example_vi,
               example_source = source.example_source,
               updated_at = CURRENT_TIMESTAMP
           FROM jsonb_to_recordset($1::jsonb) AS source(
             id integer, pos_vi text, primary_meaning_vi text,
             meaning_vi text, example_en text, example_vi text,
             example_source text
           )
           WHERE target.id = source.id`,
          JSON.stringify(rows.vocabulary)
        );
        await tx.vocabulary_examples.deleteMany({
          where: { vocabulary_item_id: { in: ids } },
        });
        for (const exampleChunk of chunks(rows.examples, 2_000)) {
          await tx.vocabulary_examples.createMany({ data: exampleChunk });
        }
        if (rows.challenges.length > 0) {
          await tx.$executeRawUnsafe(
            `UPDATE challenges AS target SET question = source.question
             FROM jsonb_to_recordset($1::jsonb) AS source(id integer, question text)
             WHERE target.id = source.id`,
            JSON.stringify(rows.challenges)
          );
        }
        if (rows.options.length > 0) {
          await tx.$executeRawUnsafe(
            `UPDATE challenge_options AS target SET text = source.text
             FROM jsonb_to_recordset($1::jsonb) AS source(id integer, text text)
             WHERE target.id = source.id`,
            JSON.stringify(rows.options)
          );
        }
      },
      { maxWait: 30_000, timeout: 600_000 }
    );

    const liveAfter = await loadLive(prisma, ids);
    const postApplyErrors = compareLiveWithTarget(liveAfter, proposal);
    const audit = {
      appliedAt: new Date().toISOString(),
      action: "vocabulary-normalization-applied",
      backupPath,
      planPath,
      sourceSnapshotSha256: proposal.sourceSnapshotSha256,
      counts: plan.counts,
      postApplyErrors,
      databaseUpdated: postApplyErrors.length === 0,
    };
    await writeJson(auditPath, audit);
    if (postApplyErrors.length > 0) {
      throw new Error(`Hậu kiểm có lỗi; xem ${auditPath}.`);
    }
    console.log(JSON.stringify({ ...audit, auditPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

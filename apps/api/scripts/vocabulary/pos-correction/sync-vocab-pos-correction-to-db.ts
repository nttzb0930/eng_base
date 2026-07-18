import "dotenv/config";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  type NormalizationOutputRecord,
  sha256,
} from "../normalization/vocab-normalization.js";

type DbOption = {
  id: number;
  text: string;
  correct: boolean;
  image_src: string | null;
  audio_src: string | null;
};
type DbChallenge = {
  id: number;
  direction: string | null;
  question: string;
  challenge_options: DbOption[];
};
type DbExample = {
  id: number;
  example_en: string;
  example_vi: string | null;
  source: string;
  order: number;
  created_at: Date;
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
type SnapshotChallenge = {
  id: number;
  direction: string | null;
  question: string;
  challenge_options: DbOption[];
};
type Snapshot = {
  records: Array<{
    id: number;
    challenges: SnapshotChallenge[];
  }>;
};
type BaselineRecord = {
  id: number;
  word: string;
  normalized_word: string;
  pos: string;
  cefr_level: string;
  after: NormalizationOutputRecord;
};
type BaselineProposal = {
  totalRecords: number;
  records: BaselineRecord[];
};
type CorrectionRecord = {
  id: number;
  word: string;
  normalized_word: string;
  pos: string;
  cefr_level: string;
  before: NormalizationOutputRecord;
  after: NormalizationOutputRecord;
  status: "proposed";
};
type CorrectionProposal = {
  generatedAt: string;
  profile: "pos-correction";
  baselineProposalSha256: string;
  totalRecords: number;
  databaseUpdated: false;
  records: CorrectionRecord[];
};
type CorrectionValidation = {
  expectedRecords: number;
  validRecords: number;
  missingBatches: string[];
  issueCount: number;
  readyToSync: boolean;
  databaseUpdated: false;
};
type VocabularyUpdate = {
  id: number;
  pos_vi: string;
  primary_meaning_vi: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
  example_source: string;
};
type ExampleInsert = {
  vocabulary_item_id: number;
  example_en: string;
  example_vi: string;
  source: string;
  order: number;
};

const EXPECTED_RECORDS = 834;
const EXAMPLES_PER_WORD = 10;
// Correction outputs may be resumed with a different Gemini model after a
// quota failure, so do not attribute the merged dataset to one model here.
const NORMALIZATION_SOURCE = "ai-pos-correction:gemini-reviewed";
const CONFIRMATION = "APPLY_834_POS_CORRECTIONS";
const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const correctionDirectory = path.join(dataDirectory, "working/pos-correction");
const normalizationDirectory = path.join(dataDirectory, "working/normalization");
const databaseDirectory = path.join(dataDirectory, "working/database");
const proposalPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-proposal.json"
);
const validationPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-validation.json"
);
const baselinePath = path.join(
  normalizationDirectory,
  "vocab-normalized-proposal.json",
);
const snapshotPath = path.join(databaseDirectory, "vocab-db-snapshot.json");
const planPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-db-plan.json",
);
const dryRunPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-db-dry-run.json"
);
const auditPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-db-audit.json",
);
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
const questionFor = (challenge: { direction: string | null; question: string }, word: string, meaning: string) => {
  if (challenge.direction === "EN_TO_VI") return `What does "${word}" mean?`;
  if (challenge.direction === "VI_TO_EN") {
    return `Which word means "${meaning}"?`;
  }
  return challenge.question;
};
const correctTextFor = (
  direction: string | null,
  word: string,
  meaning: string
) => {
  if (direction === "EN_TO_VI") return meaning;
  if (direction === "VI_TO_EN") return word;
  return null;
};

const validateArtifacts = (
  proposal: CorrectionProposal,
  validation: CorrectionValidation,
  baselineText: string,
  baseline: BaselineProposal,
  snapshot: Snapshot
) => {
  const errors: string[] = [];
  if (
    proposal.profile !== "pos-correction" ||
    proposal.totalRecords !== EXPECTED_RECORDS ||
    proposal.records.length !== EXPECTED_RECORDS ||
    proposal.databaseUpdated
  ) {
    errors.push("Correction proposal không đúng phạm vi hoặc trạng thái.");
  }
  if (proposal.baselineProposalSha256 !== sha256(baselineText)) {
    errors.push("Baseline proposal hash không khớp correction proposal.");
  }
  if (
    validation.expectedRecords !== EXPECTED_RECORDS ||
    validation.validRecords !== EXPECTED_RECORDS ||
    validation.missingBatches.length > 0 ||
    validation.issueCount > 0 ||
    !validation.readyToSync ||
    validation.databaseUpdated
  ) {
    errors.push("Correction validation chưa đạt.");
  }
  if (baseline.totalRecords !== 3000 || baseline.records.length !== 3000) {
    errors.push("Baseline không có đủ 3.000 record.");
  }
  const baselineById = new Map(baseline.records.map((record) => [record.id, record]));
  const snapshotIds = new Set(snapshot.records.map((record) => record.id));
  const ids = new Set<number>();
  for (const record of proposal.records) {
    if (ids.has(record.id)) errors.push(`Correction trùng id=${record.id}.`);
    ids.add(record.id);
    const baselineRecord = baselineById.get(record.id);
    if (!baselineRecord || !snapshotIds.has(record.id)) {
      errors.push(`id=${record.id} không thuộc baseline/snapshot.`);
      continue;
    }
    if (
      record.word !== baselineRecord.word ||
      record.normalized_word !== baselineRecord.normalized_word ||
      record.pos !== baselineRecord.pos ||
      record.cefr_level !== baselineRecord.cefr_level ||
      record.status !== "proposed"
    ) {
      errors.push(`id=${record.id}: field bất biến hoặc status sai.`);
    }
    if (
      record.after.examples_clean.length !== EXAMPLES_PER_WORD ||
      record.after.review_required ||
      record.after.confidence === "low"
    ) {
      errors.push(`id=${record.id}: correction output chưa sẵn sàng.`);
    }
  }
  if (ids.size !== EXPECTED_RECORDS) errors.push("Correction ID thiếu hoặc trùng.");
  if (errors.length > 0) throw new Error(errors.join("\n"));
};

const buildRows = (proposal: CorrectionProposal, snapshot: Snapshot) => {
  const snapshotById = new Map(snapshot.records.map((record) => [record.id, record]));
  const vocabulary: VocabularyUpdate[] = [];
  const examples: ExampleInsert[] = [];
  const challenges: Array<{ id: number; question: string }> = [];
  const options: Array<{ id: number; text: string }> = [];
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
      challenges.push({
        id: challenge.id,
        question: questionFor(
          challenge,
          record.word,
          after.quiz_meaning_vi
        ),
      });
      const correctText = correctTextFor(
        challenge.direction,
        record.word,
        after.quiz_meaning_vi
      );
      if (correctText !== null) {
        challenge.challenge_options
          .filter((option) => option.correct)
          .forEach((option) => options.push({ id: option.id, text: correctText }));
      }
    }
  }
  return { vocabulary, examples, challenges, options };
};

const loadPrisma = async (): Promise<PrismaClient> => {
  const prismaModule = await import("../../support/script-prisma.js");
  return prismaModule.default as unknown as PrismaClient;
};
const loadLive = async (prisma: PrismaClient, ids: number[]) =>
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
          created_at: true,
        },
      },
      challenges: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          direction: true,
          question: true,
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
  })) as unknown as DbItem[];

const compareLive = (
  live: DbItem[],
  expectedRecords: Array<{
    id: number;
    word: string;
    normalized_word: string;
    pos: string;
    cefr_level: string;
    after: NormalizationOutputRecord;
  }>,
  expectedExampleSource: string,
  label: string
) => {
  const errors: string[] = [];
  const liveById = new Map(live.map((record) => [record.id, record]));
  for (const expected of expectedRecords) {
    const current = liveById.get(expected.id);
    if (!current) {
      errors.push(`${label}: DB thiếu id=${expected.id}.`);
      continue;
    }
    const fields = {
      word: expected.word,
      normalized_word: expected.normalized_word,
      pos: expected.pos,
      cefr_level: expected.cefr_level,
      pos_vi: expected.after.pos_vi_clean,
      primary_meaning_vi: expected.after.quiz_meaning_vi,
      meaning_vi: expected.after.meaning_vi_clean,
      example_en: expected.after.example_en_clean,
      example_vi: expected.after.example_vi_clean,
      example_source: expectedExampleSource,
    };
    for (const [field, value] of Object.entries(fields)) {
      if (current[field as keyof DbItem] !== value) {
        errors.push(`${label}: id=${expected.id} lệch ${field}.`);
      }
    }
    const actualExamples = current.vocabulary_examples.map(
      ({ example_en, example_vi, source, order }) => ({
        example_en,
        example_vi,
        source,
        order,
      })
    );
    const expectedExamples = expected.after.examples_clean.map(
      (example, index) => ({
        example_en: example.example_en,
        example_vi: example.example_vi,
        source: expectedExampleSource,
        order: index + 1,
      })
    );
    if (JSON.stringify(actualExamples) !== JSON.stringify(expectedExamples)) {
      errors.push(`${label}: id=${expected.id} lệch examples.`);
    }
    for (const challenge of current.challenges) {
      const expectedQuestion = questionFor(
        challenge,
        expected.word,
        expected.after.quiz_meaning_vi
      );
      if (challenge.question !== expectedQuestion) {
        errors.push(`${label}: challenge=${challenge.id} lệch question.`);
      }
      const correctText = correctTextFor(
        challenge.direction,
        expected.word,
        expected.after.quiz_meaning_vi
      );
      if (correctText !== null) {
        for (const option of challenge.challenge_options.filter(
          (item) => item.correct
        )) {
          if (option.text !== correctText) {
            errors.push(`${label}: option=${option.id} lệch correct text.`);
          }
        }
      }
    }
  }
  return errors;
};

const makePlan = (
  mode: string,
  proposal: CorrectionProposal,
  rows: ReturnType<typeof buildRows>,
  driftErrors: string[]
) => ({
  generatedAt: new Date().toISOString(),
  mode,
  proposalGeneratedAt: proposal.generatedAt,
  readyToApply: driftErrors.length === 0,
  databaseUpdated: false,
  counts: {
    vocabularyItemsToUpdate: rows.vocabulary.length,
    normalizedExamplesToInsert: rows.examples.length,
    challengeQuestionsToUpdate: rows.challenges.length,
    correctChallengeOptionsToUpdate: rows.options.length,
    untouchedVocabularyItems: 3000 - rows.vocabulary.length,
  },
  driftErrors,
  confirmationRequired: CONFIRMATION,
});

const parseArguments = () => {
  const values = process.argv.slice(2).filter((value) => value !== "--");
  const mode = values[0] ?? "plan";
  if (!["plan", "dry-run", "apply"].includes(mode)) {
    throw new Error("Mode hợp lệ: plan, dry-run hoặc apply.");
  }
  const confirmationIndex = values.indexOf("--confirm");
  return {
    mode,
    confirmation:
      confirmationIndex >= 0 ? values[confirmationIndex + 1] : undefined,
  };
};

const main = async () => {
  const { mode, confirmation } = parseArguments();
  const [proposalResult, validationResult, baselineResult, snapshotResult] =
    await Promise.all([
      readJson<CorrectionProposal>(proposalPath),
      readJson<CorrectionValidation>(validationPath),
      readJson<BaselineProposal>(baselinePath),
      readJson<Snapshot>(snapshotPath),
    ]);
  const proposal = proposalResult.value;
  const baseline = baselineResult.value;
  const snapshot = snapshotResult.value;
  validateArtifacts(
    proposal,
    validationResult.value,
    baselineResult.text,
    baseline,
    snapshot
  );
  const rows = buildRows(proposal, snapshot);
  if (mode === "plan") {
    const plan = makePlan(mode, proposal, rows, []);
    await writeJson(planPath, plan);
    console.log(JSON.stringify({ action: "pos-correction-plan", planPath, ...plan }, null, 2));
    return;
  }

  const baselineById = new Map(baseline.records.map((record) => [record.id, record]));
  const baselineRecords = proposal.records.map((record) => baselineById.get(record.id)!);
  const ids = proposal.records.map((record) => record.id);
  const prisma = await loadPrisma();
  try {
    const totalDatabaseRecords = await prisma.vocabulary_items.count();
    if (totalDatabaseRecords !== 3000) {
      throw new Error(`DB có ${totalDatabaseRecords}/3000 vocabulary item.`);
    }
    const liveBefore = await loadLive(prisma, ids);
    const driftErrors = compareLive(
      liveBefore,
      baselineRecords,
      "ai-normalization:gemini-3.1-flash-lite-reviewed",
      "baseline"
    );
    const plan = makePlan(mode, proposal, rows, driftErrors);
    await writeJson(planPath, plan);
    if (driftErrors.length > 0) {
      throw new Error(`DB lệch baseline; xem ${planPath}.`);
    }
    if (mode === "dry-run") {
      const report = { action: "pos-correction-dry-run-passed", ...plan };
      await writeJson(dryRunPath, report);
      console.log(JSON.stringify({ ...report, planPath, dryRunPath }, null, 2));
      return;
    }
    if (confirmation !== CONFIRMATION) {
      throw new Error(`Apply bị chặn. Cần --confirm ${CONFIRMATION}.`);
    }

    await mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
    const backupPath = path.join(
      backupDirectory,
      `vocab-db-pre-pos-correction-${timestamp}.json`
    );
    await writeJson(backupPath, {
      backedUpAt: new Date().toISOString(),
      profile: "pos-correction",
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
        for (const chunk of chunks(rows.examples, 2_000)) {
          await tx.vocabulary_examples.createMany({ data: chunk });
        }
        await tx.$executeRawUnsafe(
          `UPDATE challenges AS target SET question = source.question
           FROM jsonb_to_recordset($1::jsonb) AS source(id integer, question text)
           WHERE target.id = source.id`,
          JSON.stringify(rows.challenges)
        );
        await tx.$executeRawUnsafe(
          `UPDATE challenge_options AS target SET text = source.text
           FROM jsonb_to_recordset($1::jsonb) AS source(id integer, text text)
           WHERE target.id = source.id`,
          JSON.stringify(rows.options)
        );
      },
      { maxWait: 30_000, timeout: 600_000 }
    );

    const liveAfter = await loadLive(prisma, ids);
    const postApplyErrors = compareLive(
      liveAfter,
      proposal.records,
      NORMALIZATION_SOURCE,
      "post-apply"
    );
    const audit = {
      appliedAt: new Date().toISOString(),
      action: "vocabulary-pos-correction-applied",
      backupPath,
      planPath,
      counts: plan.counts,
      postApplyErrors,
      databaseUpdated: postApplyErrors.length === 0,
    };
    await writeJson(auditPath, audit);
    if (postApplyErrors.length > 0) {
      throw new Error(`Hậu kiểm correction có lỗi; xem ${auditPath}.`);
    }
    console.log(JSON.stringify({ ...audit, auditPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;
    const cause =
      typeof value.cause === "object" && value.cause !== null
        ? (value.cause as Record<string, unknown>)
        : null;
    console.error(
      JSON.stringify(
        {
          name: error instanceof Error ? error.name : null,
          message: error instanceof Error ? error.message : String(error),
          code:
            typeof value.code === "string" || typeof value.code === "number"
              ? value.code
              : null,
          clientVersion:
            typeof value.clientVersion === "string"
              ? value.clientVersion
              : null,
          cause: cause
            ? {
                name:
                  typeof cause.name === "string" ? cause.name : null,
                code:
                  typeof cause.code === "string" ||
                  typeof cause.code === "number"
                    ? cause.code
                    : null,
                syscall:
                  typeof cause.syscall === "string" ? cause.syscall : null,
              }
            : null,
        },
        null,
        2
      )
    );
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});

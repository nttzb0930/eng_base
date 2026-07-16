import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  escapeCsv,
  type NormalizationBatch,
  type NormalizationManifest,
  type NormalizationOutputRecord,
  sha256,
  validateOutputRecord,
} from "./lib/vocab-normalization.js";

type OutputFile = { records: unknown[] };
type BaselineProposalRecord = {
  id: number;
  word: string;
  normalized_word: string;
  cefr_level: string;
  pos: string;
  after: NormalizationOutputRecord;
};
type BaselineProposal = {
  generatedAt: string;
  totalRecords: number;
  databaseUpdated: boolean;
  records: BaselineProposalRecord[];
};
type ValidationIssue = {
  batchId: string;
  id?: number;
  errors: string[];
};

const EXPECTED_RECORDS = 834;
const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const correctionDirectory = path.join(
  dataDirectory,
  "normalization-pos-correction"
);
const inputDirectory = path.join(correctionDirectory, "input");
const outputDirectory = path.join(correctionDirectory, "output");
const manifestPath = path.join(correctionDirectory, "manifest.json");
const baselinePath = path.join(dataDirectory, "vocab-normalized-proposal.json");
const validationPath = path.join(
  dataDirectory,
  "vocab-pos-correction-validation.json"
);
const proposalPath = path.join(
  dataDirectory,
  "vocab-pos-correction-proposal.json"
);
const reportPath = path.join(dataDirectory, "vocab-pos-correction-report.csv");

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const sameExamples = (
  left: NormalizationOutputRecord["examples_clean"],
  right: NormalizationOutputRecord["examples_clean"]
) => JSON.stringify(left) === JSON.stringify(right);

const main = async () => {
  const [manifest, baselineText] = await Promise.all([
    readJson<NormalizationManifest>(manifestPath),
    readFile(baselinePath, "utf8"),
  ]);
  const baseline = JSON.parse(baselineText) as BaselineProposal;
  const sourceSnapshotPath = path.join(root, manifest.sourceSnapshot);
  const sourceSnapshotText = await readFile(sourceSnapshotPath, "utf8");
  const issues: ValidationIssue[] = [];
  const missingBatches: string[] = [];
  const correctedRecords: NormalizationOutputRecord[] = [];

  if (sha256(sourceSnapshotText) !== manifest.sourceSnapshotSha256) {
    issues.push({
      batchId: "manifest",
      errors: ["Snapshot nguồn đã thay đổi sau khi prepare correction."],
    });
  }
  if (
    manifest.totalRecords !== EXPECTED_RECORDS ||
    manifest.batches.reduce((sum, batch) => sum + batch.recordCount, 0) !==
      EXPECTED_RECORDS
  ) {
    issues.push({
      batchId: "manifest",
      errors: [`Correction manifest phải có đúng ${EXPECTED_RECORDS} record.`],
    });
  }
  if (baseline.totalRecords !== 3000 || baseline.records.length !== 3000) {
    issues.push({
      batchId: "baseline",
      errors: ["Baseline proposal phải có đúng 3.000 record."],
    });
  }
  const baselineById = new Map(
    baseline.records.map((record) => [record.id, record])
  );

  for (const manifestBatch of manifest.batches) {
    const inputPath = path.join(inputDirectory, manifestBatch.inputFile);
    const outputPath = path.join(outputDirectory, manifestBatch.outputFile);
    const inputText = await readFile(inputPath, "utf8");
    if (sha256(inputText) !== manifestBatch.inputSha256) {
      issues.push({
        batchId: manifestBatch.batchId,
        errors: ["Checksum input không khớp manifest."],
      });
      continue;
    }
    const input = JSON.parse(inputText) as NormalizationBatch;
    let output: OutputFile;
    try {
      output = await readJson<OutputFile>(outputPath);
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (code === "ENOENT") missingBatches.push(manifestBatch.batchId);
      else {
        issues.push({
          batchId: manifestBatch.batchId,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
      continue;
    }
    if (!Array.isArray(output.records) || output.records.length !== input.records.length) {
      issues.push({
        batchId: manifestBatch.batchId,
        errors: [
          `Output phải có đúng ${input.records.length} record theo thứ tự input.`,
        ],
      });
      continue;
    }
    output.records.forEach((value, index) => {
      const source = input.records[index];
      const result = validateOutputRecord(value, source);
      if (result.errors.length > 0) {
        issues.push({
          batchId: manifestBatch.batchId,
          id: source.id,
          errors: result.errors,
        });
      } else if (result.record) correctedRecords.push(result.record);
    });
  }

  const uniqueIds = new Set(correctedRecords.map((record) => record.id));
  if (uniqueIds.size !== correctedRecords.length) {
    issues.push({
      batchId: "aggregate",
      errors: ["Correction output có ID trùng."],
    });
  }
  for (const record of correctedRecords) {
    if (!baselineById.has(record.id)) {
      issues.push({
        batchId: "aggregate",
        id: record.id,
        errors: ["ID correction không thuộc baseline 3.000 từ."],
      });
    }
    if (record.review_required || record.confidence === "low") {
      issues.push({
        batchId: "aggregate",
        id: record.id,
        errors: ["Correction record vẫn yêu cầu review hoặc confidence low."],
      });
    }
    const verification = (
      record as NormalizationOutputRecord & {
        pos_verification?: Record<string, unknown>;
      }
    ).pos_verification;
    const senseCount = record.meaning_vi_clean
      .split(";")
      .map((sense) => sense.trim())
      .filter(Boolean).length;
    if (
      !verification ||
      verification.expected_pos !== record.pos ||
      verification.senses_checked !== senseCount ||
      verification.examples_checked !== 10 ||
      verification.quiz_meaning_matches_expected_pos !== true ||
      verification.all_senses_match_expected_pos !== true ||
      verification.all_examples_use_expected_pos !== true ||
      typeof verification.explanation !== "string" ||
      verification.explanation.trim().length < 12
    ) {
      issues.push({
        batchId: "aggregate",
        id: record.id,
        errors: ["Correction record có pos_verification không hợp lệ."],
      });
    }
  }

  const readyToSync =
    missingBatches.length === 0 &&
    issues.length === 0 &&
    correctedRecords.length === EXPECTED_RECORDS;
  const validation = {
    validatedAt: new Date().toISOString(),
    expectedRecords: EXPECTED_RECORDS,
    validRecords: correctedRecords.length,
    expectedBatches: manifest.totalBatches,
    missingBatches,
    issueCount: issues.length,
    issues,
    readyToSync,
    databaseUpdated: false,
  };
  await writeFile(
    validationPath,
    `${JSON.stringify(validation, null, 2)}\n`,
    "utf8"
  );
  if (!readyToSync) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
    return;
  }

  const records = correctedRecords.map((after) => {
    const baselineRecord = baselineById.get(after.id)!;
    const before = baselineRecord.after;
    const changedFields = [
      before.pos_vi_clean !== after.pos_vi_clean ? "pos_vi" : null,
      before.quiz_meaning_vi !== after.quiz_meaning_vi
        ? "primary_meaning_vi"
        : null,
      before.meaning_vi_clean !== after.meaning_vi_clean ? "meaning_vi" : null,
      before.example_en_clean !== after.example_en_clean ? "example_en" : null,
      before.example_vi_clean !== after.example_vi_clean ? "example_vi" : null,
      !sameExamples(before.examples_clean, after.examples_clean)
        ? "vocabulary_examples"
        : null,
    ].filter((field): field is string => field !== null);
    return {
      id: baselineRecord.id,
      word: baselineRecord.word,
      normalized_word: baselineRecord.normalized_word,
      cefr_level: baselineRecord.cefr_level,
      pos: baselineRecord.pos,
      before,
      after,
      changed_fields: changedFields,
      status: "proposed" as const,
    };
  });
  const proposal = {
    generatedAt: new Date().toISOString(),
    profile: "pos-correction",
    baselineProposal: path.relative(root, baselinePath).replaceAll("\\", "/"),
    baselineProposalSha256: sha256(baselineText),
    sourceSnapshot: manifest.sourceSnapshot,
    sourceSnapshotSha256: manifest.sourceSnapshotSha256,
    totalRecords: records.length,
    databaseUpdated: false,
    records,
  };
  await writeFile(
    proposalPath,
    `${JSON.stringify(proposal, null, 2)}\n`,
    "utf8"
  );

  const columns = [
    "id",
    "word",
    "pos",
    "cefr_level",
    "before_quiz_meaning_vi",
    "after_quiz_meaning_vi",
    "before_meaning_vi",
    "after_meaning_vi",
    "confidence",
    "changed_fields",
    "pos_verification",
    "examples_json",
    "correction_notes",
  ];
  const rows = [
    columns.map(escapeCsv).join(","),
    ...records.map((record) =>
      [
        record.id,
        record.word,
        record.pos,
        record.cefr_level,
        record.before.quiz_meaning_vi,
        record.after.quiz_meaning_vi,
        record.before.meaning_vi_clean,
        record.after.meaning_vi_clean,
        record.after.confidence,
        record.changed_fields,
        JSON.stringify(
          (
            record.after as NormalizationOutputRecord & {
              pos_verification?: Record<string, unknown>;
            }
          ).pos_verification ?? null
        ),
        JSON.stringify(record.after.examples_clean),
        record.after.correction_notes,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];
  await writeFile(reportPath, `\uFEFF${rows.join("\n")}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        action: "pos-correction-merged",
        records: records.length,
        proposalPath,
        validationPath,
        reportPath,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  escapeCsv,
  type NormalizationBatch,
  type NormalizationManifest,
  type NormalizationOutputRecord,
  type SnapshotFile,
  sha256,
  validateOutputRecord,
} from "./vocab-normalization";

type OutputFile = { records: unknown[] };
type ValidationIssue = {
  batchId: string;
  id?: number;
  errors: string[];
};

const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const normalizationDirectory = path.join(
  dataDirectory,
  "working",
  "normalization",
);
const inputDirectory = path.join(normalizationDirectory, "input");
const outputDirectory = path.join(normalizationDirectory, "output");
const manifestPath = path.join(normalizationDirectory, "manifest.json");
const validationPath = path.join(
  normalizationDirectory,
  "vocab-normalization-validation.json"
);
const proposalPath = path.join(
  normalizationDirectory,
  "vocab-normalized-proposal.json",
);
const reportPath = path.join(
  normalizationDirectory,
  "vocab-normalization-report.csv",
);

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const main = async () => {
  const manifest = await readJson<NormalizationManifest>(manifestPath);
  const snapshotPath = path.join(root, manifest.sourceSnapshot);
  const snapshotText = await readFile(snapshotPath, "utf8");
  const snapshot = JSON.parse(snapshotText) as SnapshotFile;
  const missingBatches: string[] = [];
  const issues: ValidationIssue[] = [];
  const normalizedRecords: NormalizationOutputRecord[] = [];

  if (sha256(snapshotText) !== manifest.sourceSnapshotSha256) {
    issues.push({
      batchId: "manifest",
      errors: ["Snapshot đã thay đổi sau khi tạo batch; cần prepare lại."],
    });
  }
  if (manifest.totalRecords !== 3000 || manifest.totalBatches !== 300) {
    issues.push({
      batchId: "manifest",
      errors: [
        `Manifest phải có 3.000 record/300 batch, hiện là ${manifest.totalRecords}/${manifest.totalBatches}.`,
      ],
    });
  }

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
      if (code === "ENOENT") {
        missingBatches.push(manifestBatch.batchId);
        continue;
      }
      issues.push({
        batchId: manifestBatch.batchId,
        errors: [
          `Không đọc được output: ${error instanceof Error ? error.message : String(error)}`,
        ],
      });
      continue;
    }

    if (!Array.isArray(output.records)) {
      issues.push({
        batchId: manifestBatch.batchId,
        errors: ["Output phải có thuộc tính records là array."],
      });
      continue;
    }
    if (output.records.length !== input.records.length) {
      issues.push({
        batchId: manifestBatch.batchId,
        errors: [
          `Output có ${output.records.length}/${input.records.length} record.`,
        ],
      });
      continue;
    }

    output.records.forEach((outputRecord, index) => {
      const source = input.records[index];
      const validation = validateOutputRecord(outputRecord, source);
      if (validation.errors.length > 0) {
        issues.push({
          batchId: manifestBatch.batchId,
          id: source.id,
          errors: validation.errors,
        });
      } else if (validation.record) {
        normalizedRecords.push(validation.record);
      }
    });
  }

  const normalizedIds = new Set(normalizedRecords.map((record) => record.id));
  if (normalizedIds.size !== normalizedRecords.length) {
    issues.push({
      batchId: "aggregate",
      errors: ["Kết quả chuẩn hóa có ID trùng nhau."],
    });
  }
  const readyForReview =
    missingBatches.length === 0 &&
    issues.length === 0 &&
    normalizedRecords.length === manifest.totalRecords;
  const validation = {
    validatedAt: new Date().toISOString(),
    sourceSnapshot: manifest.sourceSnapshot,
    expectedRecords: manifest.totalRecords,
    validRecords: normalizedRecords.length,
    expectedBatches: manifest.totalBatches,
    missingBatches,
    issueCount: issues.length,
    issues,
    readyForReview,
    databaseUpdated: false,
  };
  await writeFile(
    validationPath,
    `${JSON.stringify(validation, null, 2)}\n`,
    "utf8"
  );

  if (!readyForReview) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
    return;
  }

  const sourceById = new Map(snapshot.records.map((record) => [record.id, record]));
  const reviewRecords = normalizedRecords.map((after) => {
    const before = sourceById.get(after.id);
    if (!before) throw new Error(`Không tìm thấy source record ${after.id}.`);
    const sourceExamples = [
      ...(before.example_en
        ? [{ example_en: before.example_en, example_vi: before.example_vi }]
        : []),
      ...before.vocabulary_examples.map((example) => ({
        example_en: example.example_en,
        example_vi: example.example_vi,
      })),
    ];
    const normalizedSourceExamples = new Set(
      sourceExamples.map((example) =>
        JSON.stringify([
          example.example_en.trim().toLocaleLowerCase("en-US"),
          example.example_vi?.trim() ?? null,
        ])
      )
    );
    const normalizedProposedExamples = new Set(
      after.examples_clean.map((example) =>
        JSON.stringify([
          example.example_en.trim().toLocaleLowerCase("en-US"),
          example.example_vi.trim(),
        ])
      )
    );
    const examplesChanged =
      normalizedSourceExamples.size !== normalizedProposedExamples.size ||
      [...normalizedProposedExamples].some(
        (example) => !normalizedSourceExamples.has(example)
      );
    const changedFields = [
      before.pos_vi !== after.pos_vi_clean ? "pos_vi" : null,
      before.primary_meaning_vi !== after.quiz_meaning_vi
        ? "primary_meaning_vi"
        : null,
      before.meaning_vi !== after.meaning_vi_clean ? "meaning_vi" : null,
      before.example_en !== after.example_en_clean ? "example_en" : null,
      before.example_vi !== after.example_vi_clean ? "example_vi" : null,
      examplesChanged ? "vocabulary_examples" : null,
    ].filter((field): field is string => field !== null);

    return {
      id: before.id,
      word: before.word,
      normalized_word: before.normalized_word,
      cefr_level: before.cefr_level,
      pos: before.pos,
      before: {
        pos_vi: before.pos_vi,
        primary_meaning_vi: before.primary_meaning_vi,
        meaning_vi: before.meaning_vi,
        example_en: before.example_en,
        example_vi: before.example_vi,
      },
      after,
      changed_fields: changedFields,
      status: after.review_required ? "needs_review" : "proposed",
    };
  });

  const proposal = {
    generatedAt: new Date().toISOString(),
    sourceSnapshot: manifest.sourceSnapshot,
    sourceSnapshotSha256: manifest.sourceSnapshotSha256,
    totalRecords: reviewRecords.length,
    proposedRecords: reviewRecords.filter((record) => record.status === "proposed")
      .length,
    needsReviewRecords: reviewRecords.filter(
      (record) => record.status === "needs_review"
    ).length,
    unchangedRecords: reviewRecords.filter(
      (record) => record.changed_fields.length === 0
    ).length,
    databaseUpdated: false,
    records: reviewRecords,
  };
  await writeFile(
    proposalPath,
    `${JSON.stringify(proposal, null, 2)}\n`,
    "utf8"
  );

  const columns = [
    "id",
    "word",
    "cefr_level",
    "pos",
    "status",
    "confidence",
    "review_required",
    "changed_fields",
    "before_pos_vi",
    "after_pos_vi",
    "before_quiz_meaning_vi",
    "after_quiz_meaning_vi",
    "before_meaning_vi",
    "after_meaning_vi",
    "before_example_en",
    "after_example_en",
    "before_example_vi",
    "after_example_vi",
    "example_count",
    "examples_json",
    "correction_notes",
  ] as const;
  const rows = [
    columns.map(escapeCsv).join(","),
    ...reviewRecords.map((record) =>
      [
        record.id,
        record.word,
        record.cefr_level,
        record.pos,
        record.status,
        record.after.confidence,
        record.after.review_required,
        record.changed_fields,
        record.before.pos_vi,
        record.after.pos_vi_clean,
        record.before.primary_meaning_vi,
        record.after.quiz_meaning_vi,
        record.before.meaning_vi,
        record.after.meaning_vi_clean,
        record.before.example_en,
        record.after.example_en_clean,
        record.before.example_vi,
        record.after.example_vi_clean,
        record.after.examples_clean.length,
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
        totalRecords: reviewRecords.length,
        needsReviewRecords: proposal.needsReviewRecords,
        proposalPath,
        reportPath,
        validationPath,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

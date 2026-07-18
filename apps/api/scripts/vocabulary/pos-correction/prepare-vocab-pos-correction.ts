import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  NORMALIZATION_BATCH_SIZE,
  POS_VI_BY_POS,
  type NormalizationBatch,
  type NormalizationInputRecord,
  type NormalizationManifest,
  type SnapshotFile,
  sha256,
} from "../normalization/vocab-normalization.js";

type RiskAuditFile = {
  records: Array<{ id: number; risk_score: number; flags: string[] }>;
};

const EXPECTED_CANDIDATES = 834;
const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const databaseDirectory = path.join(dataDirectory, "working", "database");
const snapshotPath = path.join(databaseDirectory, "vocab-db-snapshot.json");
const riskAuditPath = path.join(databaseDirectory, "vocab-risk-audit.json");
const correctionDirectory = path.join(
  dataDirectory,
  "working",
  "pos-correction"
);
const inputDirectory = path.join(correctionDirectory, "input");
const outputDirectory = path.join(correctionDirectory, "output");
const rejectedDirectory = path.join(correctionDirectory, "rejected");
const jobsDirectory = path.join(correctionDirectory, "jobs");
const candidatesPath = path.join(
  correctionDirectory,
  "vocab-pos-correction-candidates.json"
);

const main = async () => {
  const [snapshotText, riskAuditText] = await Promise.all([
    readFile(snapshotPath, "utf8"),
    readFile(riskAuditPath, "utf8"),
  ]);
  const snapshot = JSON.parse(snapshotText) as SnapshotFile;
  const riskAudit = JSON.parse(riskAuditText) as RiskAuditFile;
  const candidateRiskById = new Map(
    riskAudit.records
      .filter((record) => record.flags.includes("POS_MISMATCH"))
      .map((record) => [record.id, record] as const)
  );
  if (candidateRiskById.size !== EXPECTED_CANDIDATES) {
    throw new Error(
      `Cần ${EXPECTED_CANDIDATES} POS_MISMATCH nhưng audit có ${candidateRiskById.size}.`
    );
  }

  const sourceById = new Map(snapshot.records.map((record) => [record.id, record]));
  const missingIds = [...candidateRiskById.keys()].filter(
    (id) => !sourceById.has(id)
  );
  if (missingIds.length > 0) {
    throw new Error(`Snapshot thiếu candidate IDs: ${missingIds.join(", ")}.`);
  }

  const candidates = [...candidateRiskById.keys()]
    .map((id) => sourceById.get(id)!)
    .sort((left, right) => {
      if (left.word === "bear") return -1;
      if (right.word === "bear") return 1;
      return left.id - right.id;
    });
  const records: NormalizationInputRecord[] = candidates.map((record) => {
    const risk = candidateRiskById.get(record.id)!;
    const expectedPosVi = POS_VI_BY_POS[record.pos];
    if (!expectedPosVi) {
      throw new Error(`id=${record.id}: không hỗ trợ pos=${record.pos}.`);
    }
    return {
      id: record.id,
      word: record.word,
      normalized_word: record.normalized_word,
      cefr_level: record.cefr_level,
      pos: record.pos,
      pos_vi: expectedPosVi,
      phonetic: record.phonetic,
      primary_meaning_vi: "",
      meaning_vi: "",
      example_en: null,
      example_vi: null,
      alternative_examples: [],
      risk_score: risk.risk_score,
      flags: risk.flags,
    };
  });

  await rm(inputDirectory, { recursive: true, force: true });
  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(outputDirectory, { recursive: true }),
    mkdir(rejectedDirectory, { recursive: true }),
    mkdir(jobsDirectory, { recursive: true }),
  ]);

  const manifestBatches: NormalizationManifest["batches"] = [];
  for (
    let offset = 0;
    offset < records.length;
    offset += NORMALIZATION_BATCH_SIZE
  ) {
    const batchNumber = offset / NORMALIZATION_BATCH_SIZE + 1;
    const batchId = `batch-${String(batchNumber).padStart(3, "0")}`;
    const batchRecords = records.slice(
      offset,
      offset + NORMALIZATION_BATCH_SIZE
    );
    const batch: NormalizationBatch = {
      schemaVersion: 1,
      batchId,
      sourceSnapshotExportedAt: snapshot.exportedAt,
      records: batchRecords,
    };
    const batchText = `${JSON.stringify(batch, null, 2)}\n`;
    const inputFile = `${batchId}.json`;
    await writeFile(path.join(inputDirectory, inputFile), batchText, "utf8");
    manifestBatches.push({
      batchId,
      inputFile,
      outputFile: inputFile,
      recordCount: batchRecords.length,
      firstId: batchRecords[0].id,
      lastId: batchRecords[batchRecords.length - 1].id,
      recordIds: batchRecords.map((record) => record.id),
      inputSha256: sha256(batchText),
    });
  }

  const manifest: NormalizationManifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceSnapshot: path.relative(root, snapshotPath).replaceAll("\\", "/"),
    sourceSnapshotExportedAt: snapshot.exportedAt,
    sourceSnapshotSha256: sha256(snapshotText),
    totalRecords: records.length,
    batchSize: NORMALIZATION_BATCH_SIZE,
    totalBatches: manifestBatches.length,
    batches: manifestBatches,
  };
  const manifestPath = path.join(correctionDirectory, "manifest.json");
  await Promise.all([
    writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    ),
    writeFile(
      candidatesPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          sourceSnapshot: manifest.sourceSnapshot,
          selectionFlag: "POS_MISMATCH",
          totalRecords: records.length,
          databaseUpdated: false,
          records: records.map((record) => ({
            id: record.id,
            word: record.word,
            normalized_word: record.normalized_word,
            pos: record.pos,
            pos_vi_expected: record.pos_vi,
            cefr_level: record.cefr_level,
            risk_score: record.risk_score,
            flags: record.flags,
          })),
        },
        null,
        2
      )}\n`,
      "utf8"
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        action: "pos-correction-prepared",
        candidates: records.length,
        batches: manifest.totalBatches,
        batchSize: manifest.batchSize,
        focusWord: records[0].word,
        focusId: records[0].id,
        focusBatch: manifest.batches[0].batchId,
        manifestPath,
        candidatesPath,
        inputDirectory,
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

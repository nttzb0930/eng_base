import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  NORMALIZATION_BATCH_SIZE,
  type NormalizationBatch,
  type NormalizationInputRecord,
  type NormalizationManifest,
  type SnapshotFile,
  sha256,
} from "./vocab-normalization";

type RiskAuditFile = {
  records: Array<{ id: number; risk_score: number; flags: string[] }>;
};

const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const workingDirectory = path.join(dataDirectory, "working");
const databaseDirectory = path.join(workingDirectory, "database");
const snapshotPath = path.join(databaseDirectory, "vocab-db-snapshot.json");
const riskAuditPath = path.join(databaseDirectory, "vocab-risk-audit.json");
const normalizationDirectory = path.join(workingDirectory, "normalization");
const inputDirectory = path.join(normalizationDirectory, "input");
const outputDirectory = path.join(normalizationDirectory, "output");

const main = async () => {
  const [snapshotText, riskAuditText] = await Promise.all([
    readFile(snapshotPath, "utf8"),
    readFile(riskAuditPath, "utf8"),
  ]);
  const snapshot = JSON.parse(snapshotText) as SnapshotFile;
  const riskAudit = JSON.parse(riskAuditText) as RiskAuditFile;

  if (snapshot.records.length !== snapshot.counts.vocabularyItems) {
    throw new Error(
      `Snapshot khai báo ${snapshot.counts.vocabularyItems} từ nhưng chứa ${snapshot.records.length} record.`
    );
  }
  if (snapshot.records.length !== 3000) {
    throw new Error(`Yêu cầu 3.000 từ nhưng snapshot có ${snapshot.records.length}.`);
  }

  const uniqueIds = new Set(snapshot.records.map((record) => record.id));
  if (uniqueIds.size !== snapshot.records.length) {
    throw new Error("Snapshot có ID từ vựng trùng nhau.");
  }

  const riskById = new Map(
    riskAudit.records.map((record) => [record.id, record] as const)
  );
  const records: NormalizationInputRecord[] = snapshot.records.map((record) => {
    const risk = riskById.get(record.id);
    const alternatives = record.vocabulary_examples
      .filter((example) => example.example_en !== record.example_en)
      .sort((left, right) => left.order - right.order)
      .slice(0, 3)
      .map((example) => ({
        example_en: example.example_en,
        example_vi: example.example_vi,
      }));

    return {
      id: record.id,
      word: record.word,
      normalized_word: record.normalized_word,
      cefr_level: record.cefr_level,
      pos: record.pos,
      pos_vi: record.pos_vi,
      phonetic: record.phonetic,
      primary_meaning_vi: record.primary_meaning_vi,
      meaning_vi: record.meaning_vi,
      example_en: record.example_en,
      example_vi: record.example_vi,
      alternative_examples: alternatives,
      risk_score: risk?.risk_score ?? 0,
      flags: risk?.flags ?? [],
    };
  });

  await rm(inputDirectory, { recursive: true, force: true });
  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(outputDirectory, { recursive: true }),
  ]);

  const manifestBatches: NormalizationManifest["batches"] = [];
  for (let offset = 0; offset < records.length; offset += NORMALIZATION_BATCH_SIZE) {
    const batchNumber = offset / NORMALIZATION_BATCH_SIZE + 1;
    const batchId = `batch-${String(batchNumber).padStart(3, "0")}`;
    const batchRecords = records.slice(offset, offset + NORMALIZATION_BATCH_SIZE);
    const batch: NormalizationBatch = {
      schemaVersion: 1,
      batchId,
      sourceSnapshotExportedAt: snapshot.exportedAt,
      records: batchRecords,
    };
    const batchText = `${JSON.stringify(batch, null, 2)}\n`;
    const inputFile = `${batchId}.json`;
    const outputFile = `${batchId}.json`;

    await writeFile(path.join(inputDirectory, inputFile), batchText, "utf8");
    manifestBatches.push({
      batchId,
      inputFile,
      outputFile,
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
  const manifestPath = path.join(normalizationDirectory, "manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        sourceRecords: records.length,
        riskRecords: records.filter((record) => record.risk_score > 0).length,
        batches: manifestBatches.length,
        batchSize: NORMALIZATION_BATCH_SIZE,
        manifestPath,
        inputDirectory,
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

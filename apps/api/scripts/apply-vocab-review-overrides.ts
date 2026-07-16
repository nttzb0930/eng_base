import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type NormalizationManifest,
  type NormalizationOutputRecord,
  validateOutputRecord,
} from "./lib/vocab-normalization.js";

type ReviewOverride = Pick<
  NormalizationOutputRecord,
  | "id"
  | "quiz_meaning_vi"
  | "meaning_vi_clean"
  | "confidence"
  | "review_required"
  | "correction_notes"
> &
  Partial<Pick<NormalizationOutputRecord, "examples_clean">>;

type OverrideFile = { reason: string; records: ReviewOverride[] };
type OutputFile = { records: NormalizationOutputRecord[]; audit?: unknown };

const repositoryRoot = path.resolve(process.cwd(), "../..");
const normalizationDirectory = path.join(
  repositoryRoot,
  "data/vocabulary/normalization"
);
const overridePath = path.join(
  normalizationDirectory,
  "manual-overrides/review-required-15.json"
);
const manifestPath = path.join(normalizationDirectory, "manifest.json");

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJsonAtomically = async (filePath: string, value: unknown) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
};

const main = async () => {
  const [manifest, overrideFile] = await Promise.all([
    readJson<NormalizationManifest>(manifestPath),
    readJson<OverrideFile>(overridePath),
  ]);
  if (overrideFile.records.length !== 15) {
    throw new Error(`Cần đúng 15 override, hiện có ${overrideFile.records.length}.`);
  }

  const overrideIds = new Set<number>();
  const batchIds = new Set<string>();
  for (const override of overrideFile.records) {
    if (overrideIds.has(override.id)) {
      throw new Error(`Override trùng id=${override.id}.`);
    }
    overrideIds.add(override.id);
    const batch = manifest.batches.find((item) =>
      item.recordIds.includes(override.id)
    );
    if (!batch) throw new Error(`Không tìm thấy batch cho id=${override.id}.`);
    batchIds.add(batch.batchId);
  }

  let updatedRecords = 0;
  for (const batchId of batchIds) {
    const manifestBatch = manifest.batches.find(
      (item) => item.batchId === batchId
    )!;
    const input = await readJson<{
      records: Parameters<typeof validateOutputRecord>[1][];
    }>(
      path.join(
        normalizationDirectory,
        "input",
        manifestBatch.inputFile
      )
    );
    const outputPath = path.join(
      normalizationDirectory,
      "output",
      manifestBatch.outputFile
    );
    const output = await readJson<OutputFile>(outputPath);
    const sourceById = new Map(input.records.map((record) => [record.id, record]));

    output.records = output.records.map((record) => {
      const override = overrideFile.records.find((item) => item.id === record.id);
      if (!override) return record;
      const examples = override.examples_clean ?? record.examples_clean;
      const firstExample = examples[0];
      if (!firstExample) throw new Error(`id=${record.id}: không có ví dụ.`);
      updatedRecords += 1;
      return {
        ...record,
        ...override,
        examples_clean: examples,
        example_en_clean: firstExample.example_en,
        example_vi_clean: firstExample.example_vi,
      };
    });

    const errors = output.records.flatMap((record) => {
      const source = sourceById.get(record.id);
      if (!source) return [`id=${record.id}: không có source trong input.`];
      return validateOutputRecord(record, source).errors.map(
        (error) => `id=${record.id}: ${error}`
      );
    });
    if (errors.length > 0) {
      throw new Error(`${batchId} không hợp lệ:\n${errors.join("\n")}`);
    }

    output.audit = {
      source: "manual-review-override",
      overrideFile: path.relative(repositoryRoot, overridePath),
      reason: overrideFile.reason,
      databaseUpdated: false,
    };
    await writeJsonAtomically(outputPath, output);
  }

  if (updatedRecords !== overrideFile.records.length) {
    throw new Error(
      `Chỉ cập nhật ${updatedRecords}/${overrideFile.records.length} record.`
    );
  }

  console.log(
    JSON.stringify(
      {
        action: "review-overrides-applied",
        updatedRecords,
        updatedBatches: batchIds.size,
        batchIds: [...batchIds].sort(),
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

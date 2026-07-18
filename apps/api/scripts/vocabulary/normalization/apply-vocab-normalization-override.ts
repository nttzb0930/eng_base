import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POS_VI_BY_POS,
  type NormalizationBatch,
  type NormalizationOutputRecord,
  validateOutputRecord,
} from "./vocab-normalization.js";

type RawRecord = {
  id: number;
  quiz_meaning_vi: string;
  meaning_vi_clean: string;
  examples_clean: Array<{
    meaning_vi: string;
    example_en: string;
    example_vi: string;
  }>;
  confidence: "high" | "medium" | "low";
  review_required: boolean;
  correction_notes: string;
};

type RejectedBatch = { rawText: string };

type ManualOverride = {
  id: number;
  quiz_meaning_vi: string;
  meaning_vi_clean: string;
  example_vi: string[];
  confidence: "high" | "medium" | "low";
  review_required: boolean;
  correction_notes: string;
};

type OverrideFile = {
  batchId: string;
  reason: string;
  records: ManualOverride[];
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
const normalizationDirectory = path.join(
  repositoryRoot,
  "data/vocabulary/working/normalization"
);
const reviewDirectory = path.join(
  repositoryRoot,
  "data/vocabulary/reviews/normalization"
);
const batchId = process.argv.slice(2).find((argument) => argument !== "--");

if (!batchId || !/^batch-\d{3}$/u.test(batchId)) {
  throw new Error("Cách dùng: tsx apply-vocab-normalization-override.ts batch-NNN");
}

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJsonAtomically = async (filePath: string, value: unknown) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
};

const main = async () => {
const inputPath = path.join(normalizationDirectory, "input", `${batchId}.json`);
const rejectedPath = path.join(
  normalizationDirectory,
  "rejected",
  `${batchId}.json`
);
const overridePath = path.join(
  reviewDirectory,
  `${batchId}.json`
);
const outputPath = path.join(normalizationDirectory, "output", `${batchId}.json`);

const [input, rejected, overrideFile] = await Promise.all([
  readJson<NormalizationBatch>(inputPath),
  readJson<RejectedBatch>(rejectedPath),
  readJson<OverrideFile>(overridePath),
]);

if (overrideFile.batchId !== batchId) {
  throw new Error(`Override khai báo sai batchId: ${overrideFile.batchId}.`);
}

const parsed = JSON.parse(rejected.rawText) as { records: RawRecord[] };
const overrides = new Map(
  overrideFile.records.map((record) => [record.id, record] as const)
);

for (const record of parsed.records) {
  const override = overrides.get(record.id);
  if (!override) continue;
  if (override.example_vi.length !== record.examples_clean.length) {
    throw new Error(
      `id=${record.id}: override có ${override.example_vi.length}/${record.examples_clean.length} bản dịch.`
    );
  }
  record.quiz_meaning_vi = override.quiz_meaning_vi;
  record.meaning_vi_clean = override.meaning_vi_clean;
  record.examples_clean = record.examples_clean.map((example, index) => ({
    meaning_vi: override.quiz_meaning_vi,
    example_en: example.example_en,
    example_vi: override.example_vi[index]!,
  }));
  record.confidence = override.confidence;
  record.review_required = override.review_required;
  record.correction_notes = override.correction_notes;
  overrides.delete(record.id);
}

if (overrides.size > 0) {
  throw new Error(
    `Không tìm thấy id override trong response: ${[...overrides.keys()].join(", ")}.`
  );
}

const sourceById = new Map(input.records.map((record) => [record.id, record]));
const records: NormalizationOutputRecord[] = parsed.records.map((record) => {
  const source = sourceById.get(record.id);
  if (!source) throw new Error(`Response chứa id không thuộc batch: ${record.id}.`);
  const firstExample = record.examples_clean[0];
  if (!firstExample) throw new Error(`id=${record.id}: không có ví dụ.`);
  return {
    ...record,
    word: source.word,
    normalized_word: source.normalized_word,
    cefr_level: source.cefr_level,
    pos: source.pos,
    pos_vi_clean: POS_VI_BY_POS[source.pos] ?? "",
    example_en_clean: firstExample.example_en,
    example_vi_clean: firstExample.example_vi,
  };
});

const errors = records.flatMap((record) => {
  const source = sourceById.get(record.id)!;
  return validateOutputRecord(record, source).errors.map(
    (error) => `id=${record.id}: ${error}`
  );
});

if (errors.length > 0) {
  throw new Error(`Manual override không hợp lệ:\n${errors.join("\n")}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeJsonAtomically(outputPath, {
  records,
  audit: {
    source: "manual-override",
    overrideFile: path.relative(repositoryRoot, overridePath),
    reason: overrideFile.reason,
    databaseUpdated: false,
  },
});
await rm(rejectedPath, { force: true });

console.log(
  JSON.stringify(
    {
      action: "manual-override-applied",
      batchId,
      validRecords: records.length,
      outputPath,
      rejectedRemoved: true,
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

import { createHash } from "node:crypto";

export const NORMALIZATION_BATCH_SIZE = 10;
export const EXAMPLES_PER_WORD = 10;

export const POS_VI_BY_POS: Readonly<Record<string, string>> = {
  adjective: "tính từ",
  adverb: "phó từ",
  "be-verb": "động từ",
  conjunction: "liên từ",
  determiner: "từ hạn định",
  "do-verb": "động từ",
  "have-verb": "động từ",
  interjection: "thán từ",
  "modal auxiliary": "động từ khuyết thiếu",
  noun: "danh từ",
  number: "số từ",
  preposition: "giới từ",
  pronoun: "đại từ",
  verb: "động từ",
};

export type SourceExample = {
  example_en: string;
  example_vi: string | null;
  order: number;
};

export type SnapshotVocabularyRecord = {
  id: number;
  word: string;
  normalized_word: string;
  pos: string;
  pos_vi: string | null;
  cefr_level: string;
  phonetic: string | null;
  primary_meaning_vi: string;
  meaning_vi: string;
  example_en: string | null;
  example_vi: string | null;
  vocabulary_examples: SourceExample[];
};

export type SnapshotFile = {
  exportedAt: string;
  source: string;
  counts: { vocabularyItems: number };
  records: SnapshotVocabularyRecord[];
};

export type NormalizationInputRecord = {
  id: number;
  word: string;
  normalized_word: string;
  cefr_level: string;
  pos: string;
  pos_vi: string | null;
  phonetic: string | null;
  primary_meaning_vi: string;
  meaning_vi: string;
  example_en: string | null;
  example_vi: string | null;
  alternative_examples: Array<{
    example_en: string;
    example_vi: string | null;
  }>;
  risk_score: number;
  flags: string[];
};

export type NormalizationOutputRecord = {
  id: number;
  word: string;
  normalized_word: string;
  cefr_level: string;
  pos: string;
  pos_vi_clean: string;
  quiz_meaning_vi: string;
  meaning_vi_clean: string;
  example_en_clean: string;
  example_vi_clean: string;
  examples_clean: NormalizedExample[];
  confidence: "high" | "medium" | "low";
  review_required: boolean;
  correction_notes: string;
};

export type NormalizedExample = {
  meaning_vi: string;
  example_en: string;
  example_vi: string;
};

export type NormalizationBatch = {
  schemaVersion: 1;
  batchId: string;
  sourceSnapshotExportedAt: string;
  records: NormalizationInputRecord[];
};

export type NormalizationManifestBatch = {
  batchId: string;
  inputFile: string;
  outputFile: string;
  recordCount: number;
  firstId: number;
  lastId: number;
  recordIds: number[];
  inputSha256: string;
};

export type NormalizationManifest = {
  schemaVersion: 1;
  createdAt: string;
  sourceSnapshot: string;
  sourceSnapshotExportedAt: string;
  sourceSnapshotSha256: string;
  totalRecords: number;
  batchSize: number;
  totalBatches: number;
  batches: NormalizationManifestBatch[];
};

export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

export const escapeCsv = (value: unknown) => {
  const text = Array.isArray(value)
    ? value.join(" | ")
    : value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const countWords = (value: string) =>
  value.trim().split(/\s+/u).filter(Boolean).length;

const normalizeForComparison = (value: string) =>
  value.trim().toLocaleLowerCase("en-US").replaceAll(/\s+/gu, " ");

export const validateOutputRecord = (
  value: unknown,
  source: NormalizationInputRecord
): { record?: NormalizationOutputRecord; errors: string[] } => {
  const errors: string[] = [];
  if (!isObject(value)) return { errors: ["Record output không phải object."] };

  const requiredStrings = [
    "word",
    "normalized_word",
    "cefr_level",
    "pos",
    "pos_vi_clean",
    "quiz_meaning_vi",
    "meaning_vi_clean",
    "example_en_clean",
    "example_vi_clean",
    "confidence",
    "correction_notes",
  ] as const;

  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      errors.push(`${field} phải là chuỗi không rỗng.`);
    }
  }

  if (value.id !== source.id) errors.push(`id phải giữ nguyên ${source.id}.`);
  if (value.word !== source.word) errors.push("word đã bị thay đổi.");
  if (value.normalized_word !== source.normalized_word) {
    errors.push("normalized_word đã bị thay đổi.");
  }
  if (value.cefr_level !== source.cefr_level) {
    errors.push("cefr_level đã bị thay đổi.");
  }
  if (value.pos !== source.pos) errors.push("pos đã bị thay đổi.");

  const expectedPosVi = POS_VI_BY_POS[source.pos];
  if (!expectedPosVi) errors.push(`Không hỗ trợ pos nguồn: ${source.pos}.`);
  if (value.pos_vi_clean !== expectedPosVi) {
    errors.push(`pos_vi_clean phải là \"${expectedPosVi}\".`);
  }

  if (typeof value.quiz_meaning_vi === "string") {
    const quizWordCount = countWords(value.quiz_meaning_vi);
    if (quizWordCount < 1 || quizWordCount > 8) {
      errors.push("quiz_meaning_vi phải dài từ 1 đến 8 từ.");
    }
    if (/[();]|\.\.\./u.test(value.quiz_meaning_vi)) {
      errors.push("quiz_meaning_vi chứa chú thích hoặc ký hiệu bị cấm.");
    }
  }

  if (
    typeof value.meaning_vi_clean === "string" &&
    typeof value.quiz_meaning_vi === "string"
  ) {
    const senses = value.meaning_vi_clean.split(";").map((sense) => sense.trim());
    if (senses.length < 1 || senses.length > 4 || senses.some((sense) => !sense)) {
      errors.push("meaning_vi_clean phải có từ 1 đến 4 nghĩa không rỗng.");
    }
    if (senses[0] !== value.quiz_meaning_vi.trim()) {
      errors.push("quiz_meaning_vi phải là nghĩa đầu tiên trong meaning_vi_clean.");
    }

    if (!Array.isArray(value.examples_clean)) {
      errors.push("examples_clean phải là array.");
    } else {
      const quizMeaning = value.quiz_meaning_vi.trim();
      if (value.examples_clean.length !== EXAMPLES_PER_WORD) {
        errors.push(
          `examples_clean phải có đúng ${EXAMPLES_PER_WORD} ví dụ, hiện có ${value.examples_clean.length}.`
        );
      }

      const allowedSenses = new Set(senses);
      const coveredSenses = new Set<string>();
      const englishExamples = new Set<string>();
      let quizExampleCount = 0;
      value.examples_clean.forEach((example, index) => {
        if (!isObject(example)) {
          errors.push(`examples_clean[${index}] không phải object.`);
          return;
        }
        for (const field of ["meaning_vi", "example_en", "example_vi"] as const) {
          if (typeof example[field] !== "string" || !example[field].trim()) {
            errors.push(`examples_clean[${index}].${field} phải là chuỗi không rỗng.`);
          }
        }
        if (
          typeof example.meaning_vi !== "string" ||
          !allowedSenses.has(example.meaning_vi.trim())
        ) {
          errors.push(
            `examples_clean[${index}].meaning_vi phải khớp một nghĩa trong meaning_vi_clean.`
          );
        } else {
          const sense = example.meaning_vi.trim();
          coveredSenses.add(sense);
          if (sense === quizMeaning) quizExampleCount += 1;
        }
        if (typeof example.example_en === "string") {
          const normalizedExample = normalizeForComparison(example.example_en);
          if (englishExamples.has(normalizedExample)) {
            errors.push(`examples_clean[${index}].example_en bị trùng.`);
          }
          englishExamples.add(normalizedExample);
        }
      });

      if (quizExampleCount < 4) {
        errors.push("Nghĩa quiz phải có ít nhất 4 ví dụ.");
      }
      for (const sense of senses) {
        if (!coveredSenses.has(sense)) {
          errors.push(`Nghĩa \"${sense}\" chưa có ví dụ minh họa.`);
        }
      }

      const firstExample = value.examples_clean[0];
      if (isObject(firstExample)) {
        if (firstExample.meaning_vi !== quizMeaning) {
          errors.push("Ví dụ đầu tiên phải minh họa quiz_meaning_vi.");
        }
        if (firstExample.example_en !== value.example_en_clean) {
          errors.push("example_en_clean phải bằng example_en của ví dụ đầu tiên.");
        }
        if (firstExample.example_vi !== value.example_vi_clean) {
          errors.push("example_vi_clean phải bằng example_vi của ví dụ đầu tiên.");
        }
      }
    }
  }

  if (!(["high", "medium", "low"] as unknown[]).includes(value.confidence)) {
    errors.push("confidence chỉ được là high, medium hoặc low.");
  }
  if (typeof value.review_required !== "boolean") {
    errors.push("review_required phải là boolean.");
  }
  if (value.confidence === "low" && value.review_required !== true) {
    errors.push("confidence low bắt buộc review_required = true.");
  }

  if (errors.length > 0) return { errors };
  return { record: value as NormalizationOutputRecord, errors };
};

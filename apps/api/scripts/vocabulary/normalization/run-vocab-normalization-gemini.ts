import { GoogleGenAI, JobState } from "@google/genai";
import type { BatchJob, InlinedRequest } from "@google/genai";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  EXAMPLES_PER_WORD,
  POS_VI_BY_POS,
  type NormalizationBatch,
  type NormalizationManifest,
  type NormalizationOutputRecord,
  sha256,
  validateOutputRecord,
} from "./vocab-normalization";

const PROFILE = process.env.VOCAB_NORMALIZATION_PROFILE?.trim() ?? "full";
const IS_POS_CORRECTION = PROFILE === "pos-correction";
if (!["full", "pos-correction"].includes(PROFILE)) {
  throw new Error(`VOCAB_NORMALIZATION_PROFILE không hợp lệ: ${PROFILE}.`);
}
const MODEL =
  (IS_POS_CORRECTION
    ? process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL
    : process.env.GEMINI_VOCAB_NORMALIZATION_MODEL
  )?.trim() ||
  (IS_POS_CORRECTION
    ? "gemini-3.5-flash"
    : "gemini-3.1-flash-lite");
const MODEL_POOL =
  IS_POS_CORRECTION && process.env.GEMINI_VOCAB_POS_CORRECTION_MODELS?.trim()
    ? process.env.GEMINI_VOCAB_POS_CORRECTION_MODELS.split(",")
        .map((model) => model.trim())
        .filter(Boolean)
    : [MODEL];
if (MODEL_POOL.length === 0) {
  throw new Error("Danh sách model correction không được rỗng.");
}
const selectSynchronousModel = () =>
  MODEL_POOL[Math.floor(Math.random() * MODEL_POOL.length)] ?? MODEL;
const SYNCHRONOUS_PROVIDER =
  process.env.VOCAB_AI_PROVIDER?.trim() || "gemini";
if (!["gemini", "openai-compatible"].includes(SYNCHRONOUS_PROVIDER)) {
  throw new Error(
    `VOCAB_AI_PROVIDER không hợp lệ: ${SYNCHRONOUS_PROVIDER}. Chỉ hỗ trợ gemini hoặc openai-compatible.`
  );
}
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_SYNC_WORKERS = 10;
const MAX_SYNC_WORKERS = 20;
const DEFAULT_SYNC_REQUESTS_PER_MINUTE = 15;
const MAX_SYNC_REQUESTS_PER_MINUTE = 1_000;
const MAX_TRANSIENT_ATTEMPTS = 5;
const TERMINAL_STATES = new Set<JobState>([
  JobState.JOB_STATE_SUCCEEDED,
  JobState.JOB_STATE_PARTIALLY_SUCCEEDED,
  JobState.JOB_STATE_FAILED,
  JobState.JOB_STATE_CANCELLED,
  JobState.JOB_STATE_EXPIRED,
]);

type Action =
  | "run"
  | "submit"
  | "status"
  | "collect"
  | "test"
  | "replay"
  | "validate"
  | "run-sync";

type CliArguments = {
  action: Action;
  batchId: string;
  force: boolean;
  workers: number;
  requestsPerMinute: number;
};

type RunnerState = {
  schemaVersion: 1;
  model: string;
  jobName: string;
  submittedAt: string;
  manifestSha256: string;
  batchIds: string[];
};

type BatchOutput = {
  records: unknown[];
};

type RejectedBatch = {
  rejectedAt: string;
  model: string;
  jobName: string;
  batchId: string;
  errors: string[];
  rawText: string | null;
};

type SynchronousUsageMetadata = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
};

type SynchronousResponse = {
  text: string | null;
  responseId: string | null;
  modelVersion: string | null;
  usageMetadata: SynchronousUsageMetadata | null;
};

type SynchronousClient = {
  provider: "gemini" | "openai-compatible";
  generate: (model: string, request: InlinedRequest) => Promise<SynchronousResponse>;
};

const root = path.resolve(process.cwd(), "..", "..");
const dataDirectory = path.join(root, "data", "vocabulary");
const normalizationDirectory = path.join(
  dataDirectory,
  "working",
  IS_POS_CORRECTION ? "pos-correction" : "normalization"
);
const inputDirectory = path.join(normalizationDirectory, "input");
const outputDirectory = path.join(normalizationDirectory, "output");
const rejectedDirectory = path.join(normalizationDirectory, "rejected");
const jobsDirectory = path.join(normalizationDirectory, "jobs");
const manifestPath = path.join(normalizationDirectory, "manifest.json");
const runnerStatePath = path.join(
  normalizationDirectory,
  "gemini-current-job.json"
);
const promptPath = path.join(
  dataDirectory,
  "prompts",
  IS_POS_CORRECTION
    ? "pos-correction.md"
    : "normalization.md"
);

const outputSchema = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          quiz_meaning_vi: {
            type: "string",
            description:
              "Đúng một nghĩa tiếng Việt, không liệt kê bằng dấu phẩy, và phải giống hệt phần đầu tiên của meaning_vi_clean.",
          },
          meaning_vi_clean: {
            type: "string",
            description:
              IS_POS_CORRECTION
                ? "Chính xác 1 nghĩa phổ biến đúng expected pos; phải giống hệt quiz_meaning_vi và không có dấu chấm phẩy."
                : "Từ 1 đến 4 nghĩa cách nhau bằng dấu chấm phẩy; phần đầu tiên phải giống hệt quiz_meaning_vi.",
          },
          examples_clean: {
            type: "array",
            description:
              IS_POS_CORRECTION
                ? "Đúng 10 ví dụ khác nhau cho duy nhất quiz_meaning_vi; word phải được dùng đúng expected pos trong cả 10 câu."
                : "Đúng 10 ví dụ khác nhau. Bốn ví dụ đầu tiên phải có meaning_vi giống hệt quiz_meaning_vi. Mỗi nghĩa còn lại trong meaning_vi_clean có ít nhất một ví dụ.",
            minItems: EXAMPLES_PER_WORD,
            maxItems: EXAMPLES_PER_WORD,
            items: {
              type: "object",
              properties: {
                meaning_vi: { type: "string" },
                example_en: { type: "string" },
                example_vi: { type: "string" },
              },
              required: ["meaning_vi", "example_en", "example_vi"],
            },
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          review_required: { type: "boolean" },
          correction_notes: {
            type: "string",
            description:
              "Ghi chú tiếng Việt không rỗng mô tả nghĩa/POS đã tạo hoặc phần đã sửa.",
          },
          pos_verification: {
            type: "object",
            properties: {
              expected_pos: { type: "string" },
              senses_checked: { type: "integer" },
              examples_checked: { type: "integer" },
              quiz_meaning_matches_expected_pos: { type: "boolean" },
              all_senses_match_expected_pos: { type: "boolean" },
              all_examples_use_expected_pos: { type: "boolean" },
              explanation: { type: "string" },
            },
            required: [
              "expected_pos",
              "senses_checked",
              "examples_checked",
              "quiz_meaning_matches_expected_pos",
              "all_senses_match_expected_pos",
              "all_examples_use_expected_pos",
              "explanation",
            ],
          },
        },
        required: [
          "id",
          "quiz_meaning_vi",
          "meaning_vi_clean",
          "examples_clean",
          "confidence",
          "review_required",
          "correction_notes",
          ...(IS_POS_CORRECTION ? ["pos_verification"] : []),
        ],
      },
    },
  },
  required: ["records"],
} as const;

const extractRequestText = (request: InlinedRequest) => {
  const contents = Array.isArray(request.contents)
    ? request.contents
    : [request.contents];
  const textParts: string[] = [];
  for (const content of contents) {
    if (typeof content === "string") {
      textParts.push(content);
      continue;
    }
    if (typeof content !== "object" || content === null) continue;
    const parts = "parts" in content && Array.isArray(content.parts)
      ? content.parts
      : [];
    for (const part of parts) {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        textParts.push(part.text);
      }
    }
  }
  const text = textParts.join("\n\n").trim();
  if (!text) throw new Error("Request synchronous không có nội dung text.");
  return text;
};

const createGeminiSynchronousClient = (ai: GoogleGenAI): SynchronousClient => ({
  provider: "gemini",
  generate: async (model, request) => {
    if (!request.contents) throw new Error("Gemini request không có contents.");
    const response = await ai.models.generateContent({
      model,
      contents: request.contents,
      config: request.config,
    });
    return {
      text: response.text ?? null,
      responseId: response.responseId ?? null,
      modelVersion: response.modelVersion ?? null,
      usageMetadata: response.usageMetadata
        ? {
            promptTokenCount: response.usageMetadata.promptTokenCount ?? 0,
            candidatesTokenCount:
              response.usageMetadata.candidatesTokenCount ?? 0,
            totalTokenCount: response.usageMetadata.totalTokenCount ?? 0,
          }
        : null,
    };
  },
});

const createOpenAICompatibleClient = (
  systemPrompt: string
): SynchronousClient => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const configuredBaseUrl = process.env.OPENAI_BASE_URL?.trim();
  if (!apiKey) {
    throw new Error(
      "Thiếu OPENAI_API_KEY cho VOCAB_AI_PROVIDER=openai-compatible."
    );
  }
  if (!configuredBaseUrl) {
    throw new Error(
      "Thiếu OPENAI_BASE_URL cho VOCAB_AI_PROVIDER=openai-compatible."
    );
  }
  const baseUrl = configuredBaseUrl.replace(/\/+$/u, "");
  const useJsonMode =
    process.env.OPENAI_COMPATIBLE_JSON_MODE?.trim().toLowerCase() !== "false";

  return {
    provider: "openai-compatible",
    generate: async (model, request) => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: [
                systemPrompt,
                "OUTPUT JSON SCHEMA BẮT BUỘC:",
                JSON.stringify(outputSchema),
              ].join("\n\n"),
            },
            { role: "user", content: extractRequestText(request) },
          ],
          temperature: 0.1,
          max_tokens: 32_768,
          stream: false,
          ...(useJsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });
      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = null;
      }
      if (!response.ok) {
        const bodyObject =
          typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : null;
        const nestedError =
          bodyObject &&
          typeof bodyObject.error === "object" &&
          bodyObject.error !== null
            ? (bodyObject.error as Record<string, unknown>)
            : null;
        const message =
          (nestedError && typeof nestedError.message === "string"
            ? nestedError.message
            : bodyText) || `HTTP ${response.status}`;
        const status =
          nestedError && typeof nestedError.code === "string"
            ? nestedError.code
            : nestedError && typeof nestedError.type === "string"
              ? nestedError.type
              : response.statusText;
        throw new Error(
          JSON.stringify({
            error: { code: response.status, status, message },
          })
        );
      }
      if (typeof body !== "object" || body === null) {
        throw new Error("Proxy OpenAI trả response không phải JSON object.");
      }
      const value = body as Record<string, unknown>;
      const choices = Array.isArray(value.choices) ? value.choices : [];
      const firstChoice = choices[0];
      const message =
        typeof firstChoice === "object" && firstChoice !== null
          ? (firstChoice as Record<string, unknown>).message
          : null;
      const content =
        typeof message === "object" &&
        message !== null &&
        typeof (message as Record<string, unknown>).content === "string"
          ? ((message as Record<string, unknown>).content as string)
          : null;
      const usage =
        typeof value.usage === "object" && value.usage !== null
          ? (value.usage as Record<string, unknown>)
          : null;
      const promptTokenCount =
        usage && typeof usage.prompt_tokens === "number"
          ? usage.prompt_tokens
          : 0;
      const candidatesTokenCount =
        usage && typeof usage.completion_tokens === "number"
          ? usage.completion_tokens
          : 0;
      const totalTokenCount =
        usage && typeof usage.total_tokens === "number"
          ? usage.total_tokens
          : promptTokenCount + candidatesTokenCount;
      return {
        text: content,
        responseId: typeof value.id === "string" ? value.id : null,
        modelVersion: typeof value.model === "string" ? value.model : model,
        usageMetadata: usage
          ? { promptTokenCount, candidatesTokenCount, totalTokenCount }
          : null,
      };
    },
  };
};

const sleep = async (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const fileExists = async (filePath: string) => {
  try {
    await readFile(filePath);
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
};

const writeJsonAtomically = async (filePath: string, value: unknown) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
  await rename(temporaryPath, filePath);
};

const extractSystemPrompt = (markdown: string) => {
  const match = markdown.match(/## System prompt\s+```text\s*([\s\S]*?)```/u);
  if (!match?.[1]?.trim()) {
    throw new Error(`Không tìm thấy System prompt trong ${promptPath}.`);
  }
  return match[1].trim();
};

const validateBatchOutput = (
  output: unknown,
  input: NormalizationBatch
): { records: NormalizationOutputRecord[]; errors: string[] } => {
  if (
    typeof output !== "object" ||
    output === null ||
    !("records" in output) ||
    !Array.isArray(output.records)
  ) {
    return { records: [], errors: ["Output không có array records."] };
  }
  if (output.records.length !== input.records.length) {
    return {
      records: [],
      errors: [
        `Output có ${output.records.length}/${input.records.length} record.`,
      ],
    };
  }

  const records: NormalizationOutputRecord[] = [];
  const errors: string[] = [];
  output.records.forEach((record, index) => {
    const source = input.records[index];
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      errors.push(`id=${source.id}: Record output không phải object.`);
      return;
    }
    const modelRecord = record as Record<string, unknown>;
    if (modelRecord.id !== source.id) {
      errors.push(`id=${source.id}: ID hoặc thứ tự record đã bị thay đổi.`);
      return;
    }

    const meaning =
      typeof modelRecord.meaning_vi_clean === "string"
        ? modelRecord.meaning_vi_clean.trim()
        : "";
    const firstSense = meaning.split(";")[0]?.trim() ?? "";
    const originalQuiz =
      typeof modelRecord.quiz_meaning_vi === "string"
        ? modelRecord.quiz_meaning_vi.trim()
        : "";
    const repairedQuiz = firstSense || originalQuiz;
    const repaired =
      Boolean(firstSense) && Boolean(originalQuiz) && firstSense !== originalQuiz;
    const originalNotes =
      typeof modelRecord.correction_notes === "string"
        ? modelRecord.correction_notes.trim()
        : "";
    const expectedPosVi = POS_VI_BY_POS[source.pos];
    if (!expectedPosVi) {
      errors.push(`id=${source.id}: Không hỗ trợ POS nguồn ${source.pos}.`);
      return;
    }

    const examples = Array.isArray(modelRecord.examples_clean)
      ? modelRecord.examples_clean.map((example) => {
          if (
            typeof example !== "object" ||
            example === null ||
            Array.isArray(example)
          ) {
            return example;
          }
          const value = example as Record<string, unknown>;
          return {
            meaning_vi:
              typeof value.meaning_vi === "string"
                ? value.meaning_vi.trim()
                : value.meaning_vi,
            example_en:
              typeof value.example_en === "string"
                ? value.example_en.trim()
                : value.example_en,
            example_vi:
              typeof value.example_vi === "string"
                ? value.example_vi.trim()
                : value.example_vi,
          };
        })
      : modelRecord.examples_clean;
    const firstExample = Array.isArray(examples) ? examples[0] : undefined;
    const primaryEnglish =
      typeof firstExample === "object" &&
      firstExample !== null &&
      "example_en" in firstExample &&
      typeof firstExample.example_en === "string"
        ? firstExample.example_en
        : "";
    const primaryVietnamese =
      typeof firstExample === "object" &&
      firstExample !== null &&
      "example_vi" in firstExample &&
      typeof firstExample.example_vi === "string"
        ? firstExample.example_vi
        : "";

    const hydratedRecord = {
      ...modelRecord,
      id: source.id,
      word: source.word,
      normalized_word: source.normalized_word,
      cefr_level: source.cefr_level,
      pos: source.pos,
      pos_vi_clean: expectedPosVi,
      quiz_meaning_vi: repairedQuiz,
      meaning_vi_clean: meaning,
      example_en_clean: primaryEnglish,
      example_vi_clean: primaryVietnamese,
      examples_clean: examples,
      confidence:
        repaired && modelRecord.confidence === "high"
          ? "medium"
          : modelRecord.confidence,
      review_required: repaired ? true : modelRecord.review_required,
      correction_notes: repaired
        ? `${originalNotes} Tự động đồng bộ nghĩa quiz với nghĩa đầu tiên; cần review.`.trim()
        : originalNotes,
    };
    if (IS_POS_CORRECTION) {
      const verification = modelRecord.pos_verification;
      if (
        typeof verification !== "object" ||
        verification === null ||
        Array.isArray(verification)
      ) {
        errors.push(`id=${source.id}: thiếu pos_verification.`);
      } else {
        const check = verification as Record<string, unknown>;
        const senseCount = meaning
          .split(";")
          .map((sense) => sense.trim())
          .filter(Boolean).length;
        if (senseCount !== 1) {
          errors.push(
            `id=${source.id}: correction pass chỉ cho phép đúng 1 nghĩa chính.`
          );
        }
        if (check.expected_pos !== source.pos) {
          errors.push(
            `id=${source.id}: pos_verification.expected_pos phải là ${source.pos}.`
          );
        }
        if (check.senses_checked !== senseCount) {
          errors.push(
            `id=${source.id}: pos_verification.senses_checked phải là ${senseCount}.`
          );
        }
        if (check.examples_checked !== EXAMPLES_PER_WORD) {
          errors.push(
            `id=${source.id}: pos_verification.examples_checked phải là ${EXAMPLES_PER_WORD}.`
          );
        }
        for (const field of [
          "quiz_meaning_matches_expected_pos",
          "all_senses_match_expected_pos",
          "all_examples_use_expected_pos",
        ] as const) {
          if (check[field] !== true) {
            errors.push(`id=${source.id}: pos_verification.${field} phải là true.`);
          }
        }
        if (
          typeof check.explanation !== "string" ||
          check.explanation.trim().length < 12
        ) {
          errors.push(
            `id=${source.id}: pos_verification.explanation quá ngắn hoặc rỗng.`
          );
        }
      }
    }
    const validation = validateOutputRecord(hydratedRecord, source);
    if (validation.record) records.push(validation.record);
    validation.errors.forEach((error) => {
      errors.push(`id=${source.id}: ${error}`);
    });
  });
  return { records, errors };
};

const loadBatch = async (manifest: NormalizationManifest, batchId: string) => {
  const manifestBatch = manifest.batches.find(
    (batch) => batch.batchId === batchId
  );
  if (!manifestBatch) throw new Error(`Batch không tồn tại: ${batchId}.`);
  const inputPath = path.join(inputDirectory, manifestBatch.inputFile);
  const inputText = await readFile(inputPath, "utf8");
  if (sha256(inputText) !== manifestBatch.inputSha256) {
    throw new Error(`Checksum input sai: ${batchId}.`);
  }
  return JSON.parse(inputText) as NormalizationBatch;
};

const hasValidOutput = async (
  manifest: NormalizationManifest,
  batchId: string
) => {
  const outputPath = path.join(outputDirectory, `${batchId}.json`);
  if (!(await fileExists(outputPath))) return false;
  try {
    const [input, output] = await Promise.all([
      loadBatch(manifest, batchId),
      readJson<BatchOutput>(outputPath),
    ]);
    return validateBatchOutput(output, input).errors.length === 0;
  } catch {
    return false;
  }
};

const findPendingBatchIds = async (manifest: NormalizationManifest) => {
  const validity = await Promise.all(
    manifest.batches.map(async (batch) => ({
      batchId: batch.batchId,
      valid: await hasValidOutput(manifest, batch.batchId),
    }))
  );
  return validity.filter((item) => !item.valid).map((item) => item.batchId);
};

const buildRequests = async (
  manifest: NormalizationManifest,
  batchIds: string[],
  systemPrompt: string
): Promise<InlinedRequest[]> =>
  Promise.all(
    batchIds.map(async (batchId) => {
      const input = await loadBatch(manifest, batchId);
      return {
        metadata: { batchId },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  IS_POS_CORRECTION
                    ? "Hãy tạo lại hoàn toàn nghĩa và ví dụ theo đúng từ loại nguồn. Không suy đoán từ dữ liệu nghĩa cũ vì chúng đã được chủ động để trống."
                    : "Hãy chuẩn hóa batch từ vựng theo toàn bộ quy tắc trong system instruction.",
                  `Kiểm tra và bổ sung ${EXAMPLES_PER_WORD} ví dụ cho từng record; giữ đúng thứ tự và trả đủ ${input.records.length} record.`,
                  IS_POS_CORRECTION
                    ? "TRƯỚC KHI TRẢ JSON: chỉ giữ ĐÚNG 1 nghĩa từ điển phổ biến nhất của expected pos; cả 10 ví dụ phải dùng chính xác cùng nghĩa đó và đúng expected pos, không dùng nghĩa gần, nghĩa của cụm cố định hoặc cấu trúc làm đổi nghĩa. Dịch từng câu sang tiếng Việt tự nhiên, không chèn máy móc quiz_meaning_vi. Sau đó điền pos_verification với senses_checked=1. correction_notes bắt buộc là câu tiếng Việt không rỗng."
                    : "TRƯỚC KHI TRẢ JSON: với từng record, hãy tự đếm lại 1-4 nghĩa; đúng 10 ví dụ; 4 ví dụ ĐẦU TIÊN gắn chính xác quiz_meaning_vi; mỗi nghĩa phụ có ít nhất 1 ví dụ; quiz không có dấu ngoặc hoặc chú thích. Nếu khó phân bổ, chỉ giữ 1-2 nghĩa phổ biến nhất.",
                  "INPUT:",
                  JSON.stringify(input.records),
                ].join("\n\n"),
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          maxOutputTokens: 32_768,
          responseMimeType: "application/json",
          responseJsonSchema: outputSchema,
        },
      } satisfies InlinedRequest;
    })
  );

const archiveState = async (
  state: RunnerState,
  job: BatchJob,
  result: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  await mkdir(jobsDirectory, { recursive: true });
  await writeJsonAtomically(path.join(jobsDirectory, `${timestamp}.json`), {
    ...state,
    finalState: job.state,
    finishedAt: new Date().toISOString(),
    result,
  });
  await rm(runnerStatePath, { force: true });
};

const submit = async (
  ai: GoogleGenAI,
  manifest: NormalizationManifest,
  manifestSha256: string,
  systemPrompt: string
) => {
  if (await fileExists(runnerStatePath)) {
    throw new Error(
      `Đã có job đang được theo dõi tại ${runnerStatePath}. Dùng status hoặc collect.`
    );
  }
  const batchIds = await findPendingBatchIds(manifest);
  if (batchIds.length === 0) {
    console.log(
      JSON.stringify(
        {
          message: `Toàn bộ ${manifest.totalBatches} batch đã hợp lệ.`,
          databaseUpdated: false,
        },
        null,
        2
      )
    );
    return null;
  }

  const requests = await buildRequests(manifest, batchIds, systemPrompt);
  const job = await ai.batches.create({
    model: MODEL,
    src: requests,
    config: {
      displayName: `vocab-${PROFILE}-${new Date().toISOString()}`,
    },
  });
  if (!job.name) throw new Error("Gemini không trả về tên batch job.");

  const state: RunnerState = {
    schemaVersion: 1,
    model: MODEL,
    jobName: job.name,
    submittedAt: new Date().toISOString(),
    manifestSha256,
    batchIds,
  };
  await writeJsonAtomically(runnerStatePath, state);
  console.log(
    JSON.stringify(
      {
        action: "submitted",
        model: MODEL,
        jobName: job.name,
        state: job.state,
        requestedBatches: batchIds.length,
        runnerStatePath,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  return state;
};

const loadState = async (manifestSha256: string) => {
  if (!(await fileExists(runnerStatePath))) {
    throw new Error("Chưa có Gemini batch job đang được theo dõi.");
  }
  const state = await readJson<RunnerState>(runnerStatePath);
  if (state.model !== MODEL) {
    throw new Error(`Job dùng model ${state.model}, runner dùng ${MODEL}.`);
  }
  if (state.manifestSha256 !== manifestSha256) {
    throw new Error("Manifest đã thay đổi sau khi submit Gemini batch job.");
  }
  return state;
};

const getJob = async (ai: GoogleGenAI, state: RunnerState) =>
  ai.batches.get({ name: state.jobName });

const printStatus = (state: RunnerState, job: BatchJob) => {
  console.log(
    JSON.stringify(
      {
        model: state.model,
        jobName: state.jobName,
        state: job.state,
        error: job.error ?? null,
        requestedBatches: state.batchIds.length,
        completionStats: job.completionStats ?? null,
        submittedAt: state.submittedAt,
        updatedAt: job.updateTime ?? null,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
};

const rejectBatch = async (rejected: RejectedBatch) => {
  await mkdir(rejectedDirectory, { recursive: true });
  await writeJsonAtomically(
    path.join(rejectedDirectory, `${rejected.batchId}.json`),
    rejected
  );
};

const replayRejectedBatch = async (
  manifest: NormalizationManifest,
  batchId: string
) => {
  const rejectedPath = path.join(rejectedDirectory, `${batchId}.json`);
  if (!(await fileExists(rejectedPath))) {
    throw new Error(`Không tìm thấy response rejected: ${rejectedPath}.`);
  }

  const [input, rejected] = await Promise.all([
    loadBatch(manifest, batchId),
    readJson<RejectedBatch>(rejectedPath),
  ]);
  if (!rejected.rawText) {
    throw new Error(`${batchId} không có rawText để replay.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rejected.rawText);
  } catch (error: unknown) {
    throw new Error(
      `rawText của ${batchId} không phải JSON hợp lệ: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const validation = validateBatchOutput(parsed, input);
  const autoReviewIds = validation.records
    .filter((record) =>
      record.correction_notes.includes("Tự động đồng bộ nghĩa quiz")
    )
    .map((record) => record.id);
  console.log(
    JSON.stringify(
      {
        action:
          validation.errors.length === 0 ? "replay-passed" : "replay-rejected",
        batchId,
        validRecords: validation.records.length,
        errors: validation.errors,
        autoReviewIds,
        apiCalled: false,
        outputWritten: false,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  if (validation.errors.length > 0) process.exitCode = 1;
};

const validateSavedBatch = async (
  manifest: NormalizationManifest,
  batchId: string
) => {
  const outputPath = path.join(outputDirectory, `${batchId}.json`);
  if (!(await fileExists(outputPath))) {
    throw new Error(`Không tìm thấy output: ${outputPath}.`);
  }

  const [input, output] = await Promise.all([
    loadBatch(manifest, batchId),
    readJson<unknown>(outputPath),
  ]);
  const validation = validateBatchOutput(output, input);
  const reviewRequiredIds = validation.records
    .filter((record) => record.review_required)
    .map((record) => record.id);
  const totalExamples = validation.records.reduce(
    (sum, record) => sum + record.examples_clean.length,
    0
  );

  console.log(
    JSON.stringify(
      {
        action:
          validation.errors.length === 0
            ? "validate-passed"
            : "validate-rejected",
        batchId,
        expectedRecords: input.records.length,
        validRecords: validation.records.length,
        totalExamples,
        reviewRequiredIds,
        errors: validation.errors,
        apiCalled: false,
        outputWritten: false,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  if (validation.errors.length > 0) process.exitCode = 1;
};

const testBatch = async (
  client: SynchronousClient,
  manifest: NormalizationManifest,
  systemPrompt: string,
  batchId: string,
  force: boolean
) => {
  if (!manifest.batches.some((batch) => batch.batchId === batchId)) {
    throw new Error(`Batch không tồn tại trong manifest: ${batchId}.`);
  }
  if (!force && (await hasValidOutput(manifest, batchId))) {
    console.log(
      JSON.stringify(
        {
          action: "test-skipped",
          batchId,
          reason: "Batch đã có output hợp lệ. Dùng --force để test và ghi đè.",
          outputPath: path.join(outputDirectory, `${batchId}.json`),
          databaseUpdated: false,
        },
        null,
        2
      )
    );
    return;
  }

  const input = await loadBatch(manifest, batchId);
  const [request] = await buildRequests(
    manifest,
    [batchId],
    systemPrompt
  );
  if (!request.contents) {
    throw new Error(`Không tạo được contents cho ${batchId}.`);
  }
  const model = selectSynchronousModel();

  console.log(
    JSON.stringify(
      {
        action: "test-started",
        provider: client.provider,
        model,
        batchId,
        recordCount: input.records.length,
        mode: "synchronous",
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  const response = await client.generate(model, request);
  const rawText = response.text ?? null;
  const errors: string[] = [];
  let parsed: unknown;

  if (!rawText) {
    errors.push("Gemini response không có text.");
  } else {
    try {
      parsed = JSON.parse(rawText);
    } catch (error: unknown) {
      errors.push(
        `JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  let validRecords: NormalizationOutputRecord[] = [];
  if (parsed !== undefined) {
    const validation = validateBatchOutput(parsed, input);
    errors.push(...validation.errors);
    validRecords = validation.records;
  }

  if (errors.length > 0) {
    const rejectedPath = path.join(rejectedDirectory, `${batchId}.json`);
    await rejectBatch({
      rejectedAt: new Date().toISOString(),
      model,
      jobName: `synchronous-test:${response.responseId ?? "unknown"}`,
      batchId,
      errors,
      rawText,
    });
    console.error(
      JSON.stringify(
        {
          action: "test-rejected",
          provider: client.provider,
          model,
          batchId,
          errors,
          usageMetadata: response.usageMetadata ?? null,
          rejectedPath,
          databaseUpdated: false,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const outputPath = path.join(outputDirectory, `${batchId}.json`);
  await writeJsonAtomically(outputPath, { records: validRecords });
  await rm(path.join(rejectedDirectory, `${batchId}.json`), { force: true });
  console.log(
    JSON.stringify(
      {
        action: "test-passed",
        provider: client.provider,
        model,
        modelVersion: response.modelVersion ?? null,
        responseId: response.responseId ?? null,
        batchId,
        validRecords: validRecords.length,
        usageMetadata: response.usageMetadata ?? null,
        outputPath,
        nextSubmitWillSkipThisBatch: true,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
};

const extractApiError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return { code: null, status: null, message: String(error) };
  }
  const outer = error as Record<string, unknown>;
  let value =
    typeof outer.error === "object" && outer.error !== null
      ? (outer.error as Record<string, unknown>)
      : outer;
  const outerMessage =
    error instanceof Error
      ? error.message
      : typeof outer.message === "string"
        ? outer.message
        : null;
  if (outerMessage) {
    try {
      const parsed = JSON.parse(outerMessage) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const parsedObject = parsed as Record<string, unknown>;
        value =
          typeof parsedObject.error === "object" &&
          parsedObject.error !== null
            ? (parsedObject.error as Record<string, unknown>)
            : parsedObject;
      }
    } catch {
      // The SDK may return a normal non-JSON Error.message.
    }
  }
  const message =
    typeof value.message === "string"
      ? value.message
      : outerMessage ?? JSON.stringify(error);
  const retryMatch = message.match(/retry in\s+([\d.]+)s/iu);
  return {
    code: typeof value.code === "number" ? value.code : null,
    status: typeof value.status === "string" ? value.status : null,
    message,
    retryDelayMs: retryMatch
      ? Math.ceil(Number(retryMatch[1]) * 1_000)
      : null,
  };
};

const isTransientApiError = (error: unknown) => {
  const details = extractApiError(error);
  return (
    details.code === 429 ||
    details.code === 500 ||
    details.code === 503 ||
    details.code === 504 ||
    details.status === "RESOURCE_EXHAUSTED" ||
    details.status === "INTERNAL" ||
    details.status === "UNAVAILABLE" ||
    details.status === "DEADLINE_EXCEEDED"
  );
};

const createRequestRateLimiter = (requestsPerMinute: number) => {
  const intervalMs = Math.ceil(60_000 / requestsPerMinute);
  let nextStartAt = 0;
  let queue = Promise.resolve();

  return async () => {
    let release!: () => void;
    const previous = queue;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const now = Date.now();
    const delayMs = Math.max(0, nextStartAt - now);
    if (delayMs > 0) await sleep(delayMs);
    nextStartAt = Date.now() + intervalMs;
    release();
  };
};

const runSynchronousBatch = async (
  client: SynchronousClient,
  manifest: NormalizationManifest,
  systemPrompt: string,
  batchId: string,
  workerId: number,
  model: string,
  acquireRequestSlot: () => Promise<void>
) => {
  const input = await loadBatch(manifest, batchId);
  const [request] = await buildRequests(manifest, [batchId], systemPrompt);
  if (!request.contents) {
    throw new Error(`Không tạo được contents cho ${batchId}.`);
  }

  for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
    try {
      await acquireRequestSlot();
      const response = await client.generate(model, request);
      const rawText = response.text ?? null;
      const errors: string[] = [];
      let parsed: unknown;

      if (!rawText) {
        errors.push("Gemini response không có text.");
      } else {
        try {
          parsed = JSON.parse(rawText);
        } catch (error: unknown) {
          errors.push(
            `JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      let validRecords: NormalizationOutputRecord[] = [];
      if (parsed !== undefined) {
        const validation = validateBatchOutput(parsed, input);
        errors.push(...validation.errors);
        validRecords = validation.records;
      }

      if (errors.length > 0) {
        await rejectBatch({
          rejectedAt: new Date().toISOString(),
          model,
          jobName: `synchronous-run:${response.responseId ?? "unknown"}`,
          batchId,
          errors,
          rawText,
        });
        return {
          batchId,
          workerId,
          model,
          status: "rejected" as const,
          errors,
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        };
      }

      await writeJsonAtomically(path.join(outputDirectory, `${batchId}.json`), {
        records: validRecords,
      });
      await rm(path.join(rejectedDirectory, `${batchId}.json`), { force: true });
      return {
        batchId,
        workerId,
        model,
        status: "passed" as const,
        errors: [] as string[],
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      };
    } catch (error: unknown) {
      if (!isTransientApiError(error) || attempt === MAX_TRANSIENT_ATTEMPTS) {
        throw error;
      }
      const details = extractApiError(error);
      const exponentialDelayMs = Math.min(
        60_000,
        1_000 * 2 ** (attempt - 1)
      );
      const delayMs = Math.max(
        exponentialDelayMs,
        details.retryDelayMs ?? 0
      );
      console.warn(
        JSON.stringify({
          action: "sync-retry",
          batchId,
          workerId,
          provider: client.provider,
          model,
          attempt,
          nextAttempt: attempt + 1,
          delayMs,
          code: details.code,
          status: details.status,
          message: details.message,
        })
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`${batchId} vượt quá số lần retry.`);
};

const runSynchronous = async (
  client: SynchronousClient,
  manifest: NormalizationManifest,
  systemPrompt: string,
  workers: number,
  requestsPerMinute: number
) => {
  const batchIds = await findPendingBatchIds(manifest);
  if (batchIds.length === 0) {
    console.log(
      JSON.stringify(
        {
          action: "sync-completed",
          message: "Toàn bộ output đã hợp lệ.",
          requestedBatches: 0,
          databaseUpdated: false,
        },
        null,
        2
      )
    );
    return;
  }

  const startedAt = new Date().toISOString();
  const activeWorkers = Math.min(workers, batchIds.length);
  const acquireRequestSlot = createRequestRateLimiter(requestsPerMinute);
  let cursor = 0;
  let passedBatches = 0;
  let rejectedBatches = 0;
  let failedBatches = 0;
  let promptTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  console.log(
    JSON.stringify(
      {
        action: "sync-started",
        provider: client.provider,
        models: MODEL_POOL,
        modelSelection: MODEL_POOL.length > 1 ? "random-per-batch" : "fixed",
        pendingBatches: batchIds.length,
        workers: activeWorkers,
        requestsPerMinute,
        maxTransientAttempts: MAX_TRANSIENT_ATTEMPTS,
        startedAt,
        databaseUpdated: false,
      },
      null,
      2
    )
  );

  const worker = async (workerIndex: number) => {
    const workerId = workerIndex + 1;
    while (true) {
      const currentIndex = cursor;
      cursor += 1;
      const batchId = batchIds[currentIndex];
      if (!batchId) return;
      const model = selectSynchronousModel();

      try {
        const result = await runSynchronousBatch(
          client,
          manifest,
          systemPrompt,
          batchId,
          workerId,
          model,
          acquireRequestSlot
        );
        if (result.status === "passed") passedBatches += 1;
        else rejectedBatches += 1;
        promptTokens += result.promptTokens;
        outputTokens += result.outputTokens;
        totalTokens += result.totalTokens;
        console.log(
          JSON.stringify({
            action: `sync-${result.status}`,
            batchId,
            workerId,
            model: result.model,
            completedBatches:
              passedBatches + rejectedBatches + failedBatches,
            totalBatches: batchIds.length,
            errors: result.errors,
          })
        );
      } catch (error: unknown) {
        failedBatches += 1;
        const details = extractApiError(error);
        await rejectBatch({
          rejectedAt: new Date().toISOString(),
          model,
          jobName: "synchronous-run:error",
          batchId,
          errors: [details.message],
          rawText: null,
        });
        console.error(
          JSON.stringify({
            action: "sync-failed",
            batchId,
            workerId,
            model,
            completedBatches:
              passedBatches + rejectedBatches + failedBatches,
            totalBatches: batchIds.length,
            code: details.code,
            status: details.status,
            message: details.message,
          })
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: activeWorkers }, (_, index) => worker(index))
  );

  console.log(
    JSON.stringify(
      {
        action: "sync-finished",
        provider: client.provider,
        models: MODEL_POOL,
        modelSelection: MODEL_POOL.length > 1 ? "random-per-batch" : "fixed",
        startedAt,
        finishedAt: new Date().toISOString(),
        workers: activeWorkers,
        requestsPerMinute,
        requestedBatches: batchIds.length,
        passedBatches,
        rejectedBatches,
        failedBatches,
        usageMetadata: { promptTokens, outputTokens, totalTokens },
        outputDirectory,
        rejectedDirectory,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  if (rejectedBatches > 0 || failedBatches > 0) process.exitCode = 1;
};

const collect = async (
  manifest: NormalizationManifest,
  state: RunnerState,
  job: BatchJob
) => {
  if (!job.state || !TERMINAL_STATES.has(job.state)) {
    throw new Error(`Job chưa hoàn tất, trạng thái hiện tại: ${job.state}.`);
  }
  if (job.state !== JobState.JOB_STATE_SUCCEEDED) {
    await archiveState(state, job, {
      validBatches: 0,
      rejectedBatches: state.batchIds.length,
      error: job.error ?? null,
    });
    throw new Error(
      `Gemini batch job kết thúc với trạng thái ${job.state}: ${job.error?.message ?? "không có chi tiết"}.`
    );
  }

  const responses = job.dest?.inlinedResponses ?? [];
  if (responses.length !== state.batchIds.length) {
    await archiveState(state, job, {
      validBatches: 0,
      rejectedBatches: state.batchIds.length,
      error: `Gemini trả ${responses.length}/${state.batchIds.length} response.`,
    });
    throw new Error(
      `Gemini trả ${responses.length}/${state.batchIds.length} response.`
    );
  }

  let validBatches = 0;
  let rejectedBatches = 0;
  for (const [index, inlineResponse] of responses.entries()) {
    const batchId = state.batchIds[index];
    const input = await loadBatch(manifest, batchId);
    const rawText = inlineResponse.response?.text ?? null;
    const errors: string[] = [];
    let parsed: unknown;

    if (inlineResponse.error) {
      errors.push(
        `Gemini error ${inlineResponse.error.code ?? "unknown"}: ${inlineResponse.error.message ?? "không có chi tiết"}`
      );
    }
    if (!rawText) {
      errors.push("Gemini response không có text.");
    } else {
      try {
        parsed = JSON.parse(rawText);
      } catch (error: unknown) {
        errors.push(
          `JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (parsed !== undefined) {
      const validation = validateBatchOutput(parsed, input);
      errors.push(...validation.errors);
      if (validation.errors.length === 0) {
        await writeJsonAtomically(path.join(outputDirectory, `${batchId}.json`), {
          records: validation.records,
        });
      }
    }

    if (errors.length > 0) {
      rejectedBatches += 1;
      await rejectBatch({
        rejectedAt: new Date().toISOString(),
        model: MODEL,
        jobName: state.jobName,
        batchId,
        errors,
        rawText,
      });
    } else {
      validBatches += 1;
      await rm(path.join(rejectedDirectory, `${batchId}.json`), { force: true });
    }
  }

  const result = {
    validBatches,
    rejectedBatches,
    totalResponses: responses.length,
  };
  await archiveState(state, job, result);
  console.log(
    JSON.stringify(
      {
        action: "collected",
        ...result,
        outputDirectory,
        rejectedDirectory,
        databaseUpdated: false,
      },
      null,
      2
    )
  );
  if (rejectedBatches > 0) process.exitCode = 1;
};

const waitForTerminalState = async (
  ai: GoogleGenAI,
  state: RunnerState,
  pollIntervalMs: number
) => {
  while (true) {
    const job = await getJob(ai, state);
    printStatus(state, job);
    if (job.state && TERMINAL_STATES.has(job.state)) return job;
    await sleep(pollIntervalMs);
  }
};

const parseArguments = (): CliArguments => {
  const values = process.argv.slice(2).filter((argument) => argument !== "--");
  const actionValue = values[0] ?? "run";
  const actions: Action[] = [
    "run",
    "submit",
    "status",
    "collect",
    "test",
    "replay",
    "validate",
    "run-sync",
  ];
  if (!actions.includes(actionValue as Action)) {
    throw new Error(
      `Action không hợp lệ: ${actionValue}. Dùng run, submit, status, collect, test, replay, validate hoặc run-sync.`
    );
  }
  const batchId = values.find((value) => /^batch-\d{3}$/u.test(value)) ?? "batch-001";
  const workersArgument = values.find((value) => value.startsWith("--workers="));
  const workersFlagIndex = values.indexOf("--workers");
  const workersValue = workersArgument
    ? workersArgument.slice("--workers=".length)
    : workersFlagIndex >= 0
      ? values[workersFlagIndex + 1]
      : String(DEFAULT_SYNC_WORKERS);
  const workers = Number(workersValue);
  if (
    !Number.isInteger(workers) ||
    workers < 1 ||
    workers > MAX_SYNC_WORKERS
  ) {
    throw new Error(`--workers phải là số nguyên từ 1 đến ${MAX_SYNC_WORKERS}.`);
  }
  const rpmArgument = values.find((value) => value.startsWith("--rpm="));
  const rpmFlagIndex = values.indexOf("--rpm");
  const rpmValue = rpmArgument
    ? rpmArgument.slice("--rpm=".length)
    : rpmFlagIndex >= 0
      ? values[rpmFlagIndex + 1]
      : String(DEFAULT_SYNC_REQUESTS_PER_MINUTE);
  const requestsPerMinute = Number(rpmValue);
  if (
    !Number.isInteger(requestsPerMinute) ||
    requestsPerMinute < 1 ||
    requestsPerMinute > MAX_SYNC_REQUESTS_PER_MINUTE
  ) {
    throw new Error(
      `--rpm phải là số nguyên từ 1 đến ${MAX_SYNC_REQUESTS_PER_MINUTE}.`
    );
  }
  return {
    action: actionValue as Action,
    batchId,
    force: values.includes("--force"),
    workers,
    requestsPerMinute,
  };
};

const parsePollInterval = () => {
  const value = Number(
    process.env.GEMINI_BATCH_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS
  );
  if (!Number.isInteger(value) || value < 5_000) {
    throw new Error("GEMINI_BATCH_POLL_INTERVAL_MS phải là số nguyên >= 5000.");
  }
  return value;
};

const main = async () => {
  const { action, batchId, force, workers, requestsPerMinute } =
    parseArguments();
  await Promise.all([
    mkdir(outputDirectory, { recursive: true }),
    mkdir(rejectedDirectory, { recursive: true }),
    mkdir(jobsDirectory, { recursive: true }),
  ]);

  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText) as NormalizationManifest;
  const manifestRecordCount = manifest.batches.reduce(
    (sum, batch) => sum + batch.recordCount,
    0
  );
  if (
    manifest.totalRecords !== manifestRecordCount ||
    manifest.totalBatches !== manifest.batches.length ||
    manifest.batchSize !== 10 ||
    (!IS_POS_CORRECTION &&
      (manifest.totalRecords !== 3000 || manifest.totalBatches !== 300))
  ) {
    throw new Error(
      `Manifest không đúng profile ${PROFILE}: ${manifest.totalRecords} record/${manifest.totalBatches} batch.`
    );
  }
  const manifestSha256 = sha256(manifestText);
  if (action === "replay") {
    await replayRejectedBatch(manifest, batchId);
    return;
  }
  if (action === "validate") {
    await validateSavedBatch(manifest, batchId);
    return;
  }

  const promptMarkdown = await readFile(promptPath, "utf8");
  const systemPrompt = extractSystemPrompt(promptMarkdown);

  if (action === "run-sync" || action === "test") {
    let synchronousClient: SynchronousClient;
    if (SYNCHRONOUS_PROVIDER === "openai-compatible") {
      synchronousClient = createOpenAICompatibleClient(systemPrompt);
    } else {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error(
          "Thiếu GEMINI_API_KEY. Hãy thêm key vào file .env ở root workspace."
        );
      }
      synchronousClient = createGeminiSynchronousClient(
        new GoogleGenAI({ apiKey })
      );
    }
    if (action === "run-sync") {
      await runSynchronous(
        synchronousClient,
        manifest,
        systemPrompt,
        workers,
        requestsPerMinute
      );
    } else {
      await testBatch(
        synchronousClient,
        manifest,
        systemPrompt,
        batchId,
        force
      );
    }
    return;
  }

  if (SYNCHRONOUS_PROVIDER === "openai-compatible") {
    throw new Error(
      "Provider openai-compatible chỉ hỗ trợ test và run-sync; không hỗ trợ Gemini Batch API."
    );
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Thiếu GEMINI_API_KEY. Hãy thêm key vào file .env ở root workspace."
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  if (action === "submit") {
    await submit(ai, manifest, manifestSha256, systemPrompt);
    return;
  }

  if (action === "status") {
    const state = await loadState(manifestSha256);
    printStatus(state, await getJob(ai, state));
    return;
  }

  if (action === "collect") {
    const state = await loadState(manifestSha256);
    await collect(manifest, state, await getJob(ai, state));
    return;
  }

  const state = (await fileExists(runnerStatePath))
    ? await loadState(manifestSha256)
    : await submit(ai, manifest, manifestSha256, systemPrompt);
  if (!state) return;
  const job = await waitForTerminalState(ai, state, parsePollInterval());
  await collect(manifest, state, job);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

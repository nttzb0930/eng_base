import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeminiClientOptions,
  GeminiWritingProvider,
  type GeminiWritingClient,
  WritingAiInvalidResponseError,
} from "../provider/gemini-writing.provider";

test("Gemini client options use the official endpoint by default", () => {
  assert.deepEqual(buildGeminiClientOptions("test-key"), {
    apiKey: "test-key",
  });
});

test("Gemini client options support an explicit proxy endpoint", () => {
  assert.deepEqual(
    buildGeminiClientOptions("test-key", " http://127.0.0.1:8045 "),
    { apiKey: "test-key", httpOptions: { baseUrl: "http://127.0.0.1:8045" } }
  );
});

const configuration = {
  enabled: true,
  apiKey: "test-key",
  apiEndpoint: "",
  visionModel: "vision-model",
  gradingModel: "grading-model",
  timeoutMs: 20_000,
  dailyLimit: 5,
  reservationTtlMs: 120_000,
};

function fakeClient(responses: string[]) {
  const calls: unknown[] = [];
  const client: GeminiWritingClient = {
    generateContent: (request) => {
      calls.push(request);
      return Promise.resolve({ text: responses.shift() ?? "" });
    },
  };
  return { client, calls };
}

function partTwoResult(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const evidence = { start: 0, end: 14, text: "Dear Mr. Brown" };
  return {
    score: 4,
    scoreLabel: "Excellent",
    taskCompletion: {
      status: "PASS",
      completedCount: 1,
      totalCount: 1,
      requirements: [
        {
          requirementId: "requirement-1",
          status: "MET",
          comment: "Complete.",
          evidence: [evidence],
          suggestedFix: null,
        },
      ],
    },
    sentenceVariety: {
      status: "PASS",
      detected: [{ kind: "COMPLEX", evidence }],
      feedback: "Varied sentences.",
    },
    tone: {
      status: "PASS",
      feedback: "Professional tone.",
      suggestedOpening: null,
    },
    grammar: { status: "PASS", errors: [], feedback: "Accurate." },
    paraphrase: { status: "PASS", copiedRanges: [], feedback: "Original." },
    overallFeedback: "Complete and clear.",
    strengths: ["Professional tone"],
    improvements: [],
    improvedEmail: {
      text: "Dear Mr. Brown, thank you for contacting us.",
      wordCount: 8,
      differences: ["Added a clear greeting."],
      requirementCoverage: [
        { requirementId: "requirement-1", evidence: [evidence] },
      ],
    },
    ...overrides,
  };
}

const partTwoInput = {
  locale: "vi" as const,
  sourceEmail: "From: Michael Brown\nSubject: Printer issue",
  requirements: [
    {
      id: "requirement-1",
      textEn: "Ask one question",
      textVi: "Đặt một câu hỏi",
    },
  ],
  responseText: "Dear Mr. Brown, thank you for contacting us.",
  assistance: {
    outlineViewed: true,
    vocabularyViewed: false,
    sampleViewed: false,
    communityAnswerRestored: false,
  },
};

test("picture enrichment sends owned inline bytes and parses structured JSON", async () => {
  const { client, calls } = fakeClient([
    JSON.stringify({
      schemaVersion: 1,
      sceneSummary: "A woman prepares food in a kitchen.",
      visibleEntities: ["woman", "food", "counter"],
      visibleActions: ["preparing food"],
      relationships: ["The woman stands beside the counter."],
      requiredWordGrounding: [
        { word: "prepare", supported: true, evidence: "Preparing food" },
        { word: "food", supported: true, evidence: "Food is visible" },
      ],
    }),
  ]);
  const provider = new GeminiWritingProvider(client, configuration);

  const result = await provider.enrichPicture({
    imageBytes: Uint8Array.from([1, 2, 3]),
    mimeType: "image/png",
    requiredWords: ["prepare", "food"],
  });

  assert.equal(result.schemaVersion, 1);
  assert.match(JSON.stringify(calls[0]), /AQID/u);
  assert.match(JSON.stringify(calls[0]), /image\/png/u);
  assert.equal((calls[0] as { model: string }).model, "vision-model");
});

test("Part 1 grading passes locale and parses the provider result", async () => {
  const { client, calls } = fakeClient([
    JSON.stringify({
      score: 3,
      scoreLabel: "Xuất sắc",
      checks: {
        grammar: { status: "PASS", label: "Ngữ pháp", feedback: "Tốt." },
        keywords: { status: "PASS", label: "Từ khóa", feedback: "Đủ." },
        relevance: {
          status: "PASS",
          label: "Liên quan",
          feedback: "Đúng ảnh.",
        },
      },
      overallFeedback: "Câu trả lời hoàn chỉnh.",
      suggestion: {
        correctedSentence: "The woman is preparing food.",
        annotated: [{ text: "The woman is preparing food.", status: "KEPT" }],
        alternativeSentence: "A woman is preparing a meal.",
        explanation: "Câu hiện tại đã đúng.",
      },
    }),
  ]);
  const provider = new GeminiWritingProvider(client, configuration);

  const result = await provider.gradePartOne({
    locale: "vi",
    responseText: "The woman is preparing food.",
    requiredWords: ["prepare", "food"],
    picture: {
      source: "ENRICHED",
      context: {
        schemaVersion: 1,
        sceneSummary: "A woman prepares food.",
        visibleEntities: ["woman", "food"],
        visibleActions: ["preparing"],
        relationships: [],
        requiredWordGrounding: [],
      },
    },
  });

  assert.equal(result.score, 3);
  assert.match(JSON.stringify(calls[0]), /vi/u);
  assert.equal((calls[0] as { model: string }).model, "grading-model");
  const request = calls[0] as {
    config: { systemInstruction?: string };
  };
  assert.match(request.config.systemInstruction ?? "", /scoreLabel/u);
  assert.match(request.config.systemInstruction ?? "", /correctedSentence/u);
});

test("Part 1 grading accepts structured arguments returned as a function call", async () => {
  const client: GeminiWritingClient = {
    generateContent: () =>
      Promise.resolve({
        structured: {
          score: 3,
          scoreLabel: "Excellent",
          checks: {
            grammar: { status: "PASS", label: "Grammar", feedback: "Good." },
            keywords: { status: "PASS", label: "Keywords", feedback: "Both used." },
            relevance: { status: "PASS", label: "Relevance", feedback: "Relevant." },
          },
          overallFeedback: "Complete sentence.",
          suggestion: {
            correctedSentence: "The woman is preparing food.",
            annotated: [
              { text: "The woman is preparing food.", status: "KEPT" },
            ],
            alternativeSentence: "A woman prepares a meal.",
            explanation: "The original sentence is correct.",
          },
        },
      }),
  };
  const provider = new GeminiWritingProvider(client, configuration);

  const result = await provider.gradePartOne({
    locale: "en",
    responseText: "The woman is preparing food.",
    requiredWords: ["prepare", "food"],
    picture: {
      source: "ENRICHED",
      context: {
        schemaVersion: 1,
        sceneSummary: "A woman prepares food.",
        visibleEntities: ["woman", "food"],
        visibleActions: ["preparing"],
        relationships: [],
        requiredWordGrounding: [],
      },
    },
  });

  assert.equal(result.score, 3);
});

test("invalid provider JSON is repaired once then rejected without exposing content", async () => {
  const { client, calls } = fakeClient([
    "not-json-secret",
    "still-invalid-secret",
  ]);
  const provider = new GeminiWritingProvider(client, configuration);

  await assert.rejects(
    () =>
      provider.gradePartOne({
        locale: "en",
        responseText: "The woman is preparing food.",
        requiredWords: ["prepare", "food"],
        picture: {
          source: "ENRICHED",
          context: {
            schemaVersion: 1,
            sceneSummary: "A woman prepares food.",
            visibleEntities: [],
            visibleActions: [],
            relationships: [],
            requiredWordGrounding: [],
          },
        },
      }),
    (error: unknown) => {
      assert.equal(error instanceof WritingAiInvalidResponseError, true);
      assert.doesNotMatch(String(error), /secret/u);
      return true;
    }
  );
  assert.equal(calls.length, 2);
});

test("Part 2 grading uses the grading model, locale, and strict schema", async () => {
  const { client, calls } = fakeClient([JSON.stringify(partTwoResult())]);
  const provider = new GeminiWritingProvider(client, configuration);

  const result = await provider.gradePartTwo(partTwoInput);

  assert.equal(result.score, 4);
  const request = calls[0] as {
    model: string;
    contents: unknown;
    config: { responseJsonSchema?: unknown; systemInstruction?: string };
  };
  assert.equal(request.model, "grading-model");
  assert.match(request.config.systemInstruction ?? "", /Vietnamese/u);
  assert.doesNotMatch(JSON.stringify(request.contents), /Dear Mr\. Brown/u);
  assert.ok(request.config.responseJsonSchema);
});

test("Part 2 grading repairs one invalid schema response", async () => {
  const { client, calls } = fakeClient([
    JSON.stringify(partTwoResult({ score: 5 })),
    JSON.stringify(partTwoResult()),
  ]);
  const provider = new GeminiWritingProvider(client, configuration);

  assert.equal((await provider.gradePartTwo(partTwoInput)).score, 4);
  assert.equal(calls.length, 2);
  const repaired = calls[1] as {
    config: { systemInstruction?: string };
  };
  assert.match(
    repaired.config.systemInstruction ?? "",
    /official TOEIC Writing Part 2 0-4 rubric/iu
  );
  assert.match(
    repaired.config.systemInstruction ?? "",
    /previous output failed validation/iu
  );
});

test("Part 2 grading rejects unknown requirements", async () => {
  const invalid = partTwoResult();
  const taskCompletion = invalid.taskCompletion as {
    requirements: Array<{ requirementId: string }>;
  };
  taskCompletion.requirements[0]!.requirementId = "requirement-unknown";
  const { client } = fakeClient([JSON.stringify(invalid)]);
  const provider = new GeminiWritingProvider(client, configuration);

  await assert.rejects(
    () => provider.gradePartTwo(partTwoInput),
    WritingAiInvalidResponseError
  );
});

test("Part 2 grading rejects malformed evidence after one repair", async () => {
  const invalid = partTwoResult();
  const taskCompletion = invalid.taskCompletion as {
    requirements: Array<{ evidence: Array<{ start: number; end: number }> }>;
  };
  taskCompletion.requirements[0]!.evidence[0] = { start: 10, end: 2 };
  const { client, calls } = fakeClient([
    JSON.stringify(invalid),
    JSON.stringify(invalid),
  ]);
  const provider = new GeminiWritingProvider(client, configuration);

  await assert.rejects(
    () => provider.gradePartTwo(partTwoInput),
    WritingAiInvalidResponseError
  );
  assert.equal(calls.length, 2);
});

test("Part 2 grading propagates the provider timeout without repair", async () => {
  const client: GeminiWritingClient = {
    generateContent: (request) =>
      new Promise((_resolve, reject) => {
        request.config?.abortSignal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      }),
  };
  const provider = new GeminiWritingProvider(client, {
    ...configuration,
    timeoutMs: 5,
  });

  await assert.rejects(() => provider.gradePartTwo(partTwoInput), /aborted/u);
});

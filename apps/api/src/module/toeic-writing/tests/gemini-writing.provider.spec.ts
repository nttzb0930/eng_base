import assert from "node:assert/strict";
import test from "node:test";

import {
  GeminiWritingProvider,
  type GeminiWritingClient,
  WritingAiInvalidResponseError,
} from "../provider/gemini-writing.provider";

const configuration = {
  enabled: true,
  apiKey: "test-key",
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

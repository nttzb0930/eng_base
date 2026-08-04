import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWritingAiRepository } from "./support/in-memory-writing-ai.repository";
import { GradeToeicWritingPartOneUseCase } from "../use-cases/grade-toeic-writing-part-one.use-case";

const task = {
  id: 12,
  contentVersion: "a".repeat(64),
  requiredWords: ["prepare", "food"],
  imageSha256: "b".repeat(64),
  imageStoragePath: "task/media/image.png",
  imageMimeType: "image/png" as const,
};

const providerResult = {
  score: 3 as const,
  scoreLabel: "Excellent",
  checks: {
    grammar: {
      status: "PASS" as const,
      label: "Grammar",
      feedback: "Correct.",
    },
    keywords: {
      status: "PASS" as const,
      label: "Keywords",
      feedback: "Complete.",
    },
    relevance: {
      status: "PASS" as const,
      label: "Relevance",
      feedback: "Relevant.",
    },
  },
  overallFeedback: "A complete response.",
  suggestion: {
    correctedSentence: "The woman is preparing food.",
    annotated: [
      { text: "The woman is preparing food.", status: "KEPT" as const },
    ],
    alternativeSentence: "A woman is preparing a meal.",
    explanation: "The original is correct.",
  },
};

function request(idempotencyKey = "00000000-0000-4000-8000-000000000001") {
  return {
    contentVersion: task.contentVersion,
    responseText: "The woman is preparing food.",
    idempotencyKey,
    locale: "en" as const,
  };
}

test("validation runs before quota and provider", async () => {
  const repository = new InMemoryWritingAiRepository(
    () => new Date("2026-08-03T10:00:00.000Z")
  );
  let providerCalls = 0;
  const useCase = new GradeToeicWritingPartOneUseCase(
    { getPublishedPartOne: () => Promise.resolve(task) },
    repository,
    {
      gradePartOne: () => {
        providerCalls += 1;
        return Promise.resolve(providerResult);
      },
    },
    { resolve: () => Promise.reject(new Error("must not resolve")) },
    { dailyLimit: 5, reservationTtlMs: 120_000, gradingModel: "test-model" }
  );

  await assert.rejects(
    () =>
      useCase.execute("learner-1", 12, { ...request(), responseText: "spam" }),
    /invalid/i
  );
  assert.equal(providerCalls, 0);
  assert.deepEqual(await repository.getQuota("learner-1", "TOEIC_WRITING", 5), {
    dailyLimit: 5,
    used: 0,
    remaining: 5,
    resetAt: "2026-08-04T00:00:00.000Z",
  });
});

test("successful grade uses context, persists result, and returns quota", async () => {
  const repository = new InMemoryWritingAiRepository(
    () => new Date("2026-08-03T10:00:00.000Z")
  );
  const events: unknown[] = [];
  const useCase = new GradeToeicWritingPartOneUseCase(
    { getPublishedPartOne: () => Promise.resolve(task) },
    repository,
    { gradePartOne: () => Promise.resolve(providerResult) },
    {
      resolve: () =>
        Promise.resolve({
          source: "ENRICHED" as const,
          context: {
            schemaVersion: 1 as const,
            sceneSummary: "A woman prepares food.",
            visibleEntities: ["woman", "food"],
            visibleActions: ["preparing"],
            relationships: [],
            requiredWordGrounding: [],
          },
        }),
    },
    { dailyLimit: 5, reservationTtlMs: 120_000, gradingModel: "test-model" },
    { record: (event: unknown) => events.push(event) }
  );

  const result = await useCase.execute("learner-1", 12, request());

  assert.equal(result.score, 3);
  assert.equal(result.cached, false);
  assert.equal(result.quota.remaining, 4);
  assert.deepEqual(
    events.map((event) => (event as { name: string }).name),
    ["context_resolved", "grade_completed"]
  );
});

test("cache bypasses provider and provider failure releases reservation", async () => {
  const repository = new InMemoryWritingAiRepository(
    () => new Date("2026-08-03T10:00:00.000Z")
  );
  let shouldFail = false;
  let calls = 0;
  const useCase = new GradeToeicWritingPartOneUseCase(
    { getPublishedPartOne: () => Promise.resolve(task) },
    repository,
    {
      gradePartOne: () => {
        calls += 1;
        return shouldFail
          ? Promise.reject(new Error("provider unavailable"))
          : Promise.resolve(providerResult);
      },
    },
    {
      resolve: () =>
        Promise.resolve({
          source: "DIRECT_IMAGE" as const,
          imageBytes: Uint8Array.from([1]),
          mimeType: "image/png" as const,
        }),
    },
    { dailyLimit: 5, reservationTtlMs: 120_000, gradingModel: "test-model" }
  );

  await useCase.execute("learner-1", 12, request());
  const cached = await useCase.execute("learner-1", 12, request());
  assert.equal(cached.cached, true);
  assert.equal(calls, 1);

  shouldFail = true;
  await assert.rejects(
    () =>
      useCase.execute("learner-1", 12, {
        ...request("00000000-0000-4000-8000-000000000002"),
        responseText: "The woman prepares food.",
      }),
    /AI is unavailable/u
  );
  assert.equal(
    (await repository.getQuota("learner-1", "TOEIC_WRITING", 5)).remaining,
    4
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWritingAiRepository } from "./support/in-memory-writing-ai.repository";
import type { WritingPartTwoProviderResult } from "../provider/writing-ai-provider";
import { GradeToeicWritingPartTwoUseCase } from "../use-cases/grade-toeic-writing-part-two.use-case";

const contentVersion = "a".repeat(64);
const responseText = [
  "Dear",
  "Customer",
  ...Array.from({ length: 48 }, (_, index) => `item${index % 10}`),
].join(" ");
const greeting = { start: 0, end: 13, text: "Dear Customer" };
const task = {
  id: 22,
  contentVersion,
  sourceEmail: "From: Customer\nSubject: Printer issue",
  requirements: [
    {
      id: "requirement-1",
      textEn: "Give one piece of information",
      textVi: "Cung cấp một thông tin",
    },
  ],
};

function providerResult(
  improvedText = responseText
): WritingPartTwoProviderResult {
  const currentGreeting = { ...greeting };
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
          evidence: [{ ...currentGreeting }],
          suggestedFix: null,
        },
      ],
    },
    sentenceVariety: {
      status: "PASS",
      detected: [{ kind: "SIMPLE", evidence: { ...currentGreeting } }],
      feedback: "Clear.",
    },
    tone: { status: "PASS", feedback: "Professional.", suggestedOpening: null },
    grammar: { status: "PASS", errors: [], feedback: "Accurate." },
    paraphrase: { status: "PASS", copiedRanges: [], feedback: "Original." },
    overallFeedback: "Complete.",
    strengths: ["Clear response"],
    improvements: [],
    improvedEmail: {
      text: improvedText,
      wordCount: improvedText.trim().split(/\s+/u).length,
      differences: [],
      requirementCoverage: [
        {
          requirementId: "requirement-1",
          evidence: [{ ...currentGreeting }],
        },
      ],
    },
  };
}

function request(
  idempotencyKey = "00000000-0000-4000-8000-000000000001",
  text = responseText
) {
  return {
    contentVersion,
    responseText: text,
    idempotencyKey,
    locale: "vi" as const,
  };
}

function createUseCase(
  repository: InMemoryWritingAiRepository,
  gradePartTwo = (input: { responseText: string }) =>
    Promise.resolve(providerResult(input.responseText))
) {
  return new GradeToeicWritingPartTwoUseCase(
    { getPublishedPartTwo: () => Promise.resolve(task) },
    repository,
    { gradePartTwo },
    { dailyLimit: 5, reservationTtlMs: 120_000, gradingModel: "test-model" }
  );
}

test("validates response and content version before quota or provider", async () => {
  const repository = new InMemoryWritingAiRepository();
  let calls = 0;
  const useCase = createUseCase(repository, () => {
    calls += 1;
    return Promise.resolve(providerResult());
  });

  await assert.rejects(
    () => useCase.execute("learner-1", 22, request(undefined, "too short")),
    /invalid/iu
  );
  await assert.rejects(
    () =>
      useCase.execute("learner-1", 22, {
        ...request(),
        contentVersion: "b".repeat(64),
      }),
    /version/iu
  );
  assert.equal(calls, 0);
  assert.equal(
    (await repository.getQuota("learner-1", "TOEIC_WRITING", 5)).remaining,
    5
  );
});

test("grades with assistance, persists atomically, and returns quota", async () => {
  const repository = new InMemoryWritingAiRepository(
    () => new Date("2026-08-03T10:00:00.000Z")
  );
  await repository.recordAssistance({
    userId: "learner-1",
    taskId: 22,
    contentVersion,
    kind: "OUTLINE",
  });
  let providerInput: unknown;
  const useCase = createUseCase(repository, (input) => {
    providerInput = input;
    return Promise.resolve(providerResult());
  });

  const result = await useCase.execute("learner-1", 22, request());

  assert.equal(result.score, 4);
  assert.equal(result.cached, false);
  assert.equal(result.quota.remaining, 4);
  assert.equal(result.assistance.outlineViewed, true);
  assert.equal(
    (providerInput as { requirements: unknown[] }).requirements.length,
    1
  );
});

test("owned cache bypasses quota and remains isolated by learner", async () => {
  const repository = new InMemoryWritingAiRepository();
  let calls = 0;
  const useCase = createUseCase(repository, () => {
    calls += 1;
    return Promise.resolve(providerResult());
  });

  await useCase.execute("learner-1", 22, request());
  assert.equal(
    (await useCase.execute("learner-1", 22, request())).cached,
    true
  );
  await useCase.execute(
    "learner-2",
    22,
    request("00000000-0000-4000-8000-000000000002")
  );
  assert.equal(calls, 2);
});

test("provider and result-verification failures release quota", async () => {
  for (const gradePartTwo of [
    () => Promise.reject(new Error("provider unavailable")),
    () => {
      const invalid = providerResult();
      invalid.taskCompletion.requirements[0]!.evidence[0]!.text = "wrong";
      return Promise.resolve(invalid);
    },
  ]) {
    const repository = new InMemoryWritingAiRepository();
    const useCase = createUseCase(repository, gradePartTwo);
    await assert.rejects(() => useCase.execute("learner-1", 22, request()));
    assert.equal(
      (await repository.getQuota("learner-1", "TOEIC_WRITING", 5)).remaining,
      5
    );
  }
});

test("conflicting idempotency reuse and concurrent requests are rejected", async () => {
  const repository = new InMemoryWritingAiRepository();
  let releaseProvider!: (result: WritingPartTwoProviderResult) => void;
  const pending = new Promise<WritingPartTwoProviderResult>((resolve) => {
    releaseProvider = resolve;
  });
  const useCase = createUseCase(repository, () => pending);
  const first = useCase.execute("learner-1", 22, request());
  await new Promise((resolve) => setImmediate(resolve));

  await assert.rejects(
    () =>
      useCase.execute(
        "learner-1",
        22,
        request("00000000-0000-4000-8000-000000000002", `${responseText} extra`)
      ),
    /progress/iu
  );
  releaseProvider(providerResult());
  await first;

  await assert.rejects(
    () =>
      useCase.execute(
        "learner-1",
        22,
        request(
          "00000000-0000-4000-8000-000000000001",
          `${responseText} changed`
        )
      ),
    /request key/iu
  );
});

test("rejects the sixth successful unique grade in one UTC day", async () => {
  const repository = new InMemoryWritingAiRepository(
    () => new Date("2026-08-03T10:00:00.000Z")
  );
  const useCase = createUseCase(repository);

  for (let index = 0; index < 5; index += 1) {
    await useCase.execute(
      "learner-1",
      22,
      request(
        `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
        `${responseText} extra${index}`
      )
    );
  }

  await assert.rejects(
    () =>
      useCase.execute(
        "learner-1",
        22,
        request("00000000-0000-4000-8000-000000000099", `${responseText} final`)
      ),
    /quota/iu
  );
});

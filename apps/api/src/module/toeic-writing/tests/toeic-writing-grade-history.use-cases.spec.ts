import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWritingAiRepository } from "./support/in-memory-writing-ai.repository";
import { GetToeicWritingGradeUseCase } from "../use-cases/get-toeic-writing-grade.use-case";
import { ListToeicWritingGradesUseCase } from "../use-cases/list-toeic-writing-grades.use-case";

async function seedGrade(
  repository: InMemoryWritingAiRepository,
  userId: string,
  taskId: number,
  responseText: string
) {
  const reservation = await repository.reserveQuota({
    userId,
    feature: "TOEIC_WRITING",
    idempotencyKey: crypto.randomUUID(),
    responseHash: `${userId}-${taskId}-${responseText}`,
    dailyLimit: 5,
    reservationTtlMs: 120_000,
  });
  return repository.saveGradeAndCompleteQuota({
    userId,
    taskId,
    contentVersion: "a".repeat(64),
    responseText,
    responseHash: `${userId}-${taskId}-${responseText}`,
    promptVersion: "toeic-writing-part1-v1",
    reservationId: reservation.id,
    part: 1,
    locale: "vi",
    model: "test-model",
    rubricVersion: "rubric-v1",
    assistance: {
      outlineViewed: false,
      vocabularyViewed: false,
      sampleViewed: false,
      communityAnswerRestored: false,
    },
    result: {
      score: 3,
      scoreLabel: "Excellent",
      checks: {
        grammar: { status: "PASS", label: "Grammar", feedback: "Good." },
        keywords: { status: "PASS", label: "Keywords", feedback: "Good." },
        relevance: { status: "PASS", label: "Relevance", feedback: "Good." },
      },
      overallFeedback: "Good.",
      suggestion: {
        correctedSentence: responseText,
        annotated: [{ text: responseText, status: "KEPT" }],
        alternativeSentence: responseText,
        explanation: "Good.",
      },
    },
    contextSource: "ENRICHED",
  });
}

test("grade detail is owner scoped and returns the persisted response", async () => {
  const repository = new InMemoryWritingAiRepository();
  const grade = await seedGrade(
    repository,
    "learner-1",
    12,
    "The woman is preparing food."
  );
  const useCase = new GetToeicWritingGradeUseCase(repository);

  const result = await useCase.execute("learner-1", grade.id);
  assert.equal(result.responseText, "The woman is preparing food.");
  await assert.rejects(
    () => useCase.execute("learner-2", grade.id),
    /grade not found/i
  );
});

test("grade history is owner and task scoped with stable pagination", async () => {
  const repository = new InMemoryWritingAiRepository();
  await seedGrade(repository, "learner-1", 12, "First response.");
  await seedGrade(repository, "learner-1", 12, "Second response.");
  await seedGrade(repository, "learner-1", 13, "Another task.");
  await seedGrade(repository, "learner-2", 12, "Another learner.");
  const useCase = new ListToeicWritingGradesUseCase(repository);

  const first = await useCase.execute("learner-1", 12, undefined, 1);
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0]?.responseText, "Second response.");
  assert.equal(typeof first.nextCursor, "number");

  const second = await useCase.execute(
    "learner-1",
    12,
    first.nextCursor ?? undefined,
    1
  );
  assert.equal(second.items[0]?.responseText, "First response.");
  assert.equal(second.nextCursor, null);
});

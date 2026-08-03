import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWritingAiRepository } from "./support/in-memory-writing-ai.repository";

const assistance = {
  outlineViewed: false,
  vocabularyViewed: false,
  sampleViewed: false,
  communityAnswerRestored: false,
};

function reservationInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: "learner-1",
    feature: "TOEIC_WRITING" as const,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    responseHash: "a".repeat(64),
    dailyLimit: 5,
    reservationTtlMs: 120_000,
    ...overrides,
  };
}

function gradeInput(
  reservationId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    userId: "learner-1",
    taskId: 12,
    contentVersion: "b".repeat(64),
    responseText: "The woman is preparing food.",
    responseHash: "a".repeat(64),
    promptVersion: "writing-part1-v1",
    reservationId,
    part: 1 as const,
    locale: "vi" as const,
    model: "gemini-3.5-flash-lite",
    rubricVersion: "toeic-writing-part1-v1",
    assistance,
    result: { score: 3 },
    contextSource: "ENRICHED" as const,
    ...overrides,
  };
}

test("quota reservation, completion, daily limit, and idempotent retry", async () => {
  const repository = new InMemoryWritingAiRepository();
  const first = await repository.reserveQuota(reservationInput());
  const retry = await repository.reserveQuota(reservationInput());

  assert.equal(retry.id, first.id);
  await repository.saveGradeAndCompleteQuota(gradeInput(first.id));

  for (let index = 2; index <= 5; index += 1) {
    const reservation = await repository.reserveQuota(
      reservationInput({
        idempotencyKey: `00000000-0000-4000-8000-00000000000${index}`,
        responseHash: String(index).repeat(64),
      })
    );
    await repository.saveGradeAndCompleteQuota(
      gradeInput(reservation.id, {
        responseHash: String(index).repeat(64),
      })
    );
  }

  await assert.rejects(
    () =>
      repository.reserveQuota(
        reservationInput({
          idempotencyKey: "00000000-0000-4000-8000-000000000006",
          responseHash: "f".repeat(64),
        })
      ),
    /daily quota/i
  );
});

test("single in-flight, release, stale cleanup, and idempotency conflict", async () => {
  let now = new Date("2026-08-03T10:00:00.000Z");
  const repository = new InMemoryWritingAiRepository(() => now);
  const first = await repository.reserveQuota(reservationInput());

  await assert.rejects(
    () =>
      repository.reserveQuota(
        reservationInput({
          idempotencyKey: "00000000-0000-4000-8000-000000000002",
          responseHash: "b".repeat(64),
        })
      ),
    /in flight/i
  );
  await assert.rejects(
    () =>
      repository.reserveQuota(
        reservationInput({ responseHash: "c".repeat(64) })
      ),
    /idempotency/i
  );

  await repository.releaseQuota(first.id);
  const second = await repository.reserveQuota(
    reservationInput({
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
      responseHash: "b".repeat(64),
    })
  );
  now = new Date("2026-08-03T10:03:00.001Z");
  const third = await repository.reserveQuota(
    reservationInput({
      idempotencyKey: "00000000-0000-4000-8000-000000000003",
      responseHash: "c".repeat(64),
    })
  );

  assert.notEqual(second.id, third.id);
});

test("grade cache is owner-scoped and assistance recording is idempotent", async () => {
  const repository = new InMemoryWritingAiRepository();
  const reservation = await repository.reserveQuota(reservationInput());
  await repository.saveGradeAndCompleteQuota(gradeInput(reservation.id));

  const key = {
    userId: "learner-1",
    taskId: 12,
    contentVersion: "b".repeat(64),
    responseHash: "a".repeat(64),
    promptVersion: "writing-part1-v1",
  };
  assert.ok(await repository.findOwnedCachedGrade(key));
  assert.equal(
    await repository.findOwnedCachedGrade({ ...key, userId: "learner-2" }),
    null
  );

  const event = {
    userId: "learner-1",
    taskId: 12,
    contentVersion: "b".repeat(64),
    kind: "VOCABULARY" as const,
  };
  await repository.recordAssistance(event);
  await repository.recordAssistance(event);
  assert.deepEqual(await repository.getAssistanceSnapshot(event), {
    ...assistance,
    vocabularyViewed: true,
  });
});

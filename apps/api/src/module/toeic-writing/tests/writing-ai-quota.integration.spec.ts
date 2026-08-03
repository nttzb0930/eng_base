import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { PrismaWritingAiRepository } from "../repository/prisma-writing-ai.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

test(
  "database quota permits five completions and only one concurrent reservation",
  { skip: !testDatabaseUrl },
  async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;
    const prisma = new PrismaService();
    const repository = new PrismaWritingAiRepository(prisma);
    const userId = randomUUID();
    const courseCode = `writing-ai-${randomUUID()}`;

    try {
      await prisma.users.create({
        data: {
          id: userId,
          email: `${userId}@example.test`,
          username: `u-${userId}`,
          full_name: "Writing AI Test",
          password: "not-used-in-integration-test",
        },
      });
      const course = await prisma.courses.create({
        data: { code: courseCode, title: courseCode, image_src: "/test.svg" },
      });
      const set = await prisma.toeic_writing_sets.create({
        data: {
          course_id: course.id,
          source: "integration-test",
          source_set_id: randomUUID(),
          title: "Integration Test",
          order_index: 1,
        },
      });
      const task = await prisma.toeic_writing_tasks.create({
        data: {
          set_id: set.id,
          source: "integration-test",
          source_task_id: randomUUID(),
          part: 1,
          order_index: 1,
          title: "Integration Test",
          difficulty: "EASY",
          instructions_en: "Write one sentence.",
          payload: {},
          source_version: "a".repeat(64),
          content_sha256: "b".repeat(64),
          provenance: {},
          license_reference: "integration-test",
        },
      });

      const race = await Promise.allSettled(
        Array.from({ length: 10 }, (_, index) =>
          repository.reserveQuota({
            userId,
            feature: "TOEIC_WRITING",
            idempotencyKey: randomUUID(),
            responseHash: `r${index}`.padEnd(64, "0"),
            dailyLimit: 5,
            reservationTtlMs: 120_000,
          })
        )
      );
      const winners = race.filter(
        (
          result
        ): result is PromiseFulfilledResult<
          Awaited<ReturnType<typeof repository.reserveQuota>>
        > => result.status === "fulfilled"
      );
      assert.equal(winners.length, 1);
      await repository.releaseQuota(winners[0]!.value.id);

      for (let index = 1; index <= 5; index += 1) {
        const responseHash = String(index).repeat(64);
        const reservation = await repository.reserveQuota({
          userId,
          feature: "TOEIC_WRITING",
          idempotencyKey: randomUUID(),
          responseHash,
          dailyLimit: 5,
          reservationTtlMs: 120_000,
        });
        await repository.saveGradeAndCompleteQuota({
          userId,
          taskId: task.id,
          contentVersion: "a".repeat(64),
          responseHash,
          promptVersion: `test-${index}`,
          reservationId: reservation.id,
          part: 1,
          locale: "en",
          model: "fake",
          rubricVersion: "test-v1",
          assistance: {
            outlineViewed: false,
            vocabularyViewed: false,
            sampleViewed: false,
            communityAnswerRestored: false,
          },
          result: { score: 3 },
          contextSource: null,
        });
      }

      await assert.rejects(
        () =>
          repository.reserveQuota({
            userId,
            feature: "TOEIC_WRITING",
            idempotencyKey: randomUUID(),
            responseHash: "f".repeat(64),
            dailyLimit: 5,
            reservationTtlMs: 120_000,
          }),
        /quota/i
      );
      const counters = await prisma.ai_usage_daily.findFirstOrThrow({
        where: { user_id: userId, feature: "TOEIC_WRITING" },
      });
      assert.deepEqual(
        { reserved: counters.reserved, used: counters.used },
        { reserved: 0, used: 5 }
      );
    } finally {
      await prisma.users.deleteMany({ where: { id: userId } });
      await prisma.courses.deleteMany({ where: { code: courseCode } });
      await prisma.$disconnect();
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }
);

import assert from "node:assert/strict";
import test from "node:test";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaService } from "../../../database/prisma/prisma.service";
import { RecordFlashcardRatingUseCase } from "../use-cases/record-flashcard-rating.use-case";

test("concurrent vocabulary ratings preserve both review attempts", async () => {
  let row: any = null;
  let tail = Promise.resolve();
  const prisma = {
    $transaction: async (operation: (tx: any) => unknown) => {
      let unlock!: () => void;
      const previous = tail;
      tail = new Promise<void>((resolve) => { unlock = resolve; });
      const tx = {
        $executeRaw: async () => previous,
        user_vocabulary_progress: {
          findUnique: async () => row,
          upsert: async ({ create, update }: any) => {
            if (!row) {
              row = { id: 1, created_at: new Date(), updated_at: new Date(), ...create };
            } else {
              row = {
                ...row, ...update,
                correct_count: row.correct_count + (update.correct_count.increment ?? 0),
                wrong_count: row.wrong_count + (update.wrong_count.increment ?? 0),
                review_count: row.review_count + update.review_count.increment,
              };
            }
            return row;
          },
        },
      };
      try { return await operation(tx); } finally { unlock(); }
    },
  } as unknown as PrismaService;
  const useCase = new RecordFlashcardRatingUseCase(prisma);

  await Promise.all([
    useCase.execute("learner-1", 10, "good"),
    useCase.execute("learner-1", 10, "good"),
  ]);

  assert.equal(row.review_count, 2);
  assert.equal(row.correct_count, 2);
  assert.equal(row.repetition_count, 2);
});

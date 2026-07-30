import { sha256Canonical } from "./toeic-reading-practice.canonical.js";
import {
  TOEIC_READING_PART_COUNTS,
  type ToeicReadingInventory,
  type ToeicReadingSource,
} from "./toeic-reading-practice.types.js";

export async function inventoryToeicReadingPractice(input: {
  source: Pick<
    ToeicReadingSource,
    "listSets" | "listTests" | "listQuestionIndex"
  >;
  sourceSet: string;
  limitTests: number;
  observedAt: string;
}): Promise<ToeicReadingInventory> {
  if (!Number.isInteger(input.limitTests) || input.limitTests <= 0) {
    throw new Error("limitTests must be a positive integer");
  }
  const [sets, tests] = await Promise.all([
    input.source.listSets(),
    input.source.listTests(),
  ]);
  const set = sets.find(
    (candidate) => !candidate.hidden && candidate.name === input.sourceSet,
  );
  if (!set) throw new Error(`Public source set "${input.sourceSet}" not found`);
  const inSet = tests.filter((test) => test.sourceSetId === set.sourceSetId);
  const excludedHiddenCount = inSet.filter((test) => test.hidden).length;
  const excludedNotFreeCount = inSet.filter(
    (test) => !test.hidden && !test.free,
  ).length;
  const selected = inSet
    .filter((test) => !test.hidden && test.free)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.sourceTestId.localeCompare(right.sourceTestId),
    )
    .slice(0, input.limitTests);
  if (selected.length !== input.limitTests) {
    throw new Error(
      `Source set "${input.sourceSet}" exposes only ${selected.length} public/free tests`,
    );
  }

  const selectedTests = await Promise.all(
    selected.map(async (sourceTest) => {
      const rows = await input.source.listQuestionIndex(sourceTest.sourceTestId);
      const questionCounts = {
        "5": rows.filter((row) => row.part === 5).length,
        "6": rows.filter((row) => row.part === 6).length,
        "7": rows.filter((row) => row.part === 7).length,
      };
      if (
        questionCounts["5"] !== TOEIC_READING_PART_COUNTS[5] ||
        questionCounts["6"] !== TOEIC_READING_PART_COUNTS[6] ||
        questionCounts["7"] !== TOEIC_READING_PART_COUNTS[7]
      ) {
        throw new Error(
          `Test ${sourceTest.sourceTestId} must expose 30/16/54 Reading questions`,
        );
      }
      return {
        sourceTestId: sourceTest.sourceTestId,
        sourceSetId: sourceTest.sourceSetId,
        title: sourceTest.title,
        order: sourceTest.order,
        updatedAt: sourceTest.updatedAt,
        questionCounts,
        passageIds: [...new Set(rows.flatMap((row) => row.passageId ?? []))].sort(),
        imageUrls: [...new Set(rows.flatMap((row) => row.imageUrl ?? []))].sort(),
      };
    }),
  );
  const questionCounts = selectedTests.reduce(
    (total, test) => ({
      "5": total["5"] + test.questionCounts["5"],
      "6": total["6"] + test.questionCounts["6"],
      "7": total["7"] + test.questionCounts["7"],
    }),
    { "5": 0, "6": 0, "7": 0 },
  );
  const base = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    sourceSet: input.sourceSet,
    limitTests: input.limitTests,
    observedAt: input.observedAt,
    selectedTests,
    excludedHiddenCount,
    excludedNotFreeCount,
    questionCounts,
    totalQuestions: questionCounts["5"] + questionCounts["6"] + questionCounts["7"],
  };
  return { ...base, inventorySha256: sha256Canonical(base) };
}

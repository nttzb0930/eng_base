import {
  buildToeicReadingPracticeTest,
  validateToeicReadingPracticeTest,
  withSourceVersion,
} from "./toeic-reading-practice.canonical.js";
import type {
  ToeicReadingDownloadSummary,
  ToeicReadingSource,
  ToeicReadingStorage,
} from "./toeic-reading-practice.types.js";

export async function downloadToeicReadingPractice(input: {
  source: Pick<
    ToeicReadingSource,
    "readQuestions" | "readPassages" | "readPracticeStats"
  >;
  storage: Pick<
    ToeicReadingStorage,
    "readInventory" | "packageExists" | "writePackageFile"
  >;
  approvedInventorySha256: string;
  now: () => Date;
}): Promise<ToeicReadingDownloadSummary> {
  const inventory = await input.storage.readInventory(
    input.approvedInventorySha256,
  );
  if (inventory.inventorySha256 !== input.approvedInventorySha256) {
    throw new Error("Approved TOEIC Reading inventory checksum mismatch");
  }
  const stats = (
    await Promise.all(
      ([5, 6, 7] as const).map((part) =>
        input.source.readPracticeStats(part),
      ),
    )
  ).flatMap((value) => value ?? []);
  const completed: string[] = [];
  const resumed: string[] = [];
  const rejected: ToeicReadingDownloadSummary["rejected"] = [];
  const failed: ToeicReadingDownloadSummary["failed"] = [];
  const questionCounts = { "5": 0, "6": 0, "7": 0 };

  for (const selected of inventory.selectedTests) {
    try {
      const [questions, allPassages] = await Promise.all([
        input.source.readQuestions(selected.sourceTestId),
        input.source.readPassages(selected.sourceTestId),
      ]);
      const referencedPassageIds = new Set(selected.passageIds);
      const passages = allPassages.filter((value) => {
        if (!value || typeof value !== "object" || !("id" in value)) return false;
        return referencedPassageIds.has(String(value.id));
      });
      const canonical = withSourceVersion(
        buildToeicReadingPracticeTest({
          sourceSetId: selected.sourceSetId,
          sourceTestId: selected.sourceTestId,
          title: selected.title,
          questions,
          passages,
        }),
      );
      const validation = validateToeicReadingPracticeTest(canonical);
      if (!validation.valid) {
        await input.storage.writePackageFile(
          selected.sourceTestId,
          canonical.sourceVersion,
          "validation.json",
          validation,
        );
        rejected.push({
          sourceTestId: selected.sourceTestId,
          errors: validation.errors,
        });
        continue;
      }
      if (
        await input.storage.packageExists(
          selected.sourceTestId,
          canonical.sourceVersion,
        )
      ) {
        resumed.push(selected.sourceTestId);
        continue;
      }
      const ids = new Set([
        ...canonical.parts.flatMap((part) =>
          part.questions.map((question) => question.sourceQuestionId),
        ),
        ...canonical.parts.flatMap((part) =>
          part.stimuli.map((stimulus) => stimulus.sourceStimulusId),
        ),
      ]);
      const packageStats = stats.filter((stat) => ids.has(stat.sourceItemId));
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.sourceVersion,
        "content.json",
        canonical,
      );
      if (packageStats.length > 0) {
        await input.storage.writePackageFile(
          selected.sourceTestId,
          canonical.sourceVersion,
          "practice-stats.json",
          {
            observedAt: input.now().toISOString(),
            items: packageStats,
          },
        );
      }
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.sourceVersion,
        "validation.json",
        validation,
      );
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.sourceVersion,
        "manifest.json",
        {
          schemaVersion: 1,
          source: "dautoeic",
          sourceSetId: selected.sourceSetId,
          sourceTestId: selected.sourceTestId,
          sourceVersion: canonical.sourceVersion,
          inventorySha256: inventory.inventorySha256,
          acquiredAt: input.now().toISOString(),
          mediaStatus:
            canonical.media.length === 0 ? "NOT_REQUIRED" : "PENDING",
        },
      );
      for (const part of canonical.parts) {
        questionCounts[String(part.part) as "5" | "6" | "7"] +=
          part.questions.length;
      }
      completed.push(selected.sourceTestId);
    } catch (error) {
      failed.push({
        sourceTestId: selected.sourceTestId,
        category: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  const sortIds = (values: string[]) => values.sort((a, b) => a.localeCompare(b));
  return {
    completed: sortIds(completed),
    resumed: sortIds(resumed),
    rejected: rejected.sort((a, b) =>
      a.sourceTestId.localeCompare(b.sourceTestId),
    ),
    failed: failed.sort((a, b) => a.sourceTestId.localeCompare(b.sourceTestId)),
    questionCounts,
  };
}

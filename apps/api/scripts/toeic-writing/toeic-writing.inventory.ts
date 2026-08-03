import { sha256Canonical } from "./toeic-writing.canonical.js";
import type {
  ToeicWritingInventory,
  ToeicWritingInventoryTask,
  ToeicWritingPartOneSourceTask,
  ToeicWritingSource,
} from "./toeic-writing.types.js";

async function inspectPartOneImages(input: {
  source: ToeicWritingSource;
  tasks: ToeicWritingPartOneSourceTask[];
  concurrency: number;
}): Promise<ToeicWritingInventoryTask[]> {
  const results = new Array<ToeicWritingInventoryTask>(input.tasks.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const task = input.tasks[index];
      if (!task) return;
      const inspection = await input.source.inspectImage(task.imageUrl);
      results[index] = {
        ...task,
        imageBytes: inspection.bytes,
        imageContentType: inspection.contentType,
      };
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(input.concurrency, input.tasks.length) },
      worker
    )
  );
  return results;
}

export async function inventoryToeicWriting(input: {
  source: ToeicWritingSource;
  observedAt: string;
  licenseReference: string;
  concurrency?: number;
}): Promise<ToeicWritingInventory> {
  const [partOne, partTwo] = await Promise.all([
    input.source.listPartOneTasks(),
    input.source.listPartTwoTasks(),
  ]);

  if (partOne.length !== 48 || partTwo.length !== 50) {
    throw new Error(
      `TOEIC Writing inventory requires 48 Part 1 and 50 Part 2 tasks; received ${partOne.length} and ${partTwo.length}`
    );
  }

  const sourceTaskIds = new Set<string>();
  for (const task of [...partOne, ...partTwo]) {
    if (sourceTaskIds.has(task.sourceTaskId)) {
      throw new Error(`duplicate source task ${task.sourceTaskId}`);
    }
    sourceTaskIds.add(task.sourceTaskId);
  }

  const inspectedPartOne = await inspectPartOneImages({
    source: input.source,
    tasks: partOne,
    concurrency: Math.max(1, Math.min(12, input.concurrency ?? 4)),
  });
  const selectedTasks: ToeicWritingInventoryTask[] = [
    ...inspectedPartOne,
    ...partTwo.map((task) => ({
      ...task,
      imageBytes: null,
      imageContentType: null,
    })),
  ].sort(
    (left, right) =>
      left.part - right.part ||
      left.order - right.order ||
      left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  const identity = {
    schemaVersion: 1 as const,
    source: "dautoeic",
    selectedTasks,
    taskCounts: {
      "1": partOne.length,
      "2": partTwo.length,
    },
    imageCount: partOne.length,
    knownImageBytes: inspectedPartOne.reduce(
      (total, task) => total + (task.imageBytes ?? 0),
      0
    ),
    unknownImageSizeCount: inspectedPartOne.filter(
      (task) => task.imageBytes === null
    ).length,
    licenseReference: input.licenseReference.trim(),
  };

  if (!identity.licenseReference) {
    throw new Error("TOEIC Writing inventory license reference is required");
  }

  return {
    ...identity,
    observedAt: input.observedAt,
    inventorySha256: sha256Canonical(identity),
  };
}

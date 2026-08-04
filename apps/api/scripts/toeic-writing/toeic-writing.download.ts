import {
  calculateToeicWritingContentSha256,
  sha256Canonical,
} from "./toeic-writing.canonical.js";
import type {
  ToeicWritingCanonicalTask,
  ToeicWritingDownloadSummary,
  ToeicWritingInventory,
  ToeicWritingInventoryTask,
  ToeicWritingStorage,
} from "./toeic-writing.types.js";
import { validateToeicWritingTask } from "./toeic-writing.validation.js";

function inventoryIdentity(inventory: ToeicWritingInventory) {
  return {
    schemaVersion: inventory.schemaVersion,
    source: inventory.source,
    selectedTasks: inventory.selectedTasks,
    taskCounts: inventory.taskCounts,
    imageCount: inventory.imageCount,
    knownImageBytes: inventory.knownImageBytes,
    unknownImageSizeCount: inventory.unknownImageSizeCount,
    licenseReference: inventory.licenseReference,
  };
}

function failureCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const status = /failed \((\d{3})\)/u.exec(message)?.[1];
  if (status) return `HTTP_${status}`;
  if (/byte verification|unsupported.*image/iu.test(message)) {
    return "MEDIA_VERIFY_FAILED";
  }
  if (/timeout|aborted/iu.test(message)) return "TIMEOUT";
  return "ERROR";
}

function reusableManifest(
  value: unknown,
  task: ToeicWritingInventoryTask
): value is Record<string, unknown> & { inventorySha256: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const manifest = value as Record<string, unknown>;
  return (
    manifest.schemaVersion === 1 &&
    manifest.sourceTaskId === task.sourceTaskId &&
    manifest.sourceVersion === task.sourceVersion &&
    typeof manifest.contentSha256 === "string" &&
    typeof manifest.inventorySha256 === "string" &&
    typeof manifest.validationReportSha256 === "string"
  );
}

async function canonicalTask(input: {
  source: {
    downloadImage(url: string): Promise<ReadableStream<Uint8Array>>;
  };
  storage: ToeicWritingStorage;
  inventory: ToeicWritingInventory;
  task: ToeicWritingInventoryTask;
}): Promise<ToeicWritingCanonicalTask> {
  const base = {
    schemaVersion: 1 as const,
    source: input.inventory.source,
    sourceTaskId: input.task.sourceTaskId,
    sourceVersion: input.task.sourceVersion,
    contentSha256: "0".repeat(64),
    retrievedAt: input.inventory.observedAt,
    licenseReference: input.inventory.licenseReference,
    order: input.task.order,
    title: input.task.title,
    difficulty: input.task.difficulty,
    instructionsEn: input.task.instructionsEn,
    instructionsVi: input.task.instructionsVi,
  };

  let task: ToeicWritingCanonicalTask;
  if (input.task.part === 1) {
    const stream = await input.source.downloadImage(input.task.imageUrl);
    const media = await input.storage.writeMediaStream({
      sourceTaskId: input.task.sourceTaskId,
      sourceVersion: input.task.sourceVersion,
      stream,
      expectedBytes: input.task.imageBytes,
      contentType: input.task.imageContentType,
    });
    task = {
      ...base,
      part: 1,
      media: {
        storageKey: media.storageKey,
        sha256: media.sha256,
        bytes: media.bytes,
        mimeType: media.mimeType,
      },
      payload: input.task.payload,
    };
  } else {
    task = {
      ...base,
      part: 2,
      media: null,
      payload: input.task.payload,
    };
  }

  return {
    ...task,
    contentSha256: calculateToeicWritingContentSha256(task),
  } as ToeicWritingCanonicalTask;
}

export async function downloadToeicWriting(input: {
  source: {
    downloadImage(url: string): Promise<ReadableStream<Uint8Array>>;
  };
  storage: ToeicWritingStorage;
  inventory: ToeicWritingInventory;
  approvedSha256: string;
  concurrency?: number;
  onProgress?: (progress: {
    completed: number;
    total: number;
    sourceTaskId: string;
    status: "COMPLETED" | "RESUMED" | "REJECTED" | "FAILED";
  }) => void;
}): Promise<ToeicWritingDownloadSummary> {
  if (input.approvedSha256 !== input.inventory.inventorySha256) {
    throw new Error("approved inventory SHA-256 does not match inventory");
  }
  if (
    sha256Canonical(inventoryIdentity(input.inventory)) !==
    input.inventory.inventorySha256
  ) {
    throw new Error("TOEIC Writing inventory checksum verification failed");
  }

  const existing = new Set(
    (await input.storage.listPackages()).map(
      (entry) => `${entry.sourceTaskId}:${entry.sourceVersion}`
    )
  );
  const summary: ToeicWritingDownloadSummary = {
    completed: [],
    resumed: [],
    rejected: [],
    failed: [],
  };
  const concurrency = Math.max(1, Math.min(12, input.concurrency ?? 4));
  let cursor = 0;
  let progress = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const task = input.inventory.selectedTasks[index];
      if (!task) return;
      const packageKey = `${task.sourceTaskId}:${task.sourceVersion}`;

      if (existing.has(packageKey)) {
        try {
          const [validation, manifest] = await Promise.all([
            input.storage.readPackageFile(
              task.sourceTaskId,
              task.sourceVersion,
              "validation.json"
            ) as Promise<{ valid?: unknown }>,
            input.storage.readPackageFile(
              task.sourceTaskId,
              task.sourceVersion,
              "manifest.json"
            ),
          ]);
          if (validation.valid === true && reusableManifest(manifest, task)) {
            if (manifest.inventorySha256 !== input.inventory.inventorySha256) {
              await input.storage.writePackageFile(
                task.sourceTaskId,
                task.sourceVersion,
                "manifest.json",
                {
                  ...manifest,
                  inventorySha256: input.inventory.inventorySha256,
                }
              );
            }
            summary.resumed.push(task.sourceTaskId);
            input.onProgress?.({
              completed: ++progress,
              total: input.inventory.selectedTasks.length,
              sourceTaskId: task.sourceTaskId,
              status: "RESUMED",
            });
            continue;
          }
        } catch {
          // An incomplete package is intentionally rebuilt below.
        }
      }

      try {
        const content = await canonicalTask({
          source: input.source,
          storage: input.storage,
          inventory: input.inventory,
          task,
        });
        const validation = validateToeicWritingTask(content);
        const validationReport = {
          ...validation,
          contentSha256: content.contentSha256,
          reportSha256: sha256Canonical({
            sourceTaskId: content.sourceTaskId,
            contentSha256: content.contentSha256,
            errors: validation.errors,
          }),
        };

        await input.storage.writePackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "validation.json",
          validationReport
        );
        if (!validation.valid) {
          summary.rejected.push({
            sourceTaskId: task.sourceTaskId,
            errors: validation.errors,
          });
          input.onProgress?.({
            completed: ++progress,
            total: input.inventory.selectedTasks.length,
            sourceTaskId: task.sourceTaskId,
            status: "REJECTED",
          });
          continue;
        }

        await input.storage.writePackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "content.json",
          content
        );
        await input.storage.writePackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "manifest.json",
          {
            schemaVersion: 1,
            source: content.source,
            sourceTaskId: content.sourceTaskId,
            sourceVersion: content.sourceVersion,
            contentSha256: content.contentSha256,
            inventorySha256: input.inventory.inventorySha256,
            retrievedAt: content.retrievedAt,
            licenseReference: content.licenseReference,
            media: content.media,
            validationReportSha256: validationReport.reportSha256,
          }
        );
        summary.completed.push(task.sourceTaskId);
        input.onProgress?.({
          completed: ++progress,
          total: input.inventory.selectedTasks.length,
          sourceTaskId: task.sourceTaskId,
          status: "COMPLETED",
        });
      } catch (error) {
        summary.failed.push({
          sourceTaskId: task.sourceTaskId,
          category: failureCategory(error),
        });
        input.onProgress?.({
          completed: ++progress,
          total: input.inventory.selectedTasks.length,
          sourceTaskId: task.sourceTaskId,
          status: "FAILED",
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, input.inventory.selectedTasks.length) },
      worker
    )
  );
  summary.completed.sort();
  summary.resumed.sort();
  summary.rejected.sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  summary.failed.sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  return summary;
}

import { createHash } from "node:crypto";

import {
  buildToeicListeningPracticeTest,
  validateToeicListeningPracticeTest,
  withListeningSourceVersion,
} from "./toeic-listening-practice.canonical.js";
import type {
  ToeicListeningDownloadSummary,
  ToeicListeningMedia,
  ToeicListeningSource,
  ToeicListeningStorage,
} from "./toeic-listening-practice.types.js";

const urlId = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);

export function sanitizeListeningDownloadError(_error: unknown) {
  void _error;
  return "Listening media download failed";
}

export function classifyListeningMediaError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status = /media request failed \((\d{3})\)/u.exec(message)?.[1];
  if (status) return `HTTP_${status}`;
  if (/verification failed/iu.test(message)) return "VERIFY_FAILED";
  if (/unsupported listening media type/iu.test(message)) {
    return "UNSUPPORTED_MEDIA_TYPE";
  }
  if (/timeout|aborted/iu.test(message)) return "TIMEOUT";
  return "MEDIA_FAILED";
}

export type ListeningDownloadProgress = {
  sourceTestId: string;
  role: "AUDIO" | "IMAGE";
  completed: number;
  total: number;
  bytes: number;
  status: "DOWNLOADED" | "REUSED" | "FAILED";
  errorCode?: string;
};

export function formatListeningProgress(value: ListeningDownloadProgress) {
  const error = value.errorCode ? ` ${value.errorCode}` : "";
  return `[${value.sourceTestId}] ${value.role} ${value.completed}/${value.total} ${value.status}${error} ${value.bytes} bytes`;
}

export async function mapListeningMediaWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("Listening download concurrency must be positive");
  }
  const results = new Array<PromiseSettledResult<R>>(values.length);
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(values[index]!, index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, run)
  );
  return results;
}

export async function downloadToeicListeningPractice(input: {
  source: Pick<
    ToeicListeningSource,
    "readQuestions" | "readStimuli" | "downloadMedia"
  >;
  storage: ToeicListeningStorage;
  approvedInventorySha256: string;
  now: () => Date;
  concurrency?: number;
  onProgress?: (value: ListeningDownloadProgress) => void;
}): Promise<ToeicListeningDownloadSummary> {
  const inventory = await input.storage.readInventory(
    input.approvedInventorySha256
  );
  if (inventory.inventorySha256 !== input.approvedInventorySha256) {
    throw new Error("Approved TOEIC Listening inventory checksum mismatch");
  }
  const completed: string[] = [];
  const resumed: string[] = [];
  const rejected: ToeicListeningDownloadSummary["rejected"] = [];
  const failed: ToeicListeningDownloadSummary["failed"] = [];
  const questionCounts = { "1": 0, "2": 0, "3": 0, "4": 0 };

  for (const selected of inventory.selectedTests) {
    try {
      const [questions, stimuli] = await Promise.all([
        input.source.readQuestions(selected.sourceTestId),
        input.source.readStimuli(selected.sourceTestId),
      ]);
      const urls = new Set([...selected.audioUrls, ...selected.imageUrls]);
      const mediaItems = inventory.media.filter((media) => urls.has(media.url));
      let progress = 0;
      const mediaResults = await mapListeningMediaWithConcurrency(
        mediaItems,
        input.concurrency ?? 2,
        async (item) => {
          try {
            const fallbackType =
              item.role === "AUDIO" ? "audio/mpeg" : "image/jpeg";
            const result = await input.storage.downloadMedia({
              sourceTestId: selected.sourceTestId,
              mediaId: urlId(item.url),
              contentType: item.contentType ?? fallbackType,
              expectedBytes: item.bytes,
              request: (offset) => input.source.downloadMedia(item.url, offset),
            });
            input.onProgress?.({
              sourceTestId: selected.sourceTestId,
              role: item.role,
              completed: ++progress,
              total: mediaItems.length,
              bytes: result.bytes,
              status: result.reused ? "REUSED" : "DOWNLOADED",
            });
            return {
              id: `${item.role.toLowerCase()}-${result.sha256.slice(0, 24)}`,
              role: item.role,
              sourceUrl: item.url,
              storagePath: result.storagePath,
              sha256: result.sha256,
              bytes: result.bytes,
              contentType: result.contentType,
            } satisfies ToeicListeningMedia;
          } catch (error) {
            input.onProgress?.({
              sourceTestId: selected.sourceTestId,
              role: item.role,
              completed: ++progress,
              total: mediaItems.length,
              bytes: 0,
              status: "FAILED",
              errorCode: classifyListeningMediaError(error),
            });
            throw error;
          }
        }
      );
      const mediaFailure = mediaResults.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      );
      if (mediaFailure) {
        failed.push({
          sourceTestId: selected.sourceTestId,
          category: classifyListeningMediaError(mediaFailure.reason),
        });
        continue;
      }
      const downloaded = mediaResults.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );
      const canonical = withListeningSourceVersion(
        buildToeicListeningPracticeTest({
          sourceSetId: selected.sourceSetId,
          sourceSetName: inventory.sourceSetName,
          sourceTestId: selected.sourceTestId,
          title: selected.title,
          questions,
          stimuli,
          media: [
            ...new Map(downloaded.map((item) => [item.id, item])).values(),
          ],
        })
      );
      const validation = validateToeicListeningPracticeTest(canonical);
      if (!validation.valid) {
        rejected.push({
          sourceTestId: selected.sourceTestId,
          errors: validation.errors,
        });
        continue;
      }
      if (
        await input.storage.packageExists(
          selected.sourceTestId,
          canonical.listeningSourceVersion
        )
      ) {
        resumed.push(selected.sourceTestId);
        continue;
      }
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.listeningSourceVersion,
        "content.json",
        canonical
      );
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.listeningSourceVersion,
        "validation.json",
        validation
      );
      await input.storage.writePackageFile(
        selected.sourceTestId,
        canonical.listeningSourceVersion,
        "manifest.json",
        {
          schemaVersion: 1,
          source: "dautoeic",
          sourceSetId: selected.sourceSetId,
          sourceTestId: selected.sourceTestId,
          listeningSourceVersion: canonical.listeningSourceVersion,
          inventorySha256: inventory.inventorySha256,
          readingInventorySha256: inventory.readingInventorySha256,
          acquiredAt: input.now().toISOString(),
          mediaCount: canonical.media.length,
          validationStatus: "VALID",
        }
      );
      for (const part of canonical.parts) {
        questionCounts[String(part.part) as "1" | "2" | "3" | "4"] +=
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
  return {
    completed: completed.sort(),
    resumed: resumed.sort(),
    rejected: rejected.sort((a, b) =>
      a.sourceTestId.localeCompare(b.sourceTestId)
    ),
    failed: failed.sort((a, b) => a.sourceTestId.localeCompare(b.sourceTestId)),
    questionCounts,
  };
}

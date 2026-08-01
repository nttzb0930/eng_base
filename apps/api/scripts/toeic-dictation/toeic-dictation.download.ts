import { createHash } from "node:crypto";

import type {
  ToeicDictationDownloadSummary,
  ToeicDictationInventory,
  ToeicDictationSource,
  ToeicDictationStorage,
} from "./toeic-dictation.types";

const mediaId = (value: string) => createHash("sha256").update(value).digest("hex");

export async function mapToeicDictationMediaWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>
) {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("TOEIC Dictation download concurrency must be positive");
  }
  const results = new Array<R>(values.length);
  let next = 0;
  const run = async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await worker(values[index]!, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, run));
  return results;
}

function classify(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status = /media request failed \((\d{3})\)/u.exec(message)?.[1];
  if (status) return `HTTP_${status}`;
  if (/verification failed/iu.test(message)) return "VERIFY_FAILED";
  if (/unsupported/iu.test(message)) return "UNSUPPORTED_MEDIA_TYPE";
  if (/timeout|aborted/iu.test(message)) return "TIMEOUT";
  return "MEDIA_FAILED";
}

export async function downloadToeicDictationPackage(input: {
  source: Pick<ToeicDictationSource, "inspectMedia"> & {
    downloadMedia(url: string, offset: number): Promise<{
      status: number;
      bytes: Uint8Array;
      contentType: string | null;
    }>;
  };
  storage: ToeicDictationStorage;
  inventory: ToeicDictationInventory;
  concurrency?: number;
  onProgress?: (value: { completed: number; total: number; url: string; status: "DOWNLOADED" | "REUSED" | "FAILED" }) => void;
}): Promise<ToeicDictationDownloadSummary> {
  const packageVersion = input.inventory.inventorySha256;
  const mediaResults = await mapToeicDictationMediaWithConcurrency(
    input.inventory.media,
    input.concurrency ?? 2,
    async (media) => {
      try {
        const result = await input.storage.downloadMedia({
          packageVersion,
          mediaId: mediaId(media.url),
          contentType: media.contentType ?? "audio/mpeg",
          expectedBytes: media.bytes,
          request: (offset) => input.source.downloadMedia(media.url, offset),
        });
        input.onProgress?.({ completed: 1, total: input.inventory.media.length, url: media.url, status: result.reused ? "REUSED" : "DOWNLOADED" });
        return { media, result };
      } catch (error) {
        input.onProgress?.({ completed: 1, total: input.inventory.media.length, url: media.url, status: "FAILED" });
        throw Object.assign(new Error(classify(error)), { mediaUrl: media.url });
      }
    }
  ).catch((error) => {
    throw error;
  });
  const downloadedMediaCount = mediaResults.length;
  await input.storage.writePackageFile(packageVersion, "content.json", input.inventory);
  await input.storage.writePackageFile(packageVersion, "manifest.json", {
    schemaVersion: 1,
    source: "dautoeic",
    collectionName: input.inventory.collectionName,
    inventorySha256: input.inventory.inventorySha256,
    media: mediaResults.map(({ media, result }) => ({
      url: media.url,
      storagePath: result.storagePath,
      sha256: result.sha256,
      bytes: result.bytes,
      contentType: result.contentType,
    })),
  });
  return {
    completed: [packageVersion],
    resumed: mediaResults.filter(({ result }) => result.reused).map(({ media }) => media.url),
    failed: [],
    downloadedMediaCount,
  };
}

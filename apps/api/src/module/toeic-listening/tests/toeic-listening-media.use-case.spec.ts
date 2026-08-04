import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicListeningMediaUseCase } from "../use-cases/get-toeic-listening-media.use-case";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "toeic-listening-media-"));
  const storagePath = "toeic-listening-practice/test-1/media/audio.mp3";
  const absolutePath = join(root, storagePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from("0123456789"));
  return { root, storagePath, absolutePath };
}

test("media use case resolves a downloaded local asset inside its root", async () => {
  const media = await fixture();
  try {
    let query: unknown;
    const prisma = {
      toeic_media_assets: {
        findFirst: (args: unknown) => {
          query = args;
          return Promise.resolve({
            id: 7,
            status: "DOWNLOADED",
            storage_path: media.storagePath,
            bytes: 10,
            content_type: "audio/mpeg",
            sha256: "a".repeat(64),
          });
        },
      },
    } as unknown as PrismaService;

    const result = await new GetToeicListeningMediaUseCase(
      prisma,
      media.root
    ).execute(7);

    assert.deepEqual(result, {
      absolutePath: media.absolutePath,
      bytes: 10,
      contentType: "audio/mpeg",
      etag: `"${"a".repeat(64)}"`,
    });
    assert.deepEqual((query as { where: unknown }).where, {
      id: 7,
      status: "DOWNLOADED",
      toeic_tests: { listening_status: "PUBLISHED" },
      toeic_media_bindings: {
        some: {
          OR: [
            { toeic_questions: { part: { in: [1, 2, 3, 4] } } },
            { toeic_stimuli: { part: { in: [1, 2, 3, 4] } } },
          ],
        },
      },
    });
  } finally {
    await rm(media.root, { recursive: true, force: true });
  }
});

test("media use case hides traversal, missing files, and metadata mismatches", async () => {
  const media = await fixture();
  try {
    const records = [
      {
        id: 1,
        status: "DOWNLOADED",
        storage_path: "../outside.mp3",
        bytes: 10,
        content_type: "audio/mpeg",
        sha256: "a".repeat(64),
      },
      {
        id: 2,
        status: "DOWNLOADED",
        storage_path: "toeic-listening-practice/missing.mp3",
        bytes: 10,
        content_type: "audio/mpeg",
        sha256: "a".repeat(64),
      },
      {
        id: 3,
        status: "DOWNLOADED",
        storage_path: media.storagePath,
        bytes: 11,
        content_type: "audio/mpeg",
        sha256: "a".repeat(64),
      },
    ];
    const prisma = {
      toeic_media_assets: {
        findFirst: ({ where }: { where: { id: number } }) =>
          Promise.resolve(records.find((record) => record.id === where.id)),
      },
    } as unknown as PrismaService;
    const useCase = new GetToeicListeningMediaUseCase(prisma, media.root);

    for (const assetId of [1, 2, 3, 999]) {
      await assert.rejects(() => useCase.execute(assetId), NotFoundException);
    }
  } finally {
    await rm(media.root, { recursive: true, force: true });
  }
});

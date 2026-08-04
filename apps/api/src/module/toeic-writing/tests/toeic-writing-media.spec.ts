import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicWritingImageUseCase } from "../use-cases/get-toeic-writing-image.use-case";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "toeic-writing-image-"));
  const storagePath = "writing/task-11/image.jpg";
  const absolutePath = join(root, storagePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from("0123456789"));
  return { root, storagePath, absolutePath };
}

test("image lookup streams the published Part 1 asset inside licensed root", async () => {
  const media = await fixture();
  try {
    let query: unknown;
    const prisma = {
      toeic_writing_tasks: {
        findFirst: (args: unknown) => {
          query = args;
          return Promise.resolve({
            image_storage_path: media.storagePath,
            image_sha256: "b".repeat(64),
            image_bytes: 10,
            image_content_type: "image/jpeg",
          });
        },
      },
    } as unknown as PrismaService;

    const result = await new GetToeicWritingImageUseCase(
      prisma,
      media.root
    ).execute(11);

    assert.deepEqual(result, {
      absolutePath: media.absolutePath,
      bytes: 10,
      contentType: "image/jpeg",
      etag: `"${"b".repeat(64)}"`,
    });
    assert.deepEqual((query as { where: unknown }).where, {
      id: 11,
      part: 1,
      status: "PUBLISHED",
    });
  } finally {
    await rm(media.root, { recursive: true, force: true });
  }
});

test("image lookup rejects a path outside licensed content root", async () => {
  const media = await fixture();
  try {
    const prisma = {
      toeic_writing_tasks: {
        findFirst: () =>
          Promise.resolve({
            image_storage_path: "../outside.jpg",
            image_sha256: "b".repeat(64),
            image_bytes: 10,
            image_content_type: "image/jpeg",
          }),
      },
    } as unknown as PrismaService;

    await assert.rejects(
      () => new GetToeicWritingImageUseCase(prisma, media.root).execute(11),
      /not found/i
    );
  } finally {
    await rm(media.root, { recursive: true, force: true });
  }
});

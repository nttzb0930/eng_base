import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFileToeicListeningStorage } from "./toeic-listening-practice.storage";

const sha256 = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

test("media download resumes a .part file and atomically stores verified bytes", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "toeic-listening-"));
  const configuredRoot = join(
    repositoryRoot,
    "var",
    "licensed-content",
    "dautoeic"
  );
  const storage = createFileToeicListeningStorage({
    repositoryRoot,
    configuredRoot,
  });
  const bytes = Buffer.from("complete-audio");
  const partial = bytes.subarray(0, 8);
  const target = storage.resolveMediaPath("test-1", "audio-1", "audio/mpeg");
  await storage.ensureMediaDirectory(target);
  await writeFile(`${target}.part`, partial);
  const ranges: string[] = [];

  const result = await storage.downloadMedia({
    sourceTestId: "test-1",
    mediaId: "audio-1",
    contentType: "audio/mpeg",
    expectedBytes: bytes.length,
    expectedSha256: sha256(bytes),
    request: async (offset) => {
      ranges.push(`bytes=${offset}-`);
      return {
        status: 206,
        bytes: bytes.subarray(partial.length),
        contentType: "audio/mpeg",
      };
    },
  });

  assert.deepEqual(ranges, ["bytes=8-"]);
  assert.equal(result.bytes, bytes.length);
  assert.equal(result.sha256, sha256(bytes));
  assert.deepEqual(await readFile(result.absolutePath), bytes);
  await assert.rejects(readFile(`${target}.part`));
});

test("verified existing media is reused without requesting source", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "toeic-listening-"));
  const storage = createFileToeicListeningStorage({
    repositoryRoot,
    configuredRoot: join(repositoryRoot, "var", "licensed-content", "dautoeic"),
  });
  const bytes = Buffer.from("image");
  const target = storage.resolveMediaPath("test-1", "image-1", "image/png");
  await storage.ensureMediaDirectory(target);
  await writeFile(target, bytes);
  let requested = false;

  const result = await storage.downloadMedia({
    sourceTestId: "test-1",
    mediaId: "image-1",
    contentType: "image/png",
    expectedBytes: bytes.length,
    expectedSha256: sha256(bytes),
    request: async () => {
      requested = true;
      throw new Error("must not request");
    },
  });

  assert.equal(result.reused, true);
  assert.equal(requested, false);
});

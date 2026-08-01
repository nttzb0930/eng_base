import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFileToeicDictationStorage } from "./toeic-dictation.storage";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

test("dictation storage resumes a partial audio file and verifies bytes", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "toeic-dictation-"));
  const storage = createFileToeicDictationStorage({
    repositoryRoot,
    configuredRoot: join(repositoryRoot, "var", "licensed-content", "dautoeic"),
  });
  const bytes = Buffer.from("complete-audio");
  const packageVersion = "a".repeat(64);
  const target = storage.resolveMediaPath(packageVersion, "audio-1", "audio/mpeg");
  await storage.ensureMediaDirectory(target);
  await writeFile(`${target}.part`, bytes.subarray(0, 8));
  const ranges: number[] = [];

  const result = await storage.downloadMedia({
    packageVersion,
    mediaId: "audio-1",
    contentType: "audio/mpeg",
    expectedBytes: bytes.length,
    expectedSha256: digest(bytes),
    request: async (offset) => {
      ranges.push(offset);
      return {
        status: 206,
        bytes: bytes.subarray(offset),
        contentType: "audio/mpeg",
      };
    },
  });

  assert.deepEqual(ranges, [8]);
  assert.equal(result.sha256, digest(bytes));
  assert.deepEqual(await readFile(result.absolutePath), bytes);
  await assert.rejects(readFile(`${target}.part`));
});

test("dictation storage reuses verified media without requesting source", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "toeic-dictation-"));
  const storage = createFileToeicDictationStorage({ repositoryRoot });
  const bytes = Buffer.from("audio");
  const packageVersion = "b".repeat(64);
  const target = storage.resolveMediaPath(packageVersion, "audio-2", "audio/mpeg");
  await storage.ensureMediaDirectory(target);
  await writeFile(target, bytes);
  let requested = false;

  const result = await storage.downloadMedia({
    packageVersion,
    mediaId: "audio-2",
    contentType: "audio/mpeg",
    expectedBytes: bytes.length,
    expectedSha256: digest(bytes),
    request: async () => {
      requested = true;
      throw new Error("must not request");
    },
  });

  assert.equal(result.reused, true);
  assert.equal(requested, false);
});

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createToeicWritingStorage,
  safeSegment,
} from "./toeic-writing.storage.js";

test("storage refuses repository root and path traversal", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "writing-repo-"));

  try {
    assert.throws(
      () =>
        createToeicWritingStorage({
          repositoryRoot,
          configuredRoot: repositoryRoot,
        }),
      /unsafe/iu
    );
    assert.throws(() => safeSegment("../escape", "sourceTaskId"), /unsafe/iu);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});

test("storage writes immutable JSON packages below private licensed content", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "writing-repo-"));
  const storage = createToeicWritingStorage({ repositoryRoot });

  try {
    await storage.writePackageFile(
      "part-1-task-1",
      "a".repeat(64),
      "content.json",
      {
        schemaVersion: 1,
      }
    );

    assert.deepEqual(
      await storage.readPackageFile(
        "part-1-task-1",
        "a".repeat(64),
        "content.json"
      ),
      { schemaVersion: 1 }
    );
    assert.deepEqual(await storage.listPackages(), [
      {
        sourceTaskId: "part-1-task-1",
        sourceVersion: "a".repeat(64),
      },
    ]);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});

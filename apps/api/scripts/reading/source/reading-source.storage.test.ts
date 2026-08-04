import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createFileReadingSourceStorage,
  resolveReadingSourceStorageRoot,
} from "./reading-source.storage.js";
import type { ReadingSourceInventory } from "./reading-source.types.js";

function temporaryRepository() {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "reading-storage-test-"));
  mkdirSync(join(repositoryRoot, "var", "licensed-content"), {
    recursive: true,
  });
  return repositoryRoot;
}

function inventory(): ReadingSourceInventory {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    createdAt: "2026-07-31T00:00:00.000Z",
    visibleCount: 1,
    acceptedCount: 1,
    excludedNotFreeCount: 0,
    excludedHiddenCount: 0,
    sourceLevelCounts: { "1": 1, "2": 0 },
    questionCount: 1,
    embeddedImageCount: 0,
    knownImageBytes: 0,
    unknownImageSizeCount: 0,
    acceptedSourceIds: ["reading-1"],
    inventorySha256: "a".repeat(64),
  };
}

test("resolves the safe repository-local licensed Reading root", () => {
  const repositoryRoot = temporaryRepository();

  assert.equal(
    resolveReadingSourceStorageRoot({ repositoryRoot }),
    join(repositoryRoot, "var", "licensed-content", "dautoeic"),
  );
});

test("rejects broad and tracked repository storage roots", () => {
  const repositoryRoot = temporaryRepository();

  for (const configuredRoot of [
    repositoryRoot,
    join(repositoryRoot, "apps"),
    homedir(),
    join(repositoryRoot, ".."),
  ]) {
    assert.throws(
      () =>
        resolveReadingSourceStorageRoot({
          repositoryRoot,
          configuredRoot,
        }),
      /unsafe Reading source storage root/u,
    );
  }
});

test("rejects a symlink that escapes the private storage root", () => {
  const repositoryRoot = temporaryRepository();
  const privateRoot = join(repositoryRoot, "var", "licensed-content");
  const outside = mkdtempSync(join(tmpdir(), "reading-storage-outside-"));
  const linked = join(privateRoot, "linked");
  symlinkSync(outside, linked, process.platform === "win32" ? "junction" : "dir");

  assert.throws(
    () =>
      resolveReadingSourceStorageRoot({
        repositoryRoot,
        configuredRoot: join(linked, "dautoeic"),
      }),
    /unsafe Reading source storage root/u,
  );
});

test("writes and reads approved inventory atomically", async () => {
  const repositoryRoot = temporaryRepository();
  const storage = createFileReadingSourceStorage({ repositoryRoot });
  const sourceInventory = inventory();

  const storageKey = await storage.writeInventory(sourceInventory);
  const loaded = await storage.readApprovedInventory(
    sourceInventory.inventorySha256,
  );

  assert.equal(
    storageKey,
    `inventories/reading/${sourceInventory.inventorySha256}.json`,
  );
  assert.deepEqual(loaded, sourceInventory);
  assert.equal(
    existsSync(
      join(
        repositoryRoot,
        "var",
        "licensed-content",
        "dautoeic",
        `${storageKey}.partial`,
      ),
    ),
    false,
  );
});

test("finalizes a package only after its manifest exists", async () => {
  const repositoryRoot = temporaryRepository();
  const storage = createFileReadingSourceStorage({ repositoryRoot });

  await storage.writePackageFile(
    "reading-1",
    "b".repeat(64),
    "content.json",
    { title: "Synthetic" },
  );
  assert.equal(await storage.packageExists("reading-1", "b".repeat(64)), false);

  await storage.writePackageFile(
    "reading-1",
    "b".repeat(64),
    "manifest.json",
    { complete: true },
  );
  assert.equal(await storage.packageExists("reading-1", "b".repeat(64)), true);
});

test("streams media, verifies length, and removes a mismatched partial file", async () => {
  const repositoryRoot = temporaryRepository();
  const storage = createFileReadingSourceStorage({ repositoryRoot });

  const result = await storage.writeMedia({
    sourceId: "reading-1",
    sourceVersion: "b".repeat(64),
    mediaId: "image-1.png",
    response: new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "content-length": "3",
        "content-type": "image/png",
      },
    }),
  });
  assert.equal(result.bytes, 3);
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    [...readFileSync(join(repositoryRoot, "var", "licensed-content", "dautoeic", result.storageKey))],
    [1, 2, 3],
  );

  await assert.rejects(
    storage.writeMedia({
      sourceId: "reading-1",
      sourceVersion: "b".repeat(64),
      mediaId: "broken.png",
      response: new Response(new Uint8Array([1, 2]), {
        headers: {
          "content-length": "3",
          "content-type": "image/png",
        },
      }),
    }),
    /expected 3 media bytes, received 2/u,
  );
  assert.equal(
    existsSync(
      join(
        repositoryRoot,
        "var",
        "licensed-content",
        "dautoeic",
        "reading",
        "reading-1",
        "b".repeat(64),
        "media",
        "broken.png.partial",
      ),
    ),
    false,
  );
});

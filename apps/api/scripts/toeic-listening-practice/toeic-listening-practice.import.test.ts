import assert from "node:assert/strict";
import test from "node:test";

import { importToeicListeningPractice } from "./toeic-listening-practice.import";
import type { ToeicListeningStorage } from "./toeic-listening-practice.types";

test("import rejects a package whose local identity is invalid without calling store", async () => {
  let called = false;
  const storage = {
    listCompletePackages: () =>
      Promise.resolve([
        { sourceTestId: "test-1", sourceVersion: "a".repeat(64) },
      ]),
    readPackageFile: (_testId: string, _version: string, name: string) => {
      void _testId;
      void _version;
      return Promise.resolve(
        name === "content.json"
          ? { sourceTestId: "other", listeningSourceVersion: "bad" }
          : {
              acquiredAt: "2026-07-31T12:00:00.000Z",
              validationStatus: "VALID",
            }
      );
    },
  } as unknown as ToeicListeningStorage;

  const result = await importToeicListeningPractice({
    storage,
    store: {
      importOne: () => {
        called = true;
        return Promise.resolve("UPDATED");
      },
    },
  });

  assert.equal(called, false);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.updated, []);
});

test("import of an empty local package set has a stable summary", async () => {
  const storage = {
    listCompletePackages: () => Promise.resolve([]),
  } as unknown as ToeicListeningStorage;
  assert.deepEqual(
    await importToeicListeningPractice({
      storage,
      store: { importOne: () => Promise.resolve("SKIPPED") },
    }),
    { updated: [], skipped: [], rejected: [], failed: [] }
  );
});

test("import reads only the latest package for a duplicated source test", async () => {
  const olderVersion = "a".repeat(64);
  const newerVersion = "b".repeat(64);
  const contentReads: string[] = [];
  const storage = {
    listCompletePackages: () =>
      Promise.resolve([
        { sourceTestId: "test-1", sourceVersion: olderVersion },
        { sourceTestId: "test-1", sourceVersion: newerVersion },
      ]),
    readPackageFile: (
      _sourceTestId: string,
      sourceVersion: string,
      name: string
    ) => {
      if (name === "manifest.json") {
        return Promise.resolve({
          acquiredAt:
            sourceVersion === newerVersion
              ? "2026-07-31T12:00:00.000Z"
              : "2026-07-31T11:00:00.000Z",
          validationStatus: "VALID",
        });
      }
      contentReads.push(sourceVersion);
      return Promise.resolve({
        sourceTestId: "invalid",
        listeningSourceVersion: "invalid",
      });
    },
  } as unknown as ToeicListeningStorage;

  const result = await importToeicListeningPractice({
    storage,
    store: { importOne: () => Promise.resolve("UPDATED") },
  });

  assert.deepEqual(contentReads, [newerVersion]);
  assert.equal(result.rejected.length, 1);
});

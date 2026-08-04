import assert from "node:assert/strict";
import test from "node:test";

import { selectLatestToeicListeningPackages } from "./toeic-listening-practice.packages";
import type { ToeicListeningStorage } from "./toeic-listening-practice.types";

test("selects only the latest acquired package for each source test", async () => {
  const storage = {
    listCompletePackages: () =>
      Promise.resolve([
        { sourceTestId: "test-1", sourceVersion: "a".repeat(64) },
        { sourceTestId: "test-1", sourceVersion: "b".repeat(64) },
        { sourceTestId: "test-2", sourceVersion: "c".repeat(64) },
      ]),
    readPackageFile: (
      _sourceTestId: string,
      sourceVersion: string,
      name: string
    ) => {
      assert.equal(name, "manifest.json");
      return Promise.resolve({
        acquiredAt: sourceVersion.startsWith("b")
          ? "2026-07-31T12:00:00.000Z"
          : "2026-07-31T11:00:00.000Z",
      });
    },
  } as unknown as ToeicListeningStorage;

  const result = await selectLatestToeicListeningPackages(storage);

  assert.equal(result.physicalPackageCount, 3);
  assert.deepEqual(result.selected, [
    { sourceTestId: "test-1", sourceVersion: "b".repeat(64) },
    { sourceTestId: "test-2", sourceVersion: "c".repeat(64) },
  ]);
  assert.deepEqual(result.superseded, [
    { sourceTestId: "test-1", sourceVersion: "a".repeat(64) },
  ]);
});

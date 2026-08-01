import assert from "node:assert/strict";
import test from "node:test";

import { validateToeicListeningPackages } from "./toeic-listening-practice.validation";
import type { ToeicListeningStorage } from "./toeic-listening-practice.types";

test("validation reports physical, selected, and superseded package counts", async () => {
  const olderVersion = "a".repeat(64);
  const newerVersion = "b".repeat(64);
  const otherVersion = "c".repeat(64);
  const storage = {
    listCompletePackages: () =>
      Promise.resolve([
        { sourceTestId: "test-1", sourceVersion: olderVersion },
        { sourceTestId: "test-1", sourceVersion: newerVersion },
        { sourceTestId: "test-2", sourceVersion: otherVersion },
      ]),
    readPackageFile: (
      _sourceTestId: string,
      sourceVersion: string,
      name: string
    ) =>
      Promise.resolve(
        name === "manifest.json"
          ? {
              acquiredAt:
                sourceVersion === newerVersion
                  ? "2026-07-31T12:00:00.000Z"
                  : "2026-07-31T11:00:00.000Z",
            }
          : {}
      ),
  } as unknown as ToeicListeningStorage;

  const result = await validateToeicListeningPackages(storage);

  assert.equal(result.physicalPackageCount, 3);
  assert.equal(result.selectedPackageCount, 2);
  assert.equal(result.supersededCount, 1);
  assert.equal(result.validCount, 0);
  assert.deepEqual(result.superseded, [
    { sourceTestId: "test-1", sourceVersion: olderVersion },
  ]);
  assert.deepEqual(
    result.invalid.map(({ sourceTestId, sourceVersion }) => ({
      sourceTestId,
      sourceVersion,
    })),
    [
      { sourceTestId: "test-1", sourceVersion: newerVersion },
      { sourceTestId: "test-2", sourceVersion: otherVersion },
    ]
  );
});

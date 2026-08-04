import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApprovedReadingInventory,
  classifyReadingSourceAccess,
} from "./reading-source.policy.js";

test("classifies only visible free Reading rows as basic content", () => {
  assert.deepEqual(
    classifyReadingSourceAccess({ isFree: true, isHidden: false }),
    {
      isFree: true,
      isHidden: false,
      classification: "BASIC_FREE",
    },
  );
  assert.equal(
    classifyReadingSourceAccess({
      isFree: false,
      isHidden: false,
    }).classification,
    "EXCLUDED_NOT_FREE",
  );
  assert.equal(
    classifyReadingSourceAccess({
      isFree: true,
      isHidden: true,
    }).classification,
    "EXCLUDED_HIDDEN",
  );
});

test("accepts an unchanged approved Reading inventory", () => {
  assert.doesNotThrow(() =>
    assertApprovedReadingInventory({
      approvedSha256: "a".repeat(64),
      liveSha256: "a".repeat(64),
      approvedAcceptedSourceIds: ["reading-2", "reading-1"],
      liveAcceptedSourceIds: ["reading-1", "reading-2"],
    }),
  );
});

test("rejects a Reading inventory checksum change", () => {
  assert.throws(
    () =>
      assertApprovedReadingInventory({
        approvedSha256: "a".repeat(64),
        liveSha256: "b".repeat(64),
        approvedAcceptedSourceIds: ["reading-1"],
        liveAcceptedSourceIds: ["reading-1"],
      }),
    /approved inventory checksum a{12} does not match live checksum b{12}/u,
  );
});

test("rejects unreviewed Reading source ID changes", () => {
  assert.throws(
    () =>
      assertApprovedReadingInventory({
        approvedSha256: "a".repeat(64),
        liveSha256: "a".repeat(64),
        approvedAcceptedSourceIds: ["reading-1"],
        liveAcceptedSourceIds: ["reading-1", "reading-2"],
      }),
    /added 1, removed 0/u,
  );
  assert.throws(
    () =>
      assertApprovedReadingInventory({
        approvedSha256: "a".repeat(64),
        liveSha256: "a".repeat(64),
        approvedAcceptedSourceIds: ["reading-1", "reading-2"],
        liveAcceptedSourceIds: ["reading-1"],
      }),
    /added 0, removed 1/u,
  );
});

test("rejects duplicate Reading source IDs without logging content", () => {
  assert.throws(
    () =>
      assertApprovedReadingInventory({
        approvedSha256: "a".repeat(64),
        liveSha256: "a".repeat(64),
        approvedAcceptedSourceIds: ["reading-1", "reading-1"],
        liveAcceptedSourceIds: ["reading-1"],
      }),
    /approved inventory contains 1 duplicate source ID/u,
  );
});

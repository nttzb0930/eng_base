import assert from "node:assert/strict";
import test from "node:test";

import {
  canLoadToeicWritingCoaching,
  canRestoreCommunityResponse,
  shouldConfirmCommunityRestore,
} from "../toeic-writing-coaching-state";

test("authored coaching stays lazy until its panel opens", () => {
  const version = "a".repeat(64);

  assert.equal(canLoadToeicWritingCoaching(22, version, false), false);
  assert.equal(canLoadToeicWritingCoaching(22, version, true), true);
  assert.equal(canLoadToeicWritingCoaching(0, version, true), false);
  assert.equal(canLoadToeicWritingCoaching(22, "stale", true), false);
});

test("community restore requires confirmation only when local text is non-empty", () => {
  assert.equal(shouldConfirmCommunityRestore(""), false);
  assert.equal(shouldConfirmCommunityRestore("   \n"), false);
  assert.equal(shouldConfirmCommunityRestore("Dear customer,"), true);
});

test("community restore accepts only an explicit confirmation when text exists", () => {
  assert.equal(canRestoreCommunityResponse("", false), true);
  assert.equal(canRestoreCommunityResponse("Draft", false), false);
  assert.equal(canRestoreCommunityResponse("Draft", true), true);
});

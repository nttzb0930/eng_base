import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_API_SERVICE_NAME,
  DEFAULT_APP_NAME,
  DEFAULT_ENGLISH_COURSE_TITLE,
} from "@repo/shared";

test("Shared exposes the canonical application identity", () => {
  assert.equal(DEFAULT_APP_NAME, "English Base");
  assert.equal(DEFAULT_API_SERVICE_NAME, "eng-base-api");
  assert.equal(DEFAULT_ENGLISH_COURSE_TITLE, "English Vocabulary");
});

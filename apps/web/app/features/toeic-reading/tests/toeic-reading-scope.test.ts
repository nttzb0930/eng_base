import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TOEIC_READING_SCOPE,
  parseToeicReadingScope,
  scopeToPart,
} from "../toeic-reading-scope";

test("Part 5 is the default TOEIC Reading browser scope", () => {
  assert.equal(DEFAULT_TOEIC_READING_SCOPE, 5);
  assert.equal(parseToeicReadingScope(undefined), 5);
  assert.equal(parseToeicReadingScope("unsupported"), 5);
});

test("scope parsing preserves Full Test and supported Parts", () => {
  assert.equal(parseToeicReadingScope("full"), "full");
  assert.equal(parseToeicReadingScope("5"), 5);
  assert.equal(parseToeicReadingScope("6"), 6);
  assert.equal(parseToeicReadingScope("7"), 7);
  assert.equal(scopeToPart("full"), undefined);
  assert.equal(scopeToPart(6), 6);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  parseToeicListeningScope,
  scopeToPart,
} from "../toeic-listening-scope";
test("Listening scope defaults to Part 1 and supports Full plus Parts 1-4", () => {
  assert.equal(parseToeicListeningScope(undefined), 1);
  assert.equal(parseToeicListeningScope("full"), "full");
  for (const part of [1, 2, 3, 4] as const) {
    assert.equal(parseToeicListeningScope(String(part)), part);
    assert.equal(scopeToPart(part), part);
  }
  assert.equal(scopeToPart("full"), undefined);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as Record<
    string,
    unknown
  >;

test("English and Vietnamese TOEIC Reading messages have identical key trees", () => {
  const english = readJson("app/messages/en.json");
  const vietnamese = readJson("app/messages/vi.json");
  assert.ok(english.toeicReading);
  assert.ok(vietnamese.toeicReading);
  assert.deepEqual(
    collectKeys(english.toeicReading),
    collectKeys(vietnamese.toeicReading)
  );
});

test("TOEIC Reading result copy covers score, Parts, answers, and explanations", () => {
  const english = readJson("app/messages/en.json").toeicReading as Record<
    string,
    unknown
  >;
  const result = english.result as Record<string, unknown>;
  for (const key of [
    "title",
    "score",
    "partScore",
    "correct",
    "incorrect",
    "yourAnswer",
    "correctAnswer",
    "explanation",
    "backToTests",
  ]) {
    assert.equal(typeof result[key], "string", `missing result.${key}`);
  }
});

test("TOEIC Reading copy covers Full Test and every Part practice scope", () => {
  const english = readJson("app/messages/en.json").toeicReading as Record<
    string,
    unknown
  >;
  const list = english.list as Record<string, unknown>;
  const result = english.result as Record<string, unknown>;
  for (const key of ["fullTest", "part5", "part6", "part7", "scopeLabel"]) {
    assert.equal(typeof list[key], "string", `missing list.${key}`);
  }
  for (const key of ["fullTest", "partPractice"]) {
    assert.equal(typeof result[key], "string", `missing result.${key}`);
  }
});

test("TOEIC Reading session copy covers single-question navigation", () => {
  const english = readJson("app/messages/en.json").toeicReading as Record<
    string,
    unknown
  >;
  const session = english.session as Record<string, unknown>;

  for (const key of [
    "previousQuestion",
    "nextQuestion",
    "questionPosition",
    "answeredPosition",
  ]) {
    assert.equal(typeof session[key], "string", `missing session.${key}`);
  }
});

test("TOEIC Reading copy covers backend draft progress and save states", () => {
  const english = readJson("app/messages/en.json").toeicReading as Record<
    string,
    unknown
  >;
  const list = english.list as Record<string, unknown>;
  const session = english.session as Record<string, unknown>;

  for (const key of [
    "progress",
    "progressCount",
    "answered",
    "remaining",
    "continue",
  ]) {
    assert.equal(typeof list[key], "string", `missing list.${key}`);
  }
  for (const key of ["draftSaving", "draftSaved", "draftError"]) {
    assert.equal(typeof session[key], "string", `missing session.${key}`);
  }
});

function collectKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value)
    .flatMap(([key, child]) =>
      collectKeys(child, prefix ? `${prefix}.${key}` : key)
    )
    .sort();
}

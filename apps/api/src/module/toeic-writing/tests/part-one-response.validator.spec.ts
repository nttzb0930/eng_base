import assert from "node:assert/strict";
import test from "node:test";

import { validatePartOneResponse } from "../validation/part-one-response.validator";

test("accepts a valid response with inflected required words", () => {
  const result = validatePartOneResponse({
    responseText: "The woman is preparing food.",
    requiredWords: ["prepare", "food"],
  });

  assert.deepEqual(result, { valid: true, issues: [], wordCount: 5 });
});

test("rejects responses outside the official word limits", () => {
  const tooShort = validatePartOneResponse({
    responseText: "Woman prepares.",
    requiredWords: ["woman", "prepare"],
  });
  const tooLong = validatePartOneResponse({
    responseText: `${Array.from({ length: 40 }, () => "word").join(" ")} food.`,
    requiredWords: ["word", "food"],
  });

  assert.equal(
    tooShort.issues.some(({ code }) => code === "MIN_WORDS"),
    true
  );
  assert.equal(
    tooLong.issues.some(({ code }) => code === "MAX_WORDS"),
    true
  );
});

test("rejects responses above 300 Unicode characters", () => {
  const result = validatePartOneResponse({
    responseText: `Woman ${"x".repeat(294)} food.`,
    requiredWords: ["woman", "food"],
  });

  assert.equal(
    result.issues.some(({ code }) => code === "MAX_CHARACTERS"),
    true
  );
});

test("requires an uppercase first alphabetic character", () => {
  const result = validatePartOneResponse({
    responseText: "the woman prepares food.",
    requiredWords: ["woman", "food"],
  });

  assert.equal(
    result.issues.some(({ code }) => code === "UPPERCASE_START_REQUIRED"),
    true
  );
});

test("requires terminal punctuation", () => {
  const result = validatePartOneResponse({
    responseText: "The woman prepares food",
    requiredWords: ["woman", "food"],
  });

  assert.equal(
    result.issues.some(({ code }) => code === "TERMINAL_PUNCTUATION_REQUIRED"),
    true
  );
});

test("rejects more than one sentence", () => {
  const result = validatePartOneResponse({
    responseText: "The woman prepares food. She is smiling.",
    requiredWords: ["woman", "food"],
  });

  assert.equal(
    result.issues.some(({ code }) => code === "ONE_SENTENCE_REQUIRED"),
    true
  );
});

test("reports every missing required word", () => {
  const result = validatePartOneResponse({
    responseText: "The person works at a counter.",
    requiredWords: ["woman", "prepare"],
  });

  assert.deepEqual(
    result.issues
      .filter(({ code }) => code === "REQUIRED_WORD_MISSING")
      .map(({ keyword }) => keyword),
    ["woman", "prepare"]
  );
});

test("rejects obvious repeated-token and keyboard-smash spam", () => {
  const repeated = validatePartOneResponse({
    responseText: "Hello hello hello hello.",
    requiredWords: ["hello"],
  });
  const keyboardSmash = validatePartOneResponse({
    responseText: "Woman asdfghjklqwerty food.",
    requiredWords: ["woman", "food"],
  });

  assert.equal(
    repeated.issues.some(({ code }) => code === "OBVIOUS_SPAM"),
    true
  );
  assert.equal(
    keyboardSmash.issues.some(({ code }) => code === "OBVIOUS_SPAM"),
    true
  );
});

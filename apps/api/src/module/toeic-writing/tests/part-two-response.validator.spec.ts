import assert from "node:assert/strict";
import test from "node:test";

import { validatePartTwoResponse } from "../validation/part-two-response.validator";

const words = (count: number) =>
  Array.from({ length: count }, (_, index) => `w${index % 10}`).join(" ");

test("accepts emails at the official word-count boundaries", () => {
  assert.deepEqual(validatePartTwoResponse(words(50)), {
    valid: true,
    issues: [],
    wordCount: 50,
  });
  assert.deepEqual(validatePartTwoResponse(words(300)), {
    valid: true,
    issues: [],
    wordCount: 300,
  });
});

test("rejects blank and out-of-range email responses", () => {
  const blank = validatePartTwoResponse("   \n");
  const short = validatePartTwoResponse(words(49));
  const long = validatePartTwoResponse(words(301));

  assert.equal(
    blank.issues.some(({ code }) => code === "MIN_WORDS"),
    true
  );
  assert.equal(
    short.issues.some(({ code }) => code === "MIN_WORDS"),
    true
  );
  assert.equal(
    long.issues.some(({ code }) => code === "MAX_WORDS"),
    true
  );
});

test("rejects responses above 2,200 Unicode characters", () => {
  const response = `${words(50)} ${"x".repeat(2_100)}`;
  const result = validatePartTwoResponse(response);

  assert.equal(
    result.issues.some(({ code }) => code === "MAX_CHARACTERS"),
    true
  );
});

test("rejects repeated-token and keyboard-smash spam", () => {
  const repeated = validatePartTwoResponse(
    Array.from({ length: 50 }, () => "hello").join(" ")
  );
  const keyboardSmash = validatePartTwoResponse(`${words(47)} aaaa qqqq zzzz`);

  assert.equal(
    repeated.issues.some(({ code }) => code === "OBVIOUS_SPAM"),
    true
  );
  assert.equal(
    keyboardSmash.issues.some(({ code }) => code === "OBVIOUS_SPAM"),
    true
  );
});

test("accepts a valid multi-paragraph email", () => {
  const response = [
    "Dear Mr. Brown,",
    "Thank you for contacting our customer service team about the printer issue. I am sorry that the machine keeps jamming during your workday.",
    "Please check that the paper matches the model instructions and tell us the printer model. If the issue continues, we can arrange a warranty inspection this week.",
    "Best regards, Customer Support",
  ].join("\n\n");

  assert.deepEqual(validatePartTwoResponse(response), {
    valid: true,
    issues: [],
    wordCount: 57,
  });
});

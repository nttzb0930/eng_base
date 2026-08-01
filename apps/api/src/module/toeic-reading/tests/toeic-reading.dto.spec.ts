import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { ToeicReadingSubmissionDto } from "../dto/toeic-reading.dto";

const payload = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  testId: 11,
  sourceVersion: "a".repeat(64),
  answers: [{ questionId: 101, optionId: 1001 }],
};

test("accepts a complete TOEIC Reading submission", async () => {
  const errors = await validate(
    plainToInstance(ToeicReadingSubmissionDto, payload)
  );
  assert.equal(errors.length, 0);
});

test("rejects a source version that is not a lowercase SHA-256", async () => {
  const errors = await validate(
    plainToInstance(ToeicReadingSubmissionDto, {
      ...payload,
      sourceVersion: "z".repeat(64),
    })
  );
  assert.ok(errors.some((error) => error.property === "sourceVersion"));
});

test("rejects an unsupported Part practice submission", async () => {
  const errors = await validate(
    plainToInstance(ToeicReadingSubmissionDto, {
      ...payload,
      practicePart: 4,
    })
  );
  assert.ok(errors.some((error) => error.property === "practicePart"));
});

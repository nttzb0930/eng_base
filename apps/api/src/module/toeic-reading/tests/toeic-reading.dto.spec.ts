import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
  ToeicReadingPracticeAnswerDto,
  ToeicReadingPracticeStartDto,
  ToeicReadingPracticeUpdateDto,
  ToeicReadingSubmissionDto,
} from "../dto/toeic-reading.dto";

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

test("accepts valid TOEIC Reading practice requests", async () => {
  const startErrors = await validate(
    plainToInstance(ToeicReadingPracticeStartDto, {
      testId: 11,
      part: 5,
      sourceVersion: "a".repeat(64),
    })
  );
  const answerErrors = await validate(
    plainToInstance(ToeicReadingPracticeAnswerDto, {
      questionId: 101,
      optionId: 1001,
      requestKey: "00000000-0000-4000-8000-000000000001",
    })
  );
  const updateErrors = await validate(
    plainToInstance(ToeicReadingPracticeUpdateDto, {
      activeQuestionId: 101,
      reviewQuestionIds: [102],
    })
  );

  assert.equal(startErrors.length, 0);
  assert.equal(answerErrors.length, 0);
  assert.equal(updateErrors.length, 0);
});

test("rejects Full Test as a guided-practice Part", async () => {
  const errors = await validate(
    plainToInstance(ToeicReadingPracticeStartDto, {
      testId: 11,
      part: 0,
      sourceVersion: "a".repeat(64),
    })
  );
  assert.ok(errors.some((error) => error.property === "part"));
});

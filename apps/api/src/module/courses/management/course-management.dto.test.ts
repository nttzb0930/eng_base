import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "class-validator";

import {
  ChallengeCreateDto,
  ChallengeOptionCreateDto,
} from "./course-management.dto";

test("challenge DTO preserves optional-nullable request fields", async () => {
  const dto = Object.assign(new ChallengeCreateDto(), {
    lessonId: 1,
    type: "SELECT",
    question: "Hello?",
    order: 1,
    vocabularyItemId: null,
    direction: null,
  });

  assert.deepEqual(await validate(dto), []);
});

test("challenge DTO preserves enum validation metadata", async () => {
  const dto = Object.assign(new ChallengeCreateDto(), {
    lessonId: 1,
    type: "BROKEN",
    question: "Hello?",
    order: 1,
  });

  const errors = await validate(dto);

  assert.equal(errors.length, 1);
  assert.ok(errors[0]?.constraints?.isEnum);
});

test("challenge option DTO accepts false as an explicit correct value", async () => {
  const dto = Object.assign(new ChallengeOptionCreateDto(), {
    challengeId: 1,
    text: "Distractor",
    correct: false,
  });

  assert.deepEqual(await validate(dto), []);
});

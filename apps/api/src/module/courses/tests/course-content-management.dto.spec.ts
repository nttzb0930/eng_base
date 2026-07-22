import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "class-validator";

import {
  ChallengeCreateDto,
  ChallengeOptionCreateDto,
  UnitCreateDto,
  UnitUpdateDto,
} from "../dto/course-content-management.dto";

test("Unit creation requires an explicit nullable CEFR level", async () => {
  const missing = Object.assign(new UnitCreateDto(), {
    title: "Basics",
    description: "Start here",
    courseId: 1,
    order: 1,
  });
  assert.equal(
    (await validate(missing)).some((error) => error.property === "cefrLevel"),
    true
  );

  const cleared = Object.assign(missing, { cefrLevel: null });
  assert.deepEqual(await validate(cleared), []);
});

test("Unit DTO accepts supported and explicitly cleared CEFR levels", async () => {
  const valid = Object.assign(new UnitUpdateDto(), { cefrLevel: "B2" });
  assert.deepEqual(await validate(valid), []);

  const cleared = Object.assign(new UnitUpdateDto(), { cefrLevel: null });
  assert.deepEqual(await validate(cleared), []);
});

test("Unit DTO rejects unsupported CEFR levels", async () => {
  const invalid = Object.assign(new UnitUpdateDto(), { cefrLevel: "C1" });
  assert.equal(
    (await validate(invalid)).some((error) => error.property === "cefrLevel"),
    true
  );
});

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

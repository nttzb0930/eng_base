import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "class-validator";

import { UpdateSystemSettingsDto } from "../dto/update-system-settings.dto";

async function invalidProperties(payload: Record<string, unknown>) {
  const dto = Object.assign(new UpdateSystemSettingsDto(), payload);
  return new Set((await validate(dto)).map((error) => error.property));
}

test("typed Settings DTO accepts partial values at every boundary", async () => {
  const minimums = Object.assign(new UpdateSystemSettingsDto(), {
    maxHearts: 1,
    practiceWordsPerLesson: 5,
    weakWordsLimit: 5,
    dailyReviewRelaxedLimit: 1,
    dailyReviewStandardLimit: 1,
    dailyReviewAcceleratedLimit: 1,
    dailyReviewIntensiveLimit: 1,
    registrationEnabled: false,
  });
  const maximums = Object.assign(new UpdateSystemSettingsDto(), {
    maxHearts: 99,
    practiceWordsPerLesson: 50,
    weakWordsLimit: 100,
    dailyReviewRelaxedLimit: 50,
    dailyReviewStandardLimit: 100,
    dailyReviewAcceleratedLimit: 150,
    dailyReviewIntensiveLimit: 200,
    registrationEnabled: true,
  });

  assert.deepEqual(await validate(new UpdateSystemSettingsDto()), []);
  assert.deepEqual(await validate(minimums), []);
  assert.deepEqual(await validate(maximums), []);
});

test("typed Settings DTO rejects out-of-range and wrong-type values", async () => {
  const invalid = await invalidProperties({
    maxHearts: 0,
    practiceWordsPerLesson: 51,
    weakWordsLimit: 4,
    dailyReviewRelaxedLimit: 51,
    dailyReviewStandardLimit: 101,
    dailyReviewAcceleratedLimit: 151,
    dailyReviewIntensiveLimit: 201,
    registrationEnabled: "true",
  });

  assert.deepEqual(invalid, new Set([
    "maxHearts",
    "practiceWordsPerLesson",
    "weakWordsLimit",
    "dailyReviewRelaxedLimit",
    "dailyReviewStandardLimit",
    "dailyReviewAcceleratedLimit",
    "dailyReviewIntensiveLimit",
    "registrationEnabled",
  ]));
});

import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { ConfirmPlacementLevelDto } from "../dto/placement-test.dto";

const validPayload = {
  level: "B1",
  languages: ["en", "de"],
  primaryLanguage: "en",
  goals: ["travel", "career"],
  intensity: "standard",
  customGoal: "Speak confidently while travelling",
};

const validatePayload = (payload: Record<string, unknown>) => {
  const dto = plainToInstance(ConfirmPlacementLevelDto, payload);
  return { dto, errors: validate(dto) };
};

test("accepts the existing valid onboarding payload", async () => {
  const { errors } = validatePayload(validPayload);

  assert.deepEqual(await errors, []);
});

test("rejects an unsupported language", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    languages: ["en", "fr"],
  });

  assert.equal(
    (await errors).some((error) => error.property === "languages"),
    true
  );
});

test("rejects primary language outside selected languages", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    languages: ["de"],
    primaryLanguage: "en",
  });

  const primaryError = (await errors).find(
    (error) => error.property === "primaryLanguage"
  );
  assert.equal(
    primaryError?.constraints?.isPrimaryLanguageSelected,
    "primaryLanguage must be included in languages"
  );
});

test("rejects an unsupported goal", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    goals: ["travel", "networking"],
  });

  assert.equal(
    (await errors).some((error) => error.property === "goals"),
    true
  );
});

test("rejects an unsupported intensity", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    intensity: "extreme",
  });

  assert.equal(
    (await errors).some((error) => error.property === "intensity"),
    true
  );
});

test("rejects an unsupported CEFR level", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    level: "C1",
  });

  assert.equal(
    (await errors).some((error) => error.property === "level"),
    true
  );
});

test("rejects custom goal over 300 trimmed characters", async () => {
  const { errors } = validatePayload({
    ...validPayload,
    customGoal: `  ${"x".repeat(301)}  `,
  });

  assert.equal(
    (await errors).some((error) => error.property === "customGoal"),
    true
  );
});

test("trims custom goal before persistence", async () => {
  const { dto, errors } = validatePayload({
    ...validPayload,
    customGoal: "  Pass the exam this year  ",
  });

  assert.deepEqual(await errors, []);
  assert.equal(dto.customGoal, "Pass the exam this year");
});

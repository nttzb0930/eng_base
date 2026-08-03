import assert from "node:assert/strict";
import test from "node:test";

import { validateEnvironment } from "./env.validation";
import { resolveGeminiConfiguration } from "./gemini.config";

const requiredEnvironment = {
  DATABASE_URL: "postgresql://localhost/eng_base",
  JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
  JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
};

test("Gemini configuration is disabled safely with production defaults", () => {
  assert.deepEqual(resolveGeminiConfiguration({}), {
    enabled: false,
    apiKey: "",
    visionModel: "gemini-3.5-flash-lite",
    gradingModel: "gemini-3.5-flash-lite",
    timeoutMs: 20_000,
    dailyLimit: 5,
    reservationTtlMs: 120_000,
  });
});

test("Gemini environment rejects enabled AI without credentials", () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...requiredEnvironment,
        GEMINI_ENABLED: "true",
      }),
    /GEMINI_API_KEY/u
  );
});

test("Gemini environment accepts explicit provider configuration", () => {
  const environment = validateEnvironment({
    ...requiredEnvironment,
    GEMINI_ENABLED: "true",
    GEMINI_API_KEY: "test-key",
    GEMINI_VISION_MODEL: "vision-model",
    GEMINI_GRADING_MODEL: "grading-model",
    GEMINI_TIMEOUT_MS: "25000",
    WRITING_AI_DAILY_LIMIT: "7",
    WRITING_AI_RESERVATION_TTL_MS: "90000",
  });

  assert.deepEqual(resolveGeminiConfiguration(environment), {
    enabled: true,
    apiKey: "test-key",
    visionModel: "vision-model",
    gradingModel: "grading-model",
    timeoutMs: 25_000,
    dailyLimit: 7,
    reservationTtlMs: 90_000,
  });
});

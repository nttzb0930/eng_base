import assert from "node:assert/strict";
import test from "node:test";

import { SystemSettingsReader } from "../system-settings.reader";

test("Settings reader returns one effective registered value", async () => {
  const reader = new SystemSettingsReader({
    system_settings: {
      findUnique: async () => ({ key: "MAX_HEARTS", value: "8" }),
    },
  } as never);

  assert.equal(await reader.get("maxHearts"), 8);
});

test("Settings reader returns a complete effective object and ignores invalid rows", async () => {
  const reader = new SystemSettingsReader({
    system_settings: {
      findMany: async () => [
        { key: "MAX_HEARTS", value: "9" },
        { key: "PRACTICE_WORDS_PER_LESSON", value: "bad" },
        { key: "REGISTRATION_ENABLED", value: "false" },
        { key: "SMTP_PASSWORD", value: "must-not-leak" },
      ],
    },
  } as never);

  assert.deepEqual(await reader.getAll(), {
    maxHearts: 9,
    practiceWordsPerLesson: 15,
    weakWordsLimit: 20,
    dailyReviewRelaxedLimit: 5,
    dailyReviewStandardLimit: 15,
    dailyReviewAcceleratedLimit: 30,
    dailyReviewIntensiveLimit: 50,
    registrationEnabled: false,
  });
});

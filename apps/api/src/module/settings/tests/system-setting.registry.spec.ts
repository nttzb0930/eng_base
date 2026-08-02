import assert from "node:assert/strict";
import test from "node:test";

import {
  SYSTEM_SETTING_FIELDS,
  getEffectiveSystemSetting,
  getSystemSettingDefinition,
  getSystemSettingFieldByStorageKey,
  parseSystemSettingInput,
  serializeSystemSetting,
} from "../system-setting.registry";

test("Settings registry exposes exactly the approved policies and defaults", () => {
  assert.deepEqual(SYSTEM_SETTING_FIELDS, [
    "maxHearts",
    "practiceWordsPerLesson",
    "weakWordsLimit",
    "dailyReviewRelaxedLimit",
    "dailyReviewStandardLimit",
    "dailyReviewAcceleratedLimit",
    "dailyReviewIntensiveLimit",
    "registrationEnabled",
  ]);
  assert.equal(getEffectiveSystemSetting("maxHearts", null), 5);
  assert.equal(getEffectiveSystemSetting("practiceWordsPerLesson", null), 15);
  assert.equal(getEffectiveSystemSetting("weakWordsLimit", null), 20);
  assert.equal(getEffectiveSystemSetting("dailyReviewRelaxedLimit", null), 5);
  assert.equal(getEffectiveSystemSetting("dailyReviewStandardLimit", null), 15);
  assert.equal(getEffectiveSystemSetting("dailyReviewAcceleratedLimit", null), 30);
  assert.equal(getEffectiveSystemSetting("dailyReviewIntensiveLimit", null), 50);
  assert.equal(getEffectiveSystemSetting("registrationEnabled", null), true);
});

test("Settings registry validates boundaries and rejects malformed input", () => {
  assert.equal(parseSystemSettingInput("maxHearts", "1"), 1);
  assert.equal(parseSystemSettingInput("maxHearts", "99"), 99);
  assert.equal(parseSystemSettingInput("maxHearts", "0"), undefined);
  assert.equal(parseSystemSettingInput("maxHearts", "100"), undefined);
  assert.equal(parseSystemSettingInput("maxHearts", "5abc"), undefined);
  assert.equal(parseSystemSettingInput("practiceWordsPerLesson", "5"), 5);
  assert.equal(parseSystemSettingInput("practiceWordsPerLesson", "50"), 50);
  assert.equal(parseSystemSettingInput("weakWordsLimit", "100"), 100);
  assert.equal(parseSystemSettingInput("dailyReviewRelaxedLimit", "50"), 50);
  assert.equal(parseSystemSettingInput("dailyReviewStandardLimit", "100"), 100);
  assert.equal(parseSystemSettingInput("dailyReviewAcceleratedLimit", "150"), 150);
  assert.equal(parseSystemSettingInput("dailyReviewIntensiveLimit", "200"), 200);
  assert.equal(parseSystemSettingInput("registrationEnabled", "true"), true);
  assert.equal(parseSystemSettingInput("registrationEnabled", "false"), false);
  assert.equal(parseSystemSettingInput("registrationEnabled", "yes"), undefined);
});

test("Settings registry fails closed for invalid persisted values", () => {
  assert.equal(getEffectiveSystemSetting("maxHearts", "not-a-number"), 5);
  assert.equal(getEffectiveSystemSetting("maxHearts", "101"), 5);
  assert.equal(getEffectiveSystemSetting("registrationEnabled", "yes"), true);
});

test("Settings registry owns storage keys and serialization", () => {
  assert.equal(getSystemSettingDefinition("maxHearts").key, "MAX_HEARTS");
  assert.equal(
    getSystemSettingFieldByStorageKey("DAILY_REVIEW_STANDARD_LIMIT"),
    "dailyReviewStandardLimit",
  );
  assert.equal(getSystemSettingFieldByStorageKey("SMTP_PASSWORD"), undefined);
  assert.equal(serializeSystemSetting("maxHearts", 7), "7");
  assert.equal(serializeSystemSetting("registrationEnabled", false), "false");
});

import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";

import { GetSettingUseCase } from "../use-cases/get-setting.use-case";
import { GetSystemSettingsUseCase } from "../use-cases/get-system-settings.use-case";
import { UpdateSettingUseCase } from "../use-cases/update-setting.use-case";
import { UpdateSystemSettingsUseCase } from "../use-cases/update-system-settings.use-case";

const effectiveSettings = {
  maxHearts: 5,
  practiceWordsPerLesson: 15,
  weakWordsLimit: 20,
  dailyReviewRelaxedLimit: 5,
  dailyReviewStandardLimit: 15,
  dailyReviewAcceleratedLimit: 30,
  dailyReviewIntensiveLimit: 50,
  registrationEnabled: true,
};

test("bulk Settings read returns the complete effective object", async () => {
  const useCase = new GetSystemSettingsUseCase({
    getAll: async () => effectiveSettings,
  } as never);

  assert.deepEqual(await useCase.execute(), effectiveSettings);
});

test("bulk Settings update transactionally upserts only supplied fields", async () => {
  const upserts: unknown[] = [];
  let transactionOperations = 0;
  const useCase = new UpdateSystemSettingsUseCase(
    {
      system_settings: {
        upsert: (input: unknown) => {
          upserts.push(input);
          return Promise.resolve();
        },
      },
      $transaction: async (operations: Promise<unknown>[]) => {
        transactionOperations = operations.length;
        await Promise.all(operations);
      },
    } as never,
    { getAll: async () => ({ ...effectiveSettings, maxHearts: 8 }) } as never,
  );

  const result = await useCase.execute({
    maxHearts: 8,
    registrationEnabled: false,
  });

  assert.equal(transactionOperations, 2);
  assert.deepEqual(upserts, [
    {
      where: { key: "MAX_HEARTS" },
      create: { key: "MAX_HEARTS", value: "8" },
      update: { value: "8" },
    },
    {
      where: { key: "REGISTRATION_ENABLED" },
      create: { key: "REGISTRATION_ENABLED", value: "false" },
      update: { value: "false" },
    },
  ]);
  assert.equal(result.maxHearts, 8);
});

test("legacy MAX_HEARTS read and write use typed registry validation", async () => {
  const reads = new GetSettingUseCase({
    get: async () => 6,
  } as never);
  const writes: unknown[] = [];
  const updates = new UpdateSettingUseCase({
    system_settings: {
      upsert: async (input: unknown) => writes.push(input),
    },
  } as never);

  assert.equal(await reads.execute("MAX_HEARTS"), "6");
  await updates.execute("MAX_HEARTS", "7");
  assert.equal(writes.length, 1);
  await assert.rejects(
    () => updates.execute("MAX_HEARTS", "100"),
    (error: unknown) =>
      error instanceof BadRequestException
      && error.message === "INVALID_SETTING_VALUE",
  );
});

test("legacy Settings rejects unknown keys instead of creating rows", async () => {
  const reads = new GetSettingUseCase({ get: async () => 5 } as never);
  const updates = new UpdateSettingUseCase({
    system_settings: { upsert: async () => undefined },
  } as never);

  await assert.rejects(
    () => reads.execute("SMTP_PASSWORD"),
    (error: unknown) =>
      error instanceof BadRequestException
      && error.message === "INVALID_SETTING_KEY",
  );
  await assert.rejects(
    () => updates.execute("SMTP_PASSWORD", "secret"),
    (error: unknown) =>
      error instanceof BadRequestException
      && error.message === "INVALID_SETTING_KEY",
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { createSettingApi } from "../api/setting.api";

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

test("Setting resource preserves get, update, and empty fallback behavior", async () => {
  const requests: unknown[] = [];
  const api = createSettingApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { success: true, data: "5" as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { success: true } as { success: boolean; data?: T };
    },
    async put<T>(path: string, body?: unknown) {
      requests.push({ method: "PUT", path, body });
      return { success: true, data: effectiveSettings as T };
    },
  });

  assert.equal(await api.get("MAX_HEARTS"), "5");
  await api.update("MAX_HEARTS", "7");
  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/settings/MAX_HEARTS" },
    { method: "POST", path: "/admin/settings/MAX_HEARTS", body: { value: "7" } },
  ]);
});

test("Setting get preserves its empty string fallback", async () => {
  const api = createSettingApi({
    async get<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async post<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async put<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
  });

  assert.equal(await api.get("MAX_HEARTS"), "");
});

test("Setting resource reads effective Settings and sends partial bulk updates", async () => {
  const requests: unknown[] = [];
  const api = createSettingApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { success: true, data: effectiveSettings as T };
    },
    async post<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async put<T>(path: string, body?: unknown) {
      requests.push({ method: "PUT", path, body });
      return {
        success: true,
        data: { ...effectiveSettings, maxHearts: 8 } as T,
      };
    },
  });

  assert.deepEqual(await api.getAll(), effectiveSettings);
  assert.equal(
    (await api.updateAll({ maxHearts: 8, registrationEnabled: false }))
      .maxHearts,
    8,
  );
  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/settings" },
    {
      method: "PUT",
      path: "/admin/settings",
      body: { maxHearts: 8, registrationEnabled: false },
    },
  ]);
});

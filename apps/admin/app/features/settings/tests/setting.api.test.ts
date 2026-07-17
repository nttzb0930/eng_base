import assert from "node:assert/strict";
import test from "node:test";

import { createSettingApi } from "../api/setting.api";

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
  });

  assert.equal(await api.get("MAX_HEARTS"), "");
});

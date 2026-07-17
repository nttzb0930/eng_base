import assert from "node:assert/strict";
import test from "node:test";

import { createPlacementTestApi } from "../api/placement-test.api";

test("Placement Test resource preserves question, answer, confirm, reset, and onboarding routes", async () => {
  const requests: unknown[] = [];
  const api = createPlacementTestApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: { status: "IN_PROGRESS" } as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: { status: "OK" } as T };
    },
  });

  await api.nextQuestion();
  await api.submitAnswer({ challengeId: 7, selectedOptionId: 9 });
  await api.confirmLevel({
    level: "A2",
    languages: ["en", "ja"],
    goals: ["travel"],
    intensity: "standard",
    primaryLanguage: "en",
    customGoal: "Talk with clients",
  });
  await api.reset();
  await api.updateOnboarding({
    step: 3,
    data: { selectedGoals: ["travel"] },
  });

  assert.deepEqual(requests, [
    { method: "GET", path: "/placement-test/question" },
    {
      method: "POST",
      path: "/placement-test/answer",
      body: { challengeId: 7, selectedOptionId: 9 },
    },
    {
      method: "POST",
      path: "/placement-test/confirm",
      body: {
        level: "A2",
        languages: ["en", "ja"],
        goals: ["travel"],
        intensity: "standard",
        primaryLanguage: "en",
        customGoal: "Talk with clients",
      },
    },
    { method: "POST", path: "/placement-test/reset", body: undefined },
    {
      method: "POST",
      path: "/placement-test/onboarding",
      body: { step: 3, data: { selectedGoals: ["travel"] } },
    },
  ]);
});

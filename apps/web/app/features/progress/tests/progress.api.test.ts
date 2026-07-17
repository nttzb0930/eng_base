import assert from "node:assert/strict";
import test from "node:test";

import { createProgressApi } from "../api/progress.api";

test("Progress resource preserves learner progress routes", async () => {
  const requests: unknown[] = [];
  const api = createProgressApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: null as T };
    },
    async post<T>(path: string) {
      requests.push({ method: "POST", path });
      return { data: undefined as T };
    },
  });

  await api.getUserProgress();
  await api.getCourseProgress();
  await api.getLessonPercentage();
  await api.selectCourse(2);
  await api.completeChallenge(3);
  await api.reduceHearts(3);
  await api.refillHearts();
  await api.resetLesson(4);

  assert.deepEqual(requests, [
    { method: "GET", path: "/progress/user-progress" },
    { method: "GET", path: "/progress/course-progress" },
    { method: "GET", path: "/progress/lesson-percentage" },
    { method: "POST", path: "/progress/courses/2" },
    { method: "POST", path: "/progress/challenges/3" },
    { method: "POST", path: "/progress/hearts/3/reduce" },
    { method: "POST", path: "/progress/hearts/refill" },
    { method: "POST", path: "/progress/lessons/4/reset" },
  ]);
});

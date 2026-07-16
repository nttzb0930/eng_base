import assert from "node:assert/strict";
import test from "node:test";

import { courseQueryKeys } from "../catalog/course.queries";
import { challengeOptionQueryKeys } from "../challenge-options/challenge-option.queries";
import { challengeQueryKeys } from "../challenges/challenge.queries";
import { lessonQueryKeys } from "../lessons/lesson.queries";
import { unitQueryKeys } from "../units/unit.queries";

const query = { page: 2, limit: 20, search: "bear" };

test("course management query-key namespaces remain stable", () => {
  assert.deepEqual(courseQueryKeys.all, ["courses"]);
  assert.deepEqual(courseQueryKeys.list(query), ["courses", "list", query]);
  assert.deepEqual(courseQueryKeys.allList(), ["courses", "all"]);

  assert.deepEqual(unitQueryKeys.all, ["units"]);
  assert.deepEqual(unitQueryKeys.list(query), ["units", "list", query]);
  assert.deepEqual(unitQueryKeys.allList(), ["units", "all"]);

  assert.deepEqual(lessonQueryKeys.all, ["lessons"]);
  assert.deepEqual(lessonQueryKeys.list(query), ["lessons", "list", query]);
  assert.deepEqual(lessonQueryKeys.allList(), ["lessons", "all"]);

  assert.deepEqual(challengeQueryKeys.all, ["challenges"]);
  assert.deepEqual(challengeQueryKeys.list(query), [
    "challenges",
    "list",
    query,
  ]);
  assert.deepEqual(challengeQueryKeys.allList(), ["challenges", "all"]);

  assert.deepEqual(challengeOptionQueryKeys.all, ["challenge-options"]);
  assert.deepEqual(challengeOptionQueryKeys.list(query), [
    "challenge-options",
    "list",
    query,
  ]);
});

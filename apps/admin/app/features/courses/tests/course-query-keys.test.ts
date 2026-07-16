import assert from "node:assert/strict";
import test from "node:test";

import { challengeOptionKeys } from "../api/challenge-option.api";
import { challengeKeys } from "../api/challenge.api";
import { courseKeys } from "../api/course.api";
import { lessonKeys } from "../api/lesson.api";
import { unitKeys } from "../api/unit.api";

const query = { page: 2, limit: 20, search: "bear" };

test("course management resource query-key namespaces remain stable", () => {
  assert.deepEqual(courseKeys.all, ["courses"]);
  assert.deepEqual(courseKeys.list(query), ["courses", "list", query]);
  assert.deepEqual(courseKeys.allList(), ["courses", "all"]);

  assert.deepEqual(unitKeys.all, ["units"]);
  assert.deepEqual(unitKeys.list(query), ["units", "list", query]);
  assert.deepEqual(unitKeys.allList(), ["units", "all"]);

  assert.deepEqual(lessonKeys.all, ["lessons"]);
  assert.deepEqual(lessonKeys.list(query), ["lessons", "list", query]);
  assert.deepEqual(lessonKeys.allList(), ["lessons", "all"]);

  assert.deepEqual(challengeKeys.all, ["challenges"]);
  assert.deepEqual(challengeKeys.list(query), ["challenges", "list", query]);
  assert.deepEqual(challengeKeys.allList(), ["challenges", "all"]);

  assert.deepEqual(challengeOptionKeys.all, ["challenge-options"]);
  assert.deepEqual(challengeOptionKeys.list(query), [
    "challenge-options",
    "list",
    query,
  ]);
});

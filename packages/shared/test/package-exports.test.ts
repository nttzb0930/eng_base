import assert from "node:assert/strict";
import test from "node:test";

import { CEFR_LEVELS, type Course } from "@repo/shared";

test("the declared shared root package interface resolves", () => {
  const course: Course = { id: 1, title: "English", imageSrc: "/en.svg" };
  assert.equal(course.title, "English");
  assert.equal(CEFR_LEVELS[0], "A1");
});

test("the package blocks private deep imports", async () => {
  const privateSubpath = "@repo/shared/src/types/course";
  await assert.rejects(
    () => import(privateSubpath),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  );
});

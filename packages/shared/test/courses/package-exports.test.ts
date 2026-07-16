import assert from "node:assert/strict";
import test from "node:test";

import { CourseDtoSchema } from "@repo/shared/courses";

test("the declared courses package subpath resolves", () => {
  assert.equal(
    CourseDtoSchema.parse({
      id: 1,
      title: "English",
      imageSrc: "/en.svg",
    }).title,
    "English"
  );
});

test("the package blocks private deep imports", async () => {
  const privateSubpath = "@repo/shared/src/courses/course.contract";
  await assert.rejects(
    () => import(privateSubpath),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  );
});

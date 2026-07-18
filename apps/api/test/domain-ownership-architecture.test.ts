import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "..", "src");

test("Admin delivery belongs to its business owner", () => {
  const adminRoot = join(sourceRoot, "module/admin");
  const adminFiles = existsSync(adminRoot)
    ? readdirSync(adminRoot, { recursive: true }).filter((path) =>
        String(path).endsWith(".ts")
      )
    : [];
  assert.deepEqual(adminFiles, []);
  assert.ok(
    existsSync(join(sourceRoot, "module/user/admin-users.controller.ts"))
  );
  assert.ok(
    existsSync(
      join(sourceRoot, "module/practice/admin-practice-sessions.controller.ts")
    )
  );
  assert.ok(
    existsSync(join(sourceRoot, "module/settings/admin-settings.controller.ts"))
  );
});

test("Course Management is organized inside the Courses owner", () => {
  const managementRoot = join(sourceRoot, "module/courses/management");
  const managementFiles = existsSync(managementRoot)
    ? readdirSync(managementRoot, { recursive: true })
    : [];
  assert.deepEqual(managementFiles, []);
  for (const controller of [
    "admin-courses.controller.ts",
    "admin-units.controller.ts",
    "admin-lessons.controller.ts",
    "admin-challenges.controller.ts",
    "admin-challenge-options.controller.ts",
  ]) {
    assert.ok(existsSync(join(sourceRoot, "module/courses", controller)));
  }
  assert.equal(
    existsSync(
      join(sourceRoot, "module/courses/admin-course-content.controller.ts")
    ),
    false
  );
  assert.ok(existsSync(join(sourceRoot, "module/courses/dto")));
  assert.ok(existsSync(join(sourceRoot, "module/courses/mappers")));
  assert.ok(existsSync(join(sourceRoot, "module/courses/use-cases")));
  assert.equal(
    readdirSync(join(sourceRoot, "module/courses/use-cases")).filter((file) =>
      /^(list|get|create|update|remove)-admin-.*\.use-case\.ts$/.test(file)
    ).length,
    25
  );
  assert.ok(existsSync(join(sourceRoot, "module/courses/tests")));
});

test("Vocabulary owns its types, mappers, builders and tests", () => {
  const vocabularyRoot = join(sourceRoot, "module/vocabulary");
  assert.ok(existsSync(join(vocabularyRoot, "index.ts")));
  assert.ok(existsSync(join(vocabularyRoot, "types/vocabulary.types.ts")));
  assert.ok(
    existsSync(join(vocabularyRoot, "mappers/vocabulary-item.mapper.ts"))
  );
  assert.ok(
    existsSync(join(vocabularyRoot, "builders/vocabulary-challenge.builder.ts"))
  );
  assert.ok(
    existsSync(join(vocabularyRoot, "tests/vocabulary-item.mapper.spec.ts"))
  );
  assert.equal(
    existsSync(join(vocabularyRoot, "vocabulary-item.mapper.ts")),
    false
  );
});

test("Course producers use the Shared root Interface", () => {
  for (const file of [
    "module/courses/dto/course-content-management.dto.ts",
    "module/courses/mappers/course-content.mapper.ts",
    "module/courses/use-cases/course-learning.mapper.ts",
  ]) {
    const source = readFileSync(join(sourceRoot, file), "utf8");
    assert.equal(source.includes("@repo/shared/courses"), false, file);
    assert.equal(source.includes("CourseDto"), false, file);
  }
});

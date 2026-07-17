import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const routeImports = {
  "app/(dashboard)/courses/page.tsx": 'from "@/app/views/courses/CoursesView"',
  "app/(dashboard)/units/page.tsx": 'from "@/app/views/units/UnitsView"',
  "app/(dashboard)/lessons/page.tsx": 'from "@/app/views/lessons/LessonsView"',
  "app/(dashboard)/challenges/page.tsx":
    'from "@/app/views/challenges/ChallengesView"',
  "app/(dashboard)/challenge-options/page.tsx":
    'from "@/app/views/challenge-options/ChallengeOptionsView"',
};

const resourceFiles = [
  "course.api.ts",
  "unit.api.ts",
  "lesson.api.ts",
  "challenge.api.ts",
  "challenge-option.api.ts",
];

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("course routes follow the ecommerce Admin view profile", () => {
  for (const [routeFile, expectedImport] of Object.entries(routeImports)) {
    const source = readFileSync(join(appRoot, routeFile), "utf8");
    assert.equal(
      source.includes(expectedImport),
      true,
      `${routeFile} must import its app/views screen`
    );
  }
});

test("course transport is split into resource api modules", () => {
  const apiRoot = join(appRoot, "app/features/courses/api");
  for (const file of resourceFiles) {
    assert.equal(existsSync(join(apiRoot, file)), true, `${file} must exist`);
  }

  assert.equal(
    existsSync(join(apiRoot, "course-management.client.ts")),
    false,
    "the aggregate client must not return"
  );
});

test("course resources use TypeScript-only shared types", () => {
  const apiRoot = join(appRoot, "app/features/courses/api");
  for (const file of resourceFiles) {
    const source = readFileSync(join(apiRoot, file), "utf8");
    assert.equal(source.includes("@repo/shared/courses"), false, file);
    assert.equal(source.includes('from "zod"'), false, file);
    assert.equal(source.includes(".parse("), false, file);
  }
});

test("course management no longer uses the rejected src feature profile", () => {
  assert.deepEqual(filesUnder(join(appRoot, "src/features/courses")), []);
  assert.equal(
    existsSync(join(appRoot, "app/features/courses/catalog")),
    false
  );
});

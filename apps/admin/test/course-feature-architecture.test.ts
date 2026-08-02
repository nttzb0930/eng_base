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

const managementScreens = {
  "app/views/courses/CoursesView.tsx":
    "app/features/courses/components/CoursesManagementScreen.tsx",
  "app/views/units/UnitsView.tsx":
    "app/features/courses/components/UnitsManagementScreen.tsx",
  "app/views/lessons/LessonsView.tsx":
    "app/features/courses/components/LessonsManagementScreen.tsx",
  "app/views/challenges/ChallengesView.tsx":
    "app/features/courses/components/ChallengesManagementScreen.tsx",
  "app/views/challenge-options/ChallengeOptionsView.tsx":
    "app/features/courses/components/ChallengeOptionsManagementScreen.tsx",
};

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("course routes follow the Admin feature/view profile", () => {
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

test("course management presentation stays behind the Courses owner", () => {
  for (const [viewPath, screenPath] of Object.entries(managementScreens)) {
    assert.equal(existsSync(join(appRoot, screenPath)), true, `${screenPath} must exist`);

    const source = readFileSync(join(appRoot, viewPath), "utf8");
    assert.equal(source.includes("@/app/features/courses/components/"), true, viewPath);
    assert.equal(source.includes("useState"), false, `${viewPath} owns form state`);
    assert.equal(source.includes("useCreate"), false, `${viewPath} owns mutations`);
    assert.equal(source.includes("useUpdate"), false, `${viewPath} owns mutations`);
    assert.equal(source.includes("useDelete"), false, `${viewPath} owns mutations`);
  }
});

test("Courses screen composes focused Shadcn management components", () => {
  for (const path of [
    "app/features/courses/components/courses/course-columns.tsx",
    "app/features/courses/components/courses/CourseEditorForm.tsx",
    "app/features/courses/components/courses/course-editor.schema.ts",
  ]) {
    assert.equal(existsSync(join(appRoot, path)), true, `${path} must exist`);
  }

  const source = readFileSync(
    join(appRoot, "app/features/courses/components/CoursesManagementScreen.tsx"),
    "utf8",
  );
  assert.equal(source.includes("PageHeader"), true);
  assert.equal(source.includes("DestructiveActionDialog"), true);
  assert.equal(source.includes("CourseEditorForm"), true);
  assert.equal(source.includes("confirm("), false);
  assert.equal(source.includes("text-zinc"), false);
  assert.equal(source.includes("bg-white"), false);
  assert.equal(source.includes("font-bold"), false);
});

test("Units screen composes focused Shadcn management components", () => {
  for (const path of [
    "app/features/courses/components/units/unit-columns.tsx",
    "app/features/courses/components/units/UnitEditorForm.tsx",
    "app/features/courses/components/units/unit-editor.schema.ts",
  ]) {
    assert.equal(existsSync(join(appRoot, path)), true, `${path} must exist`);
  }

  const source = readFileSync(
    join(appRoot, "app/features/courses/components/UnitsManagementScreen.tsx"),
    "utf8",
  );
  assert.equal(source.includes("PageHeader"), true);
  assert.equal(source.includes("DestructiveActionDialog"), true);
  assert.equal(source.includes("UnitEditorForm"), true);
  assert.equal(source.includes("confirm("), false);
  assert.equal(source.includes("text-zinc"), false);
  assert.equal(source.includes("bg-white"), false);
  assert.equal(source.includes("font-bold"), false);
});

test("Lessons screen composes focused Shadcn management components", () => {
  for (const path of [
    "app/features/courses/components/lessons/lesson-columns.tsx",
    "app/features/courses/components/lessons/LessonEditorForm.tsx",
    "app/features/courses/components/lessons/lesson-editor.schema.ts",
  ]) {
    assert.equal(existsSync(join(appRoot, path)), true, `${path} must exist`);
  }

  const source = readFileSync(
    join(appRoot, "app/features/courses/components/LessonsManagementScreen.tsx"),
    "utf8",
  );
  for (const expected of ["PageHeader", "DestructiveActionDialog", "LessonEditorForm"]) {
    assert.equal(source.includes(expected), true, `${expected} must be composed`);
  }
  for (const forbidden of ["confirm(", "text-zinc", "bg-white", "font-bold"]) {
    assert.equal(source.includes(forbidden), false, `${forbidden} is forbidden`);
  }
});

test("Challenges screen composes focused Shadcn management components", () => {
  for (const path of [
    "app/features/courses/components/challenges/challenge-columns.tsx",
    "app/features/courses/components/challenges/ChallengeEditorForm.tsx",
    "app/features/courses/components/challenges/challenge-editor.schema.ts",
  ]) {
    assert.equal(existsSync(join(appRoot, path)), true, `${path} must exist`);
  }
  const source = readFileSync(
    join(appRoot, "app/features/courses/components/ChallengesManagementScreen.tsx"),
    "utf8",
  );
  for (const expected of ["PageHeader", "DestructiveActionDialog", "ChallengeEditorForm"]) {
    assert.equal(source.includes(expected), true, `${expected} must be composed`);
  }
  for (const forbidden of ["confirm(", "text-zinc", "bg-white", "font-bold"]) {
    assert.equal(source.includes(forbidden), false, `${forbidden} is forbidden`);
  }
});

test("Challenge Options screen composes focused Shadcn management components", () => {
  for (const path of [
    "app/features/courses/components/challenge-options/challenge-option-columns.tsx",
    "app/features/courses/components/challenge-options/ChallengeOptionEditorForm.tsx",
    "app/features/courses/components/challenge-options/challenge-option-editor.schema.ts",
  ]) {
    assert.equal(existsSync(join(appRoot, path)), true, `${path} must exist`);
  }
  const source = readFileSync(
    join(appRoot, "app/features/courses/components/ChallengeOptionsManagementScreen.tsx"),
    "utf8",
  );
  for (const expected of ["PageHeader", "DestructiveActionDialog", "ChallengeOptionEditorForm"]) {
    assert.equal(source.includes(expected), true, `${expected} must be composed`);
  }
  for (const forbidden of ["confirm(", "text-zinc", "bg-white", "font-bold"]) {
    assert.equal(source.includes(forbidden), false, `${forbidden} is forbidden`);
  }
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

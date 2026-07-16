import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicImport = 'from "@/src/features/courses"';
const featureRoot = join(appRoot, "src/features/courses");

const routeFiles = [
  "app/(dashboard)/courses/page.tsx",
  "app/(dashboard)/units/page.tsx",
  "app/(dashboard)/lessons/page.tsx",
  "app/(dashboard)/challenges/page.tsx",
  "app/(dashboard)/challenge-options/page.tsx",
];

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("course management routes use the feature public Interface", () => {
  for (const routeFile of routeFiles) {
    const absoluteRouteFile = join(appRoot, routeFile);
    const source = readFileSync(absoluteRouteFile, "utf8");
    assert.equal(
      source.includes(publicImport),
      true,
      `${routeFile} must import @/src/features/courses`
    );

    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1] ?? ""
    );
    const privateImports = imports.filter((specifier) => {
      if (specifier.startsWith("@/src/features/courses/")) return true;
      if (!specifier.startsWith(".")) return false;

      const resolvedImport = resolve(dirname(absoluteRouteFile), specifier);
      return (
        resolvedImport === featureRoot ||
        resolvedImport.startsWith(`${featureRoot}${sep}`)
      );
    });

    assert.deepEqual(
      privateImports,
      [],
      `${routeFile} must not import a private Courses implementation`
    );
  }
});

test("course management no longer lives in legacy technical buckets", () => {
  const legacyCapabilityNames = [
    "courses",
    "units",
    "lessons",
    "challenges",
    "challenge-options",
  ];
  const remainingFiles = ["src/views", "src/services"].flatMap((bucket) =>
    legacyCapabilityNames.flatMap((capability) =>
      filesUnder(join(appRoot, bucket, capability))
    )
  );

  assert.deepEqual(remainingFiles, []);
});

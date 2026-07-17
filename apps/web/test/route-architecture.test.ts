import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appDirectory = join(process.cwd(), "app");

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test("localized routes are the canonical learner route tree", () => {
  assert.equal(existsSync(join(appDirectory, "(main)")), false);
  assert.equal(existsSync(join(appDirectory, "lesson")), false);
});

test("localized learner routes compose app Views instead of legacy src Views", () => {
  const localizedDirectory = join(appDirectory, "[locale]");

  const routeFiles = collectTypeScriptFiles(localizedDirectory).filter((file) =>
    /(?:page|layout|error)\.tsx$/.test(file),
  );

  for (const file of routeFiles) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("@/src/views/"), false, `${file} imports a legacy View`);
    assert.equal(source.includes("@/src/modules/"), false, `${file} imports a legacy module`);
    assert.equal(source.includes("@/src/services/"), false, `${file} imports a legacy service`);
  }
});

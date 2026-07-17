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

test("localized routes do not delegate to non-localized route trees", () => {
  const localizedDirectory = join(appDirectory, "[locale]");
  const routeImports = collectTypeScriptFiles(localizedDirectory)
    .map((file) => ({ file, source: readFileSync(file, "utf8") }))
    .filter(({ source }) => source.includes('from "@/app/(main)') || source.includes('from "@/app/lesson'));

  assert.deepEqual(routeImports, []);
});

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const webRoot = process.cwd();
const workspaceRoot = join(webRoot, "../..");
const adminRoot = join(workspaceRoot, "apps/admin");
const sharedConstantsRoot = join(
  workspaceRoot,
  "packages/shared/src/constants"
);

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === ".next" || entry.name === "node_modules") return [];
    if (entry.isDirectory()) return sourceFilesUnder(path);
    return /\.(?:json|ts|tsx)$/u.test(entry.name) ? [path] : [];
  });
}

test("frontend identity follows runtime ownership without legacy branding", () => {
  const rootPackage = JSON.parse(
    readFileSync(join(workspaceRoot, "package.json"), "utf8")
  ) as { name?: string };
  assert.equal(rootPackage.name, "eng_base");

  assert.equal(existsSync(join(webRoot, "app/environment.ts")), false);
  assert.equal(existsSync(join(adminRoot, "app/environment.ts")), false);

  const sharedConstants = sourceFilesUnder(sharedConstantsRoot)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(sharedConstants, /DEFAULT_(?:APP|API_SERVICE)_NAME/u);

  const offenders = [join(webRoot, "app"), join(adminRoot, "app")]
    .flatMap(sourceFilesUnder)
    .filter((file) => /\b(?:lingo|vocabu)\b/iu.test(readFileSync(file, "utf8")))
    .map((file) => relative(workspaceRoot, file).replaceAll("\\", "/"));

  assert.deepEqual(offenders, []);
});

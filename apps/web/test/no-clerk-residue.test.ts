import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const webRoot = process.cwd();
const workspaceRoot = join(webRoot, "../..");

const scannedRoots = ["apps", "packages", "docs"];
const scannedFiles = [".env.example"];
const legacyAuthProvider = ["cl", "erk"].join("");
const legacyPublicEnvPrefix = ["NEXT_PUBLIC_CL", "ERK"].join("");
const legacyServerEnvPrefix = ["CL", "ERK_"].join("");

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") {
      return [];
    }
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("workspace auth configuration and docs do not reference the legacy auth provider", () => {
  const files = [
    ...scannedRoots.flatMap((root) => filesUnder(join(workspaceRoot, root))),
    ...scannedFiles.map((file) => join(workspaceRoot, file)),
  ].filter((file) => /\.(?:env\.example|md|json|ts|tsx|js|jsx|mjs|cjs)$/u.test(file));

  const offenders = files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const hasLegacyAuthResidue =
      source.includes(legacyServerEnvPrefix) ||
      source.includes(legacyPublicEnvPrefix) ||
      source.toLowerCase().includes(legacyAuthProvider);

    return hasLegacyAuthResidue ? [relative(workspaceRoot, file).replaceAll("\\", "/")] : [];
  });

  assert.deepEqual(offenders, []);
});

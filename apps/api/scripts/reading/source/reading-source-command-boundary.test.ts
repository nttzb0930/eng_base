import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const repositoryRoot = resolve(apiRoot, "../..");

test("registers separated Reading source operator commands", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(apiRoot, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.["data:download-reading-source"],
    "tsx ./scripts/reading/source/download-reading-source.ts",
  );
  assert.equal(
    packageJson.scripts?.["data:validate-reading-source"],
    "tsx ./scripts/reading/source/validate-reading-source.ts",
  );
  assert.equal(
    packageJson.scripts?.["data:inventory-reading-source"],
    "tsx ./scripts/reading/source/inventory-reading-source.ts",
  );
  assert.equal(
    packageJson.scripts?.["data:import-reading-candidates"],
    "dotenv -e ../../.env -- tsx ./scripts/reading/source/import-reading-candidates.ts",
  );
});

test("keeps inventory, download, validation, and Prisma boundaries separate", () => {
  const inventory = readFileSync(
    resolve(apiRoot, "scripts/reading/source/inventory-reading-source.ts"),
    "utf8",
  );
  const download = readFileSync(
    resolve(apiRoot, "scripts/reading/source/download-reading-source.ts"),
    "utf8",
  );
  const validation = readFileSync(
    resolve(apiRoot, "scripts/reading/source/validate-reading-source.ts"),
    "utf8",
  );

  assert.doesNotMatch(inventory, /downloadReadingSource|Prisma/u);
  assert.doesNotMatch(inventory, /process\.env|dotenv/u);
  assert.match(download, /downloadReadingSource/u);
  assert.doesNotMatch(download, /Prisma|migrate|process\.env|dotenv/u);
  assert.match(validation, /validateStoredReadingPackages/u);
  assert.doesNotMatch(
    validation,
    /DautoeicReadingSource|Prisma|migrate|process\.env|dotenv/u,
  );
});

test("does not invoke Reading source operations from runtime, build, seed, or CI", () => {
  const forbidden = [
    readFileSync(resolve(apiRoot, "src/app.module.ts"), "utf8"),
    readFileSync(resolve(apiRoot, "scripts/seed-dev.ts"), "utf8"),
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    readFileSync(
      resolve(repositoryRoot, ".github/workflows/ci.yml"),
      "utf8",
    ),
  ].join("\n");

  assert.doesNotMatch(
    forbidden,
    /inventory-reading-source|download-reading-source|validate-reading-source/u,
  );
});

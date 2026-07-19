import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const workspaceRoot = join(apiRoot, "../..");
const workflowsRoot = join(workspaceRoot, ".github/workflows");

test("CI workflow runs the complete safe verification contract", () => {
  const workflowPath = join(workflowsRoot, "ci.yml");
  assert.equal(existsSync(workflowPath), true);

  const source = readFileSync(workflowPath, "utf8");
  assert.match(source, /push:\s*\n\s+branches:\s*\["\*\*"\]/u);
  assert.match(source, /pull_request:\s*\n\s+branches:\s*\[main\]/u);
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /permissions:\s*\n\s+contents:\s*read/u);
  assert.match(source, /runs-on:\s*ubuntu-latest/u);
  assert.match(source, /node-version:\s*22/u);
  assert.match(source, /pnpm install --frozen-lockfile/u);

  for (const command of [
    "pnpm db:generate",
    "pnpm architecture:check",
    "pnpm test",
    "scripts/vocabulary/catalog/vocabulary-catalog.test.ts",
    "scripts/vocabulary/database/vocabulary-seed-data.test.ts",
    "scripts/vocabulary/topic-classification/topic-classification.test.ts",
    "scripts/vocabulary/topic-expansion/topic-expansion.test.ts",
    "pnpm check-types",
    "pnpm lint",
    "pnpm build",
    "pnpm exec prettier --check",
  ]) {
    assert.match(source, new RegExp(command.replaceAll(".", "\\."), "u"));
  }

  const accessSecret =
    source.match(/JWT_ACCESS_SECRET:\s*([^\s]+)/u)?.[1] ?? "";
  const refreshSecret =
    source.match(/JWT_REFRESH_SECRET:\s*([^\s]+)/u)?.[1] ?? "";
  assert.ok(accessSecret.length >= 32);
  assert.ok(refreshSecret.length >= 32);
  assert.notEqual(accessSecret, refreshSecret);
  assert.doesNotMatch(
    source,
    /(?:db:migrate|migrate deploy|db:seed|db:push|db:migrate:reset|gemini|openai|docker\.io|dockerhub|ssh|deploy)/iu
  );
  assert.doesNotMatch(
    source,
    /(?:printenv|env\s*$|echo\s+\$\{?\{?\s*secrets)/imu
  );
});

test("API architecture command includes the workflow contract", () => {
  const packageJson = JSON.parse(
    readFileSync(join(apiRoot, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert.match(
    packageJson.scripts?.["architecture:check"] ?? "",
    /github-workflows\.architecture\.test\.ts/u
  );
});

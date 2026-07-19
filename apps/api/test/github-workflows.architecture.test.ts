import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

test("GHCR workflow publishes exactly three application images", () => {
  assert.deepEqual(readdirSync(workflowsRoot).sort(), [
    "ci.yml",
    "docker-build.yml",
  ]);

  const source = readFileSync(join(workflowsRoot, "docker-build.yml"), "utf8");
  assert.match(
    source,
    /push:\s*\n\s+branches:\s*\[main\]\s*\n\s+tags:\s*\["v\*\.\*\.\*"\]/u
  );
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /contents:\s*read/u);
  assert.match(source, /packages:\s*write/u);
  assert.match(source, /ghcr\.io/u);
  assert.match(source, /docker\/login-action@v3/u);
  assert.match(source, /username:\s*\$\{\{ github\.actor \}\}/u);
  assert.match(source, /password:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/u);
  assert.match(source, /docker\/setup-buildx-action@v3/u);
  assert.match(source, /docker\/metadata-action@v5/u);
  assert.match(source, /docker\/build-push-action@v6/u);
  assert.match(source, /push:\s*true/u);
  assert.match(source, /cache-from:\s*type=gha/u);
  assert.match(source, /cache-to:\s*type=gha,mode=max/u);
  assert.match(source, /\$\{GITHUB_REPOSITORY_OWNER,,\}/u);

  for (const [image, dockerfile] of [
    ["eng-base-api", "apps/api/Dockerfile"],
    ["eng-base-web", "apps/web/Dockerfile"],
    ["eng-base-admin", "apps/admin/Dockerfile"],
  ]) {
    assert.match(source, new RegExp(`image: ${image}`, "u"));
    assert.match(
      source,
      new RegExp(`dockerfile: ${dockerfile.replaceAll("/", "\\/")}`, "u")
    );
  }

  const publicBuildArguments = [
    ...source.matchAll(/^\s+(NEXT_PUBLIC_[A-Z0-9_]+)=/gmu),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(publicBuildArguments)].sort(), [
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_URL",
  ]);
  assert.doesNotMatch(source, /docker\.io|dockerhub/iu);
  assert.doesNotMatch(source, /(?:DATABASE_URL|JWT_|SECRET)=/u);
});

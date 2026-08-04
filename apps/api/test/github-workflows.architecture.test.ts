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
  assert.match(source, /push:\s*\n\s+branches:\s*\n\s+- "\*\*"/u);
  assert.match(source, /pull_request:/u);
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /permissions:\s*\n\s+contents:\s*read/u);
  assert.match(source, /runs-on:\s*ubuntu-latest/u);
  assert.match(source, /node-version:\s*22/u);
  assert.match(source, /pnpm install --frozen-lockfile/u);

  const apiJob = source.slice(
    source.indexOf("  api:"),
    source.indexOf("  web:")
  );
  const webJob = source.slice(
    source.indexOf("  web:"),
    source.indexOf("  admin:")
  );
  const adminJob = source.slice(
    source.indexOf("  admin:"),
    source.indexOf("  repository:")
  );

  assert.match(apiJob, /pnpm --filter @repo\/shared build/u);
  for (const job of [webJob, adminJob]) {
    assert.match(job, /pnpm --filter @repo\/shared build/u);
    assert.match(job, /pnpm --filter @repo\/ui build/u);
  }

  for (const command of [
    "pnpm db:generate",
    "pnpm --filter @repo/api architecture:check",
    "pnpm --filter @repo/api test",
    "pnpm --filter @repo/web test",
    "pnpm --filter @repo/admin test",
    "scripts/vocabulary/catalog/vocabulary-catalog.test.ts",
    "scripts/vocabulary/database/development-seed-guard.test.ts",
    "scripts/vocabulary/database/vocabulary-seed-data.test.ts",
    "scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts",
    "scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts",
    "scripts/vocabulary/database/bootstrap-vocabulary.test.ts",
    "scripts/vocabulary/topic-classification/topic-classification.test.ts",
    "scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts",
    "scripts/vocabulary/topic-expansion/topic-expansion.test.ts",
    "pnpm --filter @repo/api check-types",
    "pnpm --filter @repo/web check-types",
    "pnpm --filter @repo/admin check-types",
    "pnpm --filter @repo/api build:data-bootstrap",
    "pnpm architecture:check",
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

test("GHCR workflow publishes exactly three application images after CI succeeds", () => {
  assert.deepEqual(readdirSync(workflowsRoot).sort(), [
    "ci.yml",
    "deploy.yml",
    "publish-images.yml",
  ]);

  const source = readFileSync(
    join(workflowsRoot, "publish-images.yml"),
    "utf8"
  );
  assert.match(source, /workflow_run:\s*\n\s+workflows:\s*\n\s+- CI/u);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/u);
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /contents:\s*read/u);
  assert.match(source, /packages:\s*write/u);
  assert.match(source, /ghcr\.io/u);
  assert.match(source, /docker\/login-action@v3/u);
  assert.match(source, /username:\s*\$\{\{ github\.actor \}\}/u);
  assert.match(source, /password:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/u);
  assert.match(source, /docker\/setup-buildx-action@v3/u);
  assert.match(source, /docker\/build-push-action@v6/u);
  assert.match(source, /push:\s*true/u);
  assert.match(source, /cache-from:\s*type=gha/u);
  assert.match(source, /cache-to:\s*type=gha,mode=max/u);
  assert.match(
    source,
    /image_prefix="\$\{REGISTRY\}\/\$\{GITHUB_REPOSITORY\}"/u
  );

  for (const [outputName, dockerfile] of [
    ["api_image", "apps/api/Dockerfile"],
    ["web_image", "apps/web/Dockerfile"],
    ["admin_image", "apps/admin/Dockerfile"],
  ]) {
    assert.match(source, new RegExp(`${outputName}=\\$image_prefix`, "u"));
    assert.match(
      source,
      new RegExp(`file: ${dockerfile.replaceAll("/", "\\/")}`, "u")
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

test("Deploy workflow follows successful main image publication, keeps manual rollback, and migrates before compose up", () => {
  const source = readFileSync(join(workflowsRoot, "deploy.yml"), "utf8");

  assert.match(
    source,
    /workflow_run:\s*\n\s+workflows:\s*\n\s+- Publish Images/u
  );
  assert.match(source, /branches:\s*\n\s+- main/u);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/u);
  assert.match(source, /github\.event\.workflow_run\.event == 'workflow_run'/u);
  assert.match(source, /github\.event\.workflow_run\.head_sha/u);
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /\|\| 'production'/u);
  assert.match(source, /environment:/u);
  assert.match(source, /image_tag:/u);
  assert.match(source, /appleboy\/ssh-action@v1\.2\.0/u);
  assert.match(source, /DEPLOY_HOST/u);
  assert.match(source, /DEPLOY_USER/u);
  assert.match(source, /DEPLOY_SSH_KEY/u);
  assert.match(source, /DEPLOY_PATH/u);
  assert.match(
    source,
    /docker compose -f docker-compose\.prod\.yml --env-file \.env\.production pull api web admin/u
  );
  assert.match(source, /npx prisma migrate deploy/u);
  assert.match(
    source,
    /docker compose -f docker-compose\.prod\.yml --env-file \.env\.production up -d/u
  );
  assert.match(source, /DEPLOY_API_HEALTH_URL/u);
  assert.match(source, /DEPLOY_WEB_URL/u);
  assert.match(source, /DEPLOY_ADMIN_URL/u);
  assert.doesNotMatch(source, /docker\.io|dockerhub/iu);
});

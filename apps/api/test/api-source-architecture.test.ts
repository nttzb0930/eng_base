import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const apiRoot = join(import.meta.dirname, "..");
const sourceRoot = join(apiRoot, "src");

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [relative(apiRoot, path)];
  });
}

test("API infrastructure follows the capability-owned source profile", () => {
  assert.deepEqual(filesUnder(join(sourceRoot, "auth")), []);
  assert.deepEqual(filesUnder(join(sourceRoot, "db")), []);
  assert.deepEqual(filesUnder(join(sourceRoot, "prisma")), []);
  assert.deepEqual(filesUnder(join(sourceRoot, "support")), []);
  assert.deepEqual(filesUnder(join(sourceRoot, "generated/prisma")), []);

  assert.ok(existsSync(join(sourceRoot, "database/prisma/prisma.module.ts")));
  assert.ok(existsSync(join(sourceRoot, "database/prisma/prisma.service.ts")));
  assert.equal(
    existsSync(join(sourceRoot, "database/prisma/prisma.client.ts")),
    false
  );
  assert.ok(existsSync(join(apiRoot, "scripts/support/script-prisma.ts")));
  assert.ok(existsSync(join(sourceRoot, "module/auth/index.ts")));
  assert.ok(existsSync(join(sourceRoot, "module/health/health.module.ts")));
  assert.ok(existsSync(join(sourceRoot, "common/logging/logging.module.ts")));
  assert.ok(existsSync(join(sourceRoot, "config/rate-limit.config.ts")));
  assert.ok(
    existsSync(join(sourceRoot, "common/guards/application-throttler.guard.ts"))
  );
  assert.ok(
    existsSync(join(sourceRoot, "common/rate-limit/rate-limit.options.ts"))
  );
  assert.ok(
    existsSync(join(sourceRoot, "common/filters/all-exceptions.filter.ts"))
  );
  assert.ok(
    existsSync(
      join(sourceRoot, "common/interceptors/http-logging.interceptor.ts")
    )
  );
  assert.equal(
    existsSync(join(sourceRoot, "common/filters/prisma-exception.filter.ts")),
    false
  );
});

test("Prisma has one generated client Interface", () => {
  const schema = readFileSync(join(apiRoot, "prisma/schema.prisma"), "utf8");
  const generators = schema.match(/^generator\s+/gm) ?? [];

  assert.equal(generators.length, 1);
  assert.doesNotMatch(
    schema,
    /src\/generated\/prisma|provider\s*=\s*"prisma-client"/
  );

  const source = filesUnder(sourceRoot)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => readFileSync(join(apiRoot, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /generated\/prisma/);
});

test("API root only composes Modules", () => {
  assert.equal(existsSync(join(sourceRoot, "health.controller.ts")), false);
  assert.equal(
    existsSync(join(sourceRoot, "health.controller.test.ts")),
    false
  );
});

test("destructive seed is exposed only as an explicit development command", () => {
  const workspacePackage = JSON.parse(
    readFileSync(join(apiRoot, "../..", "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };
  const apiPackage = JSON.parse(
    readFileSync(join(apiRoot, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert.equal(workspacePackage.scripts?.["db:seed"], undefined);
  assert.equal(apiPackage.scripts?.["db:seed"], undefined);
  assert.equal(
    workspacePackage.scripts?.["db:seed:dev"],
    "pnpm --filter @repo/api db:seed:dev"
  );
  assert.match(
    apiPackage.scripts?.["db:seed:dev"] ?? "",
    /scripts\/seed-dev\.ts/u
  );
});

test("safe Vocabulary bootstrap source cannot contain destructive database operations", () => {
  const databaseScripts = join(apiRoot, "scripts/vocabulary/database");
  const safeFiles = filesUnder(databaseScripts)
    .filter((file) => /vocabulary-bootstrap|bootstrap-vocabulary/u.test(file))
    .filter((file) => file.endsWith(".ts"));

  assert.ok(safeFiles.length > 0);
  const source = safeFiles
    .map((file) => readFileSync(join(apiRoot, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /\.deleteMany\s*\(/u);
  assert.doesNotMatch(source, /\bDELETE\s+FROM\b/iu);
  assert.doesNotMatch(source, /\bTRUNCATE\b/iu);
  assert.doesNotMatch(source, /db:migrate:reset/u);
});

test("canonical docs define the reviewed production Vocabulary bootstrap runbook", () => {
  const workspaceRoot = join(apiRoot, "../..");
  const vocabularyGuide = readFileSync(
    join(workspaceRoot, "docs/data/vocabulary-pipeline.md"),
    "utf8"
  );
  const deploymentGuide = readFileSync(
    join(workspaceRoot, "docs/guides/ci-cd.md"),
    "utf8"
  );
  const verificationGuide = readFileSync(
    join(workspaceRoot, "docs/guides/verification.md"),
    "utf8"
  );

  assert.match(vocabularyGuide, /db:seed:dev/u);
  assert.match(vocabularyGuide, /data:bootstrap-vocabulary -- plan/u);
  assert.match(vocabularyGuide, /data:bootstrap-vocabulary -- dry-run/u);
  assert.match(
    vocabularyGuide,
    /data:bootstrap-vocabulary -- apply --confirm/u
  );
  assert.match(vocabularyGuide, /7,429 records/u);
  assert.doesNotMatch(vocabularyGuide, /currently contains 3,000 records/u);
  assert.match(deploymentGuide, /backup/iu);
  assert.match(deploymentGuide, /data:bootstrap-vocabulary:compiled/u);
  assert.match(deploymentGuide, /not.*automatic/iu);
  assert.match(verificationGuide, /vocabulary-bootstrap-plan\.test\.ts/u);
  assert.match(verificationGuide, /vocabulary-bootstrap-store\.test\.ts/u);
  assert.match(verificationGuide, /bootstrap-vocabulary\.test\.ts/u);
});

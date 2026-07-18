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
    existsSync(
      join(sourceRoot, "common/guards/application-throttler.guard.ts")
    )
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

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const workspaceRoot = join(apiRoot, "../..");

test("API Dockerfile defines a production-safe monorepo build", () => {
  const dockerfilePath = join(apiRoot, "Dockerfile");
  assert.equal(existsSync(dockerfilePath), true);

  const source = readFileSync(dockerfilePath, "utf8");
  assert.match(source, /FROM node:22(?:\.[0-9]+)*(?:-alpine)?/u);
  assert.match(source, /corepack enable/u);
  assert.match(source, /pnpm install --frozen-lockfile/u);
  assert.match(source, /pnpm --filter @repo\/api db:generate/u);
  assert.match(source, /pnpm --filter @repo\/api build/u);
  assert.match(source, /USER (?:node|[1-9][0-9]*)/u);
  assert.match(source, /EXPOSE 4000/u);
  assert.match(source, /CMD \["node", "dist\/main\.js"\]/u);
  assert.doesNotMatch(
    source,
    /ARG .*?(?:SECRET|PASSWORD|TOKEN|DATABASE_URL)/iu
  );
  assert.doesNotMatch(
    source,
    /(?:migrate|db:seed|db:push).*?(?:CMD|ENTRYPOINT)|(?:CMD|ENTRYPOINT).*?(?:migrate|db:seed|db:push)/iu
  );
});

test("Docker context excludes secrets and generated output but keeps canonical data", () => {
  const dockerIgnorePath = join(workspaceRoot, ".dockerignore");
  assert.equal(existsSync(dockerIgnorePath), true);

  const source = readFileSync(dockerIgnorePath, "utf8");
  assert.match(source, /^\.env$/mu);
  assert.match(source, /^!\.env\.example$/mu);
  assert.match(source, /node_modules/u);
  assert.match(source, /(?:^|\/)dist/u);
  assert.match(source, /(?:^|\/)\.next/u);
  assert.match(source, /data\/vocabulary\/working/u);
  assert.match(source, /data\/vocabulary\/backups/u);
  assert.doesNotMatch(source, /data\/vocabulary\/vocabulary-catalog\.json/u);
  assert.doesNotMatch(source, /data\/vocabulary\/prompts/u);
});

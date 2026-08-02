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
  assert.match(source, /pnpm --filter @repo\/api build:data-bootstrap/u);
  assert.match(source, /apps\/api\/dist-data/u);
  assert.match(source, /data\/vocabulary\/vocabulary-catalog\.json/u);
  assert.match(source, /data\/vocabulary\/topics\.json/u);
  assert.doesNotMatch(source, /data\/vocabulary\/(?:working|backups)/u);
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

test("API package exposes a compiled production bootstrap command", () => {
  const packageJson = JSON.parse(
    readFileSync(join(apiRoot, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert.equal(
    packageJson.scripts?.["build:data-bootstrap"],
    "tsc -p tsconfig.data-bootstrap.json"
  );
  assert.equal(
    packageJson.scripts?.["data:bootstrap-vocabulary:compiled"],
    "node dist-data/scripts/vocabulary/database/bootstrap-vocabulary.js --data-dir ./data/vocabulary"
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

test("compiled data tooling remains an ignored build artifact", () => {
  const gitIgnore = readFileSync(join(workspaceRoot, ".gitignore"), "utf8");
  assert.match(gitIgnore, /apps\/api\/dist-data\//u);
});

for (const frontend of [
  { name: "web", port: 3000 },
  { name: "admin", port: 3001 },
]) {
  test(`${frontend.name} Dockerfile defines a standalone non-root image`, () => {
    const applicationRoot = join(workspaceRoot, `apps/${frontend.name}`);
    const dockerfilePath = join(applicationRoot, "Dockerfile");
    assert.equal(existsSync(dockerfilePath), true);

    const source = readFileSync(dockerfilePath, "utf8");
    assert.match(source, /FROM node:22(?:\.[0-9]+)*(?:-alpine)?/u);
    assert.match(source, /corepack enable/u);
    assert.match(source, /pnpm install --frozen-lockfile/u);
    assert.match(
      source,
      new RegExp(`pnpm --filter @repo/${frontend.name} build`, "u")
    );
    assert.match(source, /COPY --from=builder .*\.next\/standalone/u);
    assert.match(source, /COPY --from=builder .*\.next\/static/u);
    assert.match(source, /USER (?:node|[1-9][0-9]*)/u);
    assert.match(source, new RegExp(`EXPOSE ${frontend.port}`, "u"));
    assert.match(source, /CMD \["node", "server\.js"\]/u);

    const arguments_ = [...source.matchAll(/^ARG\s+([A-Z0-9_]+)/gmu)].map(
      (match) => match[1]
    );
    assert.deepEqual(arguments_.sort(), [
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_APP_NAME",
      "NEXT_PUBLIC_APP_URL",
    ]);

    const nextConfig = readFileSync(
      join(applicationRoot, "next.config.ts"),
      "utf8"
    );
    assert.match(nextConfig, /output:\s*["']standalone["']/u);
    assert.match(nextConfig, /outputFileTracingRoot/u);
    assert.match(
      nextConfig,
      /transpilePackages:\s*\[[^\]]*"@repo\/shared"[^\]]*"@repo\/ui"/su
    );
  });
}

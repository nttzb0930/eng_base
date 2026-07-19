import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();
const workspaceRoot = join(apiRoot, "../..");
const environmentReadPattern =
  /process\.env(?:\.([A-Z0-9_]+)|\[["']([A-Z0-9_]+)["']\])/gu;

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === ".next" || entry.name === "node_modules") return [];
    if (entry.isDirectory()) return sourceFilesUnder(path);
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [path] : [];
  });
}

function environmentReads(file: string) {
  return [...readFileSync(file, "utf8").matchAll(environmentReadPattern)].map(
    (match) => match[1] ?? match[2]
  );
}

test("API runtime reads environment only at configuration boundaries", () => {
  const offenders = sourceFilesUnder(join(apiRoot, "src"))
    .filter((file) => !/\.(?:test|spec)\.ts$/u.test(file))
    .filter((file) => environmentReads(file).length > 0)
    .filter((file) => {
      const path = relative(apiRoot, file).replaceAll("\\", "/");
      return (
        !path.startsWith("src/config/") &&
        path !== "src/database/prisma/prisma.config.ts" &&
        path !== "src/main.ts"
      );
    })
    .map((file) => relative(workspaceRoot, file).replaceAll("\\", "/"));

  assert.deepEqual(offenders, []);
});

test("frontend environment reads are explicit public values without secret names", () => {
  const frontendFiles = [
    ...sourceFilesUnder(join(workspaceRoot, "apps/web/app")),
    join(workspaceRoot, "apps/web/proxy.ts"),
    ...sourceFilesUnder(join(workspaceRoot, "apps/admin/app")),
  ];
  const reads = frontendFiles.flatMap((file) =>
    environmentReads(file).map((name) => ({ file, name }))
  );
  const privateOffenders = reads
    .filter(({ name }) => !name.startsWith("NEXT_PUBLIC_"))
    .map(
      ({ file, name }) =>
        `${relative(workspaceRoot, file).replaceAll("\\", "/")}:${name}`
    );
  const secretOffenders = reads
    .filter(({ name }) => /(?:SECRET|PASSWORD|TOKEN|DATABASE)/u.test(name))
    .map(
      ({ file, name }) =>
        `${relative(workspaceRoot, file).replaceAll("\\", "/")}:${name}`
    );

  assert.deepEqual(privateOffenders, []);
  assert.deepEqual(secretOffenders, []);
});

test("frontend env declarations do not preserve server-only transport variables", () => {
  const webDeclarations = readFileSync(
    join(workspaceRoot, "apps/web/environment.d.ts"),
    "utf8"
  );

  assert.doesNotMatch(webDeclarations, /^\s*API_URL\s*:/mu);
});

test("API architecture command includes the environment ownership gate", () => {
  const packageJson = JSON.parse(
    readFileSync(join(apiRoot, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert.match(
    packageJson.scripts?.["architecture:check"] ?? "",
    /environment-ownership\.architecture\.test\.ts/u
  );
});

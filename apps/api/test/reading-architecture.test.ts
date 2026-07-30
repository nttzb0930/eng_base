import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";

const root = process.cwd();
const readingRoot = join(root, "src", "module", "reading");

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("API composes Reading as a capability root", () => {
  assert.equal(existsSync(join(readingRoot, "reading.module.ts")), true);
  const appModule = readFileSync(join(root, "src", "app.module.ts"), "utf8");
  assert.match(appModule, /ReadingModule/);
});

test("Reading owns its behavior without importing learning progress capabilities", () => {
  const sourceFiles = filesUnder(readingRoot).filter(
    (path) => /\.(ts|tsx)$/u.test(path) && !path.includes(`${sep}tests${sep}`)
  );

  for (const path of sourceFiles) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:practice|courses|lessons|vocabulary-progress)[^"']*["']/u,
      `${path} imports another learning-progress capability`
    );
    assert.doesNotMatch(
      source,
      /from\s+["']@repo\/shared\//u,
      `${path} bypasses the Shared root interface`
    );
  }
});

test("learner passage detail never selects option correctness", () => {
  const source = readFileSync(
    join(readingRoot, "use-cases", "get-reading-passage.use-case.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /\bcorrect\s*:\s*true/u);
});

test("Reading attempt persistence is independent from Practice and Vocabulary progress", () => {
  const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
  const attemptModels = schema.slice(
    schema.indexOf("model reading_attempts"),
    schema.indexOf("enum challenge_direction")
  );
  assert.match(attemptModels, /model reading_attempts/u);
  assert.match(attemptModels, /model reading_attempt_answers/u);
  assert.doesNotMatch(attemptModels, /practice_sessions/u);
  assert.doesNotMatch(attemptModels, /user_vocabulary_progress/u);
});

test("API architecture command registers the Reading ownership guard", () => {
  const packageJson = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };
  assert.match(
    packageJson.scripts?.["architecture:check"] ?? "",
    /test\/reading-architecture\.test\.ts/u
  );
});

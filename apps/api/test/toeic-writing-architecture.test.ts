import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const moduleRoot = join(root, "src", "module", "toeic-writing");

test("API composes TOEIC Writing as a guarded capability root", () => {
  assert.equal(existsSync(join(moduleRoot, "toeic-writing.module.ts")), true);
  const appModule = readFileSync(join(root, "src", "app.module.ts"), "utf8");
  assert.match(appModule, /ToeicWritingModule/);
  for (const controller of [
    "toeic-writing.controller.ts",
    "toeic-writing-media.controller.ts",
  ]) {
    const source = readFileSync(join(moduleRoot, controller), "utf8");
    assert.match(source, /@UseGuards\(UserJwtGuard\)/);
    assert.doesNotMatch(source, /PrismaService/);
  }
});

test("learner task reads call only the exercise mapper", () => {
  for (const useCase of [
    "list-toeic-writing-tasks.use-case.ts",
    "get-toeic-writing-task.use-case.ts",
  ]) {
    const source = readFileSync(
      join(moduleRoot, "use-cases", useCase),
      "utf8"
    );
    assert.doesNotMatch(source, /mapToeicWritingReference/);
  }
});

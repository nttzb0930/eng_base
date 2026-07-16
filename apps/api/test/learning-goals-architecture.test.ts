import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "../src/module");

test("Progress and Placement Test expose flat goal-named use cases", () => {
  const expected = {
    progress: [
      "complete-challenge.use-case.ts",
      "reduce-hearts.use-case.ts",
      "refill-hearts.use-case.ts",
      "reset-lesson-progress.use-case.ts",
      "select-active-course.use-case.ts",
    ],
    "placement-test": [
      "confirm-placement-level.use-case.ts",
      "get-next-placement-question.use-case.ts",
      "reset-placement-test.use-case.ts",
      "submit-placement-answer.use-case.ts",
      "update-onboarding-state.use-case.ts",
    ],
    practice: [
      "create-practice-session-result.use-case.ts",
      "get-admin-practice-session.use-case.ts",
      "get-dictation-practice-challenges.use-case.ts",
      "get-dictation-practice-summary.use-case.ts",
      "get-fill-blank-practice-challenges.use-case.ts",
      "get-fill-blank-practice-summary.use-case.ts",
      "get-listening-practice-challenges.use-case.ts",
      "get-listening-practice-summary.use-case.ts",
      "get-weak-words-practice-challenges.use-case.ts",
      "get-weak-words-practice-summary.use-case.ts",
      "list-admin-practice-sessions.use-case.ts",
      "remove-admin-practice-session.use-case.ts",
    ],
    review: [
      "get-daily-review-challenges.use-case.ts",
      "get-daily-review-summary.use-case.ts",
      "get-saved-word-review-challenges.use-case.ts",
      "get-saved-word-review-summary.use-case.ts",
    ],
  };

  for (const [moduleName, files] of Object.entries(expected)) {
    const root = join(sourceRoot, moduleName);
    assert.equal(existsSync(join(root, moduleName + ".service.ts")), false);
    const actual = readdirSync(join(root, "use-cases")).filter((file) =>
      file.endsWith(".use-case.ts")
    );
    assert.deepEqual(actual.sort(), files.sort());
    assert.ok(existsSync(join(root, "index.ts")));
  }
});

test("Progress writes are atomic and challenge identity is schema-enforced", () => {
  const progress = readFileSync(
    join(sourceRoot, "progress/use-cases/complete-challenge.use-case.ts"),
    "utf8"
  );
  const placement = readFileSync(
    join(
      sourceRoot,
      "placement-test/use-cases/confirm-placement-level.use-case.ts"
    ),
    "utf8"
  );
  const schema = readFileSync(
    join(import.meta.dirname, "../prisma/schema.prisma"),
    "utf8"
  );

  assert.match(progress, /\$transaction/);
  assert.match(progress, /TransactionIsolationLevel\.Serializable/);
  assert.match(progress, /increment: 10/);
  assert.match(placement, /\$transaction/);
  assert.match(schema, /@@unique\(\[user_id, challenge_id\]/);
});

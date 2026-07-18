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

test("Learner Courses, Flashcards and Dashboard expose goal Interfaces", () => {
  const expected = {
    courses: [
      "list-courses.use-case.ts",
      "get-course.use-case.ts",
      "get-course-units.use-case.ts",
      "get-current-lesson.use-case.ts",
      "get-course-progress.use-case.ts",
      "get-user-progress.use-case.ts",
      "get-lesson-percentage.use-case.ts",
      "get-leaderboard.use-case.ts",
    ],
    flashcards: [
      "get-flashcard-deck-summary.use-case.ts",
      "get-flashcard-session-items.use-case.ts",
    ],
    dashboard: ["get-dashboard-stats.use-case.ts"],
  };

  for (const [moduleName, files] of Object.entries(expected)) {
    const root = join(sourceRoot, moduleName);
    assert.equal(existsSync(join(root, `${moduleName}.service.ts`)), false);
    for (const file of files) {
      assert.ok(existsSync(join(root, "use-cases", file)), file);
    }
    assert.ok(existsSync(join(root, "index.ts")));
  }
});

test("User and Settings expose flat goal Interfaces without aggregate services", () => {
  const expected = {
    user: [
      "list-admin-users.use-case.ts",
      "get-admin-user.use-case.ts",
      "create-admin-user.use-case.ts",
      "update-admin-user.use-case.ts",
      "remove-admin-user.use-case.ts",
    ],
    settings: ["get-setting.use-case.ts", "update-setting.use-case.ts"],
  };
  for (const [moduleName, files] of Object.entries(expected)) {
    const root = join(sourceRoot, moduleName);
    assert.equal(existsSync(join(root, `${moduleName}.service.ts`)), false);
    for (const file of files) {
      assert.ok(existsSync(join(root, "use-cases", file)), file);
    }
    assert.ok(existsSync(join(root, "index.ts")));
  }
});

test("Vocabulary exposes goal use cases without an aggregate service", () => {
  const root = join(sourceRoot, "vocabulary");
  assert.equal(existsSync(join(root, "vocabulary.service.ts")), false);
  for (const file of [
    "get-saved-vocabulary-words.use-case.ts",
    "toggle-saved-word.use-case.ts",
    "record-vocabulary-review-result.use-case.ts",
    "record-flashcard-rating.use-case.ts",
  ]) {
    assert.ok(existsSync(join(root, "use-cases", file)), file);
  }
});

test("Topics expose flat goal Interfaces without an aggregate service", () => {
  const root = join(sourceRoot, "topics");
  assert.equal(existsSync(join(root, "topics.service.ts")), false);
  assert.ok(
    existsSync(join(root, "use-cases/list-vocabulary-topics.use-case.ts"))
  );
  assert.ok(
    existsSync(join(root, "use-cases/get-vocabulary-topic.use-case.ts"))
  );
  assert.ok(existsSync(join(root, "index.ts")));
});

test("Topics list delivery batches relations instead of querying per topic", () => {
  const source = readFileSync(
    join(sourceRoot, "topics/use-cases/list-vocabulary-topics.use-case.ts"),
    "utf8"
  );
  const sharedSource = readFileSync(
    join(sourceRoot, "topics/use-cases/topic-source.ts"),
    "utf8"
  );
  assert.match(sharedSource, /getRawTopicVocabularyRelations/);
  assert.match(source, /getRawTopicVocabularyRelations/);
  assert.doesNotMatch(source, /topics\.map\(async/);
});

test("Admin list delivery is shared and does not expose a prismaQuery Interface", () => {
  const apiRoot = join(import.meta.dirname, "../src");
  const filter = readFileSync(
    join(apiRoot, "common/decorators/filter-parse.decorator.ts"),
    "utf8"
  );
  assert.doesNotMatch(filter, /prismaQuery/);
  assert.match(filter, /search: z\.string/);
  assert.match(filter, /Math\.min\(limit, 100\)/);
  assert.ok(existsSync(join(apiRoot, "common/http/admin-list-response.ts")));
  assert.equal(
    existsSync(join(sourceRoot, "courses/admin-list-response.ts")),
    false
  );
});

test("Goal use cases own behavior instead of forwarding through hidden aggregates", () => {
  for (const moduleName of [
    "courses",
    "dashboard",
    "flashcards",
    "placement-test",
    "practice",
    "progress",
    "review",
    "settings",
    "topics",
    "user",
  ]) {
    const useCaseRoot = join(sourceRoot, moduleName, "use-cases");
    const files = readdirSync(useCaseRoot).filter((file) =>
      file.endsWith(".use-case.ts")
    );
    for (const file of files) {
      const source = readFileSync(join(useCaseRoot, file), "utf8");
      assert.doesNotMatch(
        source,
        /this\.implementation\./,
        `${moduleName}/${file}`
      );
    }
    assert.equal(
      readdirSync(useCaseRoot).some((file) =>
        file.endsWith(".implementation.ts")
      ),
      false
    );
  }
});

test("Application consumers avoid private Shared deep imports", () => {
  const repositoryRoot = join(import.meta.dirname, "../../..");
  for (const relativeRoot of [
    "apps/api/src",
    "apps/web/app",
    "apps/admin/app",
    "apps/admin/src",
  ]) {
    const root = join(repositoryRoot, relativeRoot);
    if (!existsSync(root)) continue;
    const files = readdirSync(root, { recursive: true })
      .map(String)
      .filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      assert.doesNotMatch(
        source,
        /@repo\/shared\/(?:src|dist)\//,
        `${relativeRoot}/${file}`
      );
    }
  }
});

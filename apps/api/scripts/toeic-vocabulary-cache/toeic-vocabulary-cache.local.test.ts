import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadLocalToeicVocabularyScope } from "./toeic-vocabulary-cache.local.js";

test("loads and deduplicates Parts 1-7 question ids for selected tests", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "toeic-vocabulary-cache-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const privateRoot = join(root, "var", "licensed-content", "dautoeic");
  const inventoryDirectory = join(
    privateRoot,
    "inventories",
    "toeic-reading-practice"
  );
  await mkdir(inventoryDirectory, { recursive: true });
  await writeFile(
    join(inventoryDirectory, `${"a".repeat(64)}.json`),
    JSON.stringify({
      selectedTests: [
        { sourceTestId: "test-1", title: "Test 1" },
        { sourceTestId: "test-2", title: "Test 2" },
      ],
    })
  );

  for (const [kind, questions] of [
    ["toeic-listening-practice", ["q1", "q2"]],
    ["toeic-reading-practice", ["q2", "q3"]],
  ] as const) {
    const directory = join(privateRoot, kind, "test-1", "version-1");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "content.json"),
      JSON.stringify({
        sourceTestId: "test-1",
        parts: [
          {
            part: kind === "toeic-listening-practice" ? 1 : 5,
            questions: questions.map((sourceQuestionId) => ({
              sourceQuestionId,
            })),
          },
        ],
      })
    );
  }

  const result = await loadLocalToeicVocabularyScope({
    repositoryRoot: root,
    readingInventorySha256: "a".repeat(64),
  });

  assert.deepEqual(result.sourceTestIds, ["test-1", "test-2"]);
  assert.deepEqual(result.questionIds, ["q1", "q2", "q3"]);
});

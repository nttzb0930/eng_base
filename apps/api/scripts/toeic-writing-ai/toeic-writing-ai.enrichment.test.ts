import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { WritingAiProvider } from "../../src/module/toeic-writing/provider/writing-ai-provider";
import {
  enrichPartOneCandidates,
  type PartOneEnrichmentTask,
} from "./enrich-part-one-images";
import { createToeicWritingAiStorage } from "./toeic-writing-ai.storage";

const context = {
  schemaVersion: 1 as const,
  sceneSummary: "A woman prepares food.",
  visibleEntities: ["woman", "food"],
  visibleActions: ["preparing"],
  relationships: [],
  requiredWordGrounding: [
    { word: "prepare", supported: true, evidence: "preparing" },
    { word: "food", supported: true, evidence: "food" },
  ],
};

function task(root: string, sourceTaskId: string): PartOneEnrichmentTask {
  return {
    source: "licensed-test",
    sourceTaskId,
    sourceVersion: "a".repeat(64),
    contentVersion: "b".repeat(64),
    imageSha256: "c".repeat(64),
    imagePath: join(root, `${sourceTaskId}.png`),
    mimeType: "image/png",
    requiredWords: ["prepare", "food"],
  };
}

test("enrichment is resumable and calls the provider once per missing candidate", async () => {
  const root = await mkdtemp(join(tmpdir(), "writing-ai-"));
  const storage = createToeicWritingAiStorage(root);
  const tasks = [task(root, "task-1"), task(root, "task-2")];
  await Promise.all(
    tasks.map((entry) => writeFile(entry.imagePath, Uint8Array.from([1, 2, 3])))
  );
  await storage.writeCandidate({
    schemaVersion: 1,
    source: tasks[0]!.source,
    sourceTaskId: tasks[0]!.sourceTaskId,
    sourceVersion: tasks[0]!.sourceVersion,
    contentVersion: tasks[0]!.contentVersion,
    imageSha256: tasks[0]!.imageSha256,
    model: "test-model",
    promptVersion: "image-v1",
    context,
  });
  let calls = 0;
  const provider = {
    enrichPicture: () => {
      calls += 1;
      return Promise.resolve(context);
    },
  } satisfies Pick<WritingAiProvider, "enrichPicture">;

  const summary = await enrichPartOneCandidates({
    tasks,
    storage,
    provider,
    model: "test-model",
    promptVersion: "image-v1",
    workers: 2,
    dryRun: false,
  });

  assert.equal(calls, 1);
  assert.deepEqual(summary, {
    eligible: 2,
    completed: ["task-2"],
    skipped: ["task-1"],
    rejected: [],
    failed: [],
    workers: 2,
    dryRun: false,
  });
  assert.equal(
    JSON.parse(
      await readFile(storage.candidatePath(tasks[1], "image-v1"), "utf8")
    ).sourceTaskId,
    "task-2"
  );
});

test("dry-run never calls Gemini and invalid contexts are rejected", async () => {
  const root = await mkdtemp(join(tmpdir(), "writing-ai-"));
  const storage = createToeicWritingAiStorage(root);
  const entry = task(root, "task-1");
  await writeFile(entry.imagePath, Uint8Array.from([1]));
  let calls = 0;
  const provider = {
    enrichPicture: () => {
      calls += 1;
      return Promise.resolve({ schemaVersion: 2 });
    },
  } as unknown as Pick<WritingAiProvider, "enrichPicture">;

  const dryRun = await enrichPartOneCandidates({
    tasks: [entry],
    storage,
    provider,
    model: "test-model",
    promptVersion: "image-v1",
    workers: 1,
    dryRun: true,
  });
  assert.equal(calls, 0);
  assert.equal(dryRun.eligible, 1);

  const invalid = await enrichPartOneCandidates({
    tasks: [entry],
    storage,
    provider,
    model: "test-model",
    promptVersion: "image-v1",
    workers: 1,
    dryRun: false,
  });
  assert.equal(invalid.rejected.length, 1);
});

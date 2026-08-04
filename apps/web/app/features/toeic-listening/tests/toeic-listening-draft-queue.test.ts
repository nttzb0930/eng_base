import assert from "node:assert/strict";
import test from "node:test";

import { createToeicListeningDraftQueue } from "../toeic-listening-draft-queue";

test("Listening draft queue serializes writes and collapses pending snapshots", async () => {
  const saved: number[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstWrite = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const queue = createToeicListeningDraftQueue<number>(async (snapshot) => {
    saved.push(snapshot);
    if (snapshot === 1) await firstWrite;
  });
  queue.push(1);
  queue.push(2);
  queue.push(3);
  releaseFirst?.();
  await queue.flush();
  assert.deepEqual(saved, [1, 3]);
});

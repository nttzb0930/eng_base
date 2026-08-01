import assert from "node:assert/strict";
import test from "node:test";

import { createToeicReadingDraftQueue } from "../toeic-reading-draft-queue";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test("draft queue serializes writes and collapses pending state to the newest snapshot", async () => {
  const first = deferred();
  const writes: number[] = [];
  const queue = createToeicReadingDraftQueue<number>(async (snapshot) => {
    writes.push(snapshot);
    if (snapshot === 1) await first.promise;
  });

  queue.push(1);
  queue.push(2);
  queue.push(3);
  assert.deepEqual(writes, [1]);

  first.resolve();
  await queue.flush();
  assert.deepEqual(writes, [1, 3]);
});

test("a failed write does not block the newest pending snapshot", async () => {
  const writes: number[] = [];
  const queue = createToeicReadingDraftQueue<number>(async (snapshot) => {
    writes.push(snapshot);
    if (snapshot === 1) throw new Error("network");
  });

  queue.push(1);
  queue.push(2);
  await queue.flush();
  assert.deepEqual(writes, [1, 2]);
});

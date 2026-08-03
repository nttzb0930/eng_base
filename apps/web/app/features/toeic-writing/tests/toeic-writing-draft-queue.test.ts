import assert from "node:assert/strict";
import test from "node:test";

import { createToeicWritingAutosaveScheduler } from "../toeic-writing-autosave-scheduler";
import { createToeicWritingDraftQueue } from "../toeic-writing-draft-queue";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("rapid snapshots collapse to the newest pending save", async () => {
  const gate = deferred<void>();
  const saved: string[] = [];
  const queue = createToeicWritingDraftQueue(async (snapshot: string) => {
    saved.push(snapshot);
    if (saved.length === 1) await gate.promise;
  });

  queue.push("first");
  queue.push("second");
  queue.push("latest");
  gate.resolve();
  await queue.flush();

  assert.deepEqual(saved, ["first", "latest"]);
});

test("flush rejects after a save failure without losing the latest snapshot", async () => {
  const saved: string[] = [];
  let shouldFail = true;
  const queue = createToeicWritingDraftQueue(async (snapshot: string) => {
    saved.push(snapshot);
    if (shouldFail) throw new Error("offline");
  });

  queue.push("learner response");
  await assert.rejects(() => queue.flush(), /offline/u);
  shouldFail = false;
  await queue.flush();

  assert.deepEqual(saved, ["learner response", "learner response"]);
});

test("immediate navigation cancels debounce and flushes the latest snapshot once", async () => {
  const saved: string[] = [];
  const callbacks: Array<() => void> = [];
  const queue = createToeicWritingDraftQueue(async (snapshot: string) => {
    saved.push(snapshot);
  });
  const scheduler = createToeicWritingAutosaveScheduler(queue, {
    schedule: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancel: () => undefined,
  });

  scheduler.schedule("latest");
  await scheduler.flush("latest");
  callbacks[0]?.();
  await queue.flush();

  assert.deepEqual(saved, ["latest"]);
});

test("submission lock prevents a pending debounce from recreating a draft", async () => {
  const saved: string[] = [];
  const callbacks: Array<() => void> = [];
  const queue = createToeicWritingDraftQueue(async (snapshot: string) => {
    saved.push(snapshot);
  });
  const scheduler = createToeicWritingAutosaveScheduler(queue, {
    schedule: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancel: () => undefined,
  });

  scheduler.schedule("submitted response");
  await scheduler.flush("submitted response", { lock: true });
  callbacks[0]?.();
  scheduler.schedule("must be ignored");
  await queue.flush();

  assert.deepEqual(saved, ["submitted response"]);
});

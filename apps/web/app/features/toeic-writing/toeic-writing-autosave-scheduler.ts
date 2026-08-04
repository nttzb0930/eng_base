import type { ToeicWritingDraftQueue } from "./toeic-writing-draft-queue";

type TimerHandle = unknown;

type ToeicWritingAutosaveTimer = {
  schedule(callback: () => void, delayMs: number): TimerHandle;
  cancel(handle: TimerHandle): void;
};

const browserTimer: ToeicWritingAutosaveTimer = {
  schedule: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  cancel: (handle) =>
    globalThis.clearTimeout(
      handle as ReturnType<typeof globalThis.setTimeout>
    ),
};

export type ToeicWritingAutosaveScheduler<T> = {
  schedule(snapshot: T): void;
  flush(snapshot: T, options?: { lock?: boolean }): Promise<void>;
  unlock(): void;
  dispose(): void;
};

export function createToeicWritingAutosaveScheduler<T>(
  queue: ToeicWritingDraftQueue<T>,
  timer: ToeicWritingAutosaveTimer = browserTimer,
  delayMs = 600
): ToeicWritingAutosaveScheduler<T> {
  let timerHandle: TimerHandle | null = null;
  let generation = 0;
  let locked = false;

  const cancelPending = () => {
    generation += 1;
    if (timerHandle !== null) timer.cancel(timerHandle);
    timerHandle = null;
  };

  return {
    schedule(snapshot) {
      if (locked) return;
      cancelPending();
      const scheduledGeneration = generation;
      timerHandle = timer.schedule(() => {
        if (locked || scheduledGeneration !== generation) return;
        timerHandle = null;
        queue.push(snapshot);
      }, delayMs);
    },
    async flush(snapshot, options) {
      cancelPending();
      if (options?.lock) locked = true;
      queue.push(snapshot);
      await queue.flush();
    },
    unlock() {
      locked = false;
    },
    dispose() {
      locked = true;
      cancelPending();
    },
  };
}

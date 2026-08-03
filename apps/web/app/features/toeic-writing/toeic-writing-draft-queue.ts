export type ToeicWritingDraftQueue<T> = {
  push(snapshot: T): void;
  flush(): Promise<void>;
};

export function createToeicWritingDraftQueue<T>(
  save: (snapshot: T) => Promise<void>
): ToeicWritingDraftQueue<T> {
  let pending: T | undefined;
  let running: Promise<void> | null = null;
  let failure: unknown;

  const processPending = async () => {
    while (pending !== undefined) {
      const snapshot = pending;
      pending = undefined;
      try {
        await save(snapshot);
      } catch (error) {
        pending ??= snapshot;
        throw error;
      }
    }
  };

  const start = () => {
    if (running || pending === undefined) return;
    failure = undefined;
    running = processPending()
      .catch((error: unknown) => {
        failure = error;
      })
      .finally(() => {
        running = null;
      });
  };

  return {
    push(snapshot) {
      pending = snapshot;
      start();
    },
    async flush() {
      start();
      if (running) await running;
      if (failure !== undefined) {
        const error = failure;
        failure = undefined;
        throw error;
      }
      if (pending !== undefined) await this.flush();
    },
  };
}

type DraftQueueCallbacks<T> = {
  onSaving?: (snapshot: T) => void;
  onSaved?: (snapshot: T) => void;
  onError?: (error: unknown, snapshot: T) => void;
};

export function createToeicReadingDraftQueue<T>(
  persist: (snapshot: T) => Promise<unknown>,
  callbacks: DraftQueueCallbacks<T> = {}
) {
  let pending: T | undefined;
  let running: Promise<void> | null = null;

  async function drain() {
    while (pending !== undefined) {
      const snapshot = pending;
      pending = undefined;
      callbacks.onSaving?.(snapshot);
      try {
        await persist(snapshot);
        callbacks.onSaved?.(snapshot);
      } catch (error) {
        callbacks.onError?.(error, snapshot);
      }
    }
  }

  function start() {
    if (running) return;
    running = drain().finally(() => {
      running = null;
      if (pending !== undefined) start();
    });
  }

  return {
    push(snapshot: T) {
      pending = snapshot;
      start();
    },
    async flush() {
      while (running || pending !== undefined) {
        start();
        await running;
      }
    },
  };
}

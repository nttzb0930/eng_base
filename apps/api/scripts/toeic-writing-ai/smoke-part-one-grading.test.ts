import assert from "node:assert/strict";
import test from "node:test";

import { runPartOneGradingSmoke } from "./smoke-part-one-grading";

const task = {
  id: 12,
  contentVersion: "a".repeat(64),
  requiredWords: ["woman", "food"],
  imageSha256: "b".repeat(64),
  imageStoragePath: "task/image.png",
  imageMimeType: "image/png" as const,
};

test("smoke runner requires an explicit task id", async () => {
  await assert.rejects(
    () =>
      runPartOneGradingSmoke([], {
        providerEnabled: false,
        loadTask: () => Promise.resolve(task),
        resolvePicture: () => Promise.reject(new Error("unused")),
        grade: () => Promise.reject(new Error("unused")),
        log: () => undefined,
      }),
    /task-id/u
  );
});

test("dry run checks owned task and context without calling the provider or logging secrets", async () => {
  const logs: unknown[] = [];
  let providerCalls = 0;
  const result = await runPartOneGradingSmoke(["--task-id=12"], {
    providerEnabled: false,
    loadTask: () => Promise.resolve(task),
    resolvePicture: () =>
      Promise.resolve({
        source: "ENRICHED" as const,
        context: {
          schemaVersion: 1 as const,
          sceneSummary: "private context",
          visibleEntities: [],
          visibleActions: [],
          relationships: [],
          requiredWordGrounding: [],
        },
      }),
    grade: () => {
      providerCalls += 1;
      return Promise.reject(new Error("must not call"));
    },
    log: (value) => logs.push(value),
  });

  assert.equal(result.providerCalled, false);
  assert.equal(providerCalls, 0);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /private context|api.?key|responseText/iu
  );
});

test("provider smoke rejects an invalid structured result", async () => {
  await assert.rejects(
    () =>
      runPartOneGradingSmoke(["--task-id=12", "--call-provider"], {
        providerEnabled: true,
        loadTask: () => Promise.resolve(task),
        resolvePicture: () =>
          Promise.resolve({
            source: "DIRECT_IMAGE" as const,
            imageBytes: Uint8Array.from([1]),
            mimeType: "image/png" as const,
          }),
        grade: () => Promise.resolve({ score: 99 } as never),
        log: () => undefined,
      }),
    /invalid structured result/u
  );
});

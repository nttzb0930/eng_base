import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyListeningMediaError,
  formatListeningProgress,
  mapListeningMediaWithConcurrency,
  sanitizeListeningDownloadError,
} from "./toeic-listening-practice.download";

test("download errors never include credentials or provider URLs", () => {
  const message = sanitizeListeningDownloadError(
    new Error(
      "Bearer private-token failed at https://provider.example/signed?a=secret"
    )
  );
  assert.equal(message, "Listening media download failed");
});

test("media work never exceeds configured concurrency", async () => {
  let active = 0;
  let maximum = 0;
  const results = await mapListeningMediaWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    }
  );

  assert.equal(maximum, 2);
  assert.deepEqual(
    results.map((result) => result.status),
    ["fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled"]
  );
});

test("bounded media work continues after one item fails", async () => {
  const visited: number[] = [];
  const results = await mapListeningMediaWithConcurrency(
    [1, 2, 3],
    2,
    async (value) => {
      visited.push(value);
      if (value === 2) throw new Error("signed-url-secret");
      return value;
    }
  );

  assert.deepEqual(visited.sort(), [1, 2, 3]);
  assert.deepEqual(
    results.map((result) => result.status),
    ["fulfilled", "rejected", "fulfilled"]
  );
});

test("progress text contains useful counters without provider data", () => {
  const value = formatListeningProgress({
    sourceTestId: "test-1",
    role: "AUDIO",
    completed: 7,
    total: 54,
    bytes: 1234,
    status: "DOWNLOADED",
  });
  assert.equal(value, "[test-1] AUDIO 7/54 DOWNLOADED 1234 bytes");
  assert.doesNotMatch(value, /https|Bearer|token|secret/iu);
});

test("media errors become safe actionable codes", () => {
  assert.equal(
    classifyListeningMediaError(
      new Error("TOEIC Listening media request failed (404)")
    ),
    "HTTP_404"
  );
  assert.equal(
    classifyListeningMediaError(new Error("Bearer secret https://bad.example")),
    "MEDIA_FAILED"
  );
});
